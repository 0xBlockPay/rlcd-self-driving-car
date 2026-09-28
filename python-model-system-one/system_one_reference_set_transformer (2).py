"""
system_one_reference_set_transformer.py
========================================================================================
Reference Implementation of the Set Transformer Architecture and RLCD Training Loop
based on: 'Just Ask Jev: Reinforcement Learning for Calibrated Decisions' (arXiv:2609.29429)

Includes:
- SAB (Set Attention Block)
- ISAB (Induced Set Attention Block for O(m*n) scaling)
- PMA (Pooling by Multihead Attention)
- RLCD Calibration Loss: Brier Score (Mean Squared Error on Probability) + Plackett-Luce Ranking
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader


# ---------------------------------------------------------
# 1. SET TRANSFORMER ATTENTION PRIMITIVES
# ---------------------------------------------------------
class MultiheadAttentionBlock(nn.Module):
    def __init__(self, dim: int, num_heads: int):
        super().__init__()
        self.mha = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(dim, dim * 2),
            nn.GELU(),
            nn.Linear(dim * 2, dim)
        )
        self.ln1 = nn.LayerNorm(dim)
        self.ln2 = nn.LayerNorm(dim)

    def forward(self, x, y):
        out, _ = self.mha(x, y, y)
        h = self.ln1(x + out)
        h2 = self.ln2(h + self.fc(h))
        return h2


class SetAttentionBlock(nn.Module):
    """SAB(X) = MAB(X, X)"""
    def __init__(self, dim: int, num_heads: int):
        super().__init__()
        self.mab = MultiheadAttentionBlock(dim, num_heads)

    def forward(self, x):
        return self.mab(x, x)


class InducedSetAttentionBlock(nn.Module):
    """ISAB_m(X) reduces quadratic complexity O(n^2) to O(m*n) via m inducing points."""
    def __init__(self, dim: int, num_heads: int, num_inducing: int = 16):
        super().__init__()
        self.inducing_points = nn.Parameter(torch.randn(1, num_inducing, dim))
        self.mab1 = MultiheadAttentionBlock(dim, num_heads)
        self.mab2 = MultiheadAttentionBlock(dim, num_heads)

    def forward(self, x):
        batch_size = x.size(0)
        i_expanded = self.inducing_points.expand(batch_size, -1, -1)
        h = self.mab1(i_expanded, x)
        return self.mab2(x, h)


class PoolingByMultiheadAttention(nn.Module):
    """PMA_k(X) pools arbitrary number of set elements into k output query representations."""
    def __init__(self, dim: int, num_heads: int, num_seeds: int = 1):
        super().__init__()
        self.seed = nn.Parameter(torch.randn(1, num_seeds, dim))
        self.mab = MultiheadAttentionBlock(dim, num_heads)

    def forward(self, x):
        batch_size = x.size(0)
        s_expanded = self.seed.expand(batch_size, -1, -1)
        return self.mab(s_expanded, x)


# ---------------------------------------------------------
# 2. RLCD LOSS FUNCTION (BRIER SCORE + PLACKETT-LUCE)
# ---------------------------------------------------------
class RLCDCalibratedLoss(nn.Module):
    """
    RLCD Loss (arXiv:2609.29429):
    Combines Brier Proper Scoring Rule for calibrated probability P(True)
    with Plackett-Luce ranking loss for candidate ordering.
    """
    def __init__(self, calibration_weight: float = 0.40, ranking_weight: float = 0.60):
        super().__init__()
        self.cal_weight = calibration_weight
        self.rank_weight = ranking_weight

    def forward(self, pred_probs: torch.Tensor, ground_truth: torch.Tensor, ranking_logits: torch.Tensor, true_ranks: torch.Tensor):
        # 1. Brier Score: (p_i - y_i)^2
        brier_loss = F.mse_loss(pred_probs, ground_truth)
        
        # 2. Cross-entropy on ranking distribution
        ranking_loss = F.cross_entropy(ranking_logits, true_ranks)
        
        total_loss = self.cal_weight * brier_loss + self.rank_weight * ranking_loss
        return total_loss, brier_loss, ranking_loss


if __name__ == "__main__":
    print("=" * 70)
    print("SYSTEM ONE: Set Transformer & RLCD Calibrated Loss Verification")
    print("=" * 70)

    dim = 64
    heads = 4
    batch_size = 8
    num_obstacles = 12

    # Dummy batch of 12 detected obstacles with 64-dim feature embeddings
    x = torch.randn(batch_size, num_obstacles, dim)

    isab = InducedSetAttentionBlock(dim=dim, num_heads=heads, num_inducing=4)
    pma = PoolingByMultiheadAttention(dim=dim, num_heads=heads, num_seeds=1)

    features = isab(x)
    pooled = pma(features).squeeze(1)

    print(f"Input Set Shape:   {list(x.shape)}")
    print(f"ISAB Output Shape: {list(features.shape)}")
    print(f"Pooled Latent:     {list(pooled.shape)}")
    print("Set Transformer computation executed successfully.")
