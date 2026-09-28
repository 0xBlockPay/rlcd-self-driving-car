import React from 'react';
import { BookOpen, CheckCircle, Zap, ShieldAlert, Cpu, ArrowRight, ExternalLink } from 'lucide-react';

interface PaperDeepDiveProps {
  lang?: 'en' | 'pl';
}

export const PaperDeepDive: React.FC<PaperDeepDiveProps> = ({ lang = 'en' }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs px-2.5 py-0.5 rounded font-mono font-semibold">
              arXiv:2609.29429
            </span>
            <span className="text-xs text-slate-400">Research Paper Scientific Analysis</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1">
            "Just Ask Jev: Reinforcement Learning for Calibrated Decisions as a Zero-Shot Detector of AI Alignment Failures"
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            A breakthrough in <em>System One</em> decision architectures (arXiv:2609.29429) and its transformative 
            implications for safety-critical Autonomous Vehicles (SAE Level 3/4 ADAS). Implemented standalone in Python.
          </p>
        </div>

        <a 
          href="https://arxiv.org/pdf/2609.29429" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono transition border border-slate-700"
        >
          <span>arxiv.org/pdf/2609.29429</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 3 Pillars of RLCD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Cpu className="w-4 h-4" />
            1. System One Model (Kahneman)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike generative Large Language Models (System Two — slow, sequential token-by-token generation taking 1500–4000ms), 
            <strong> System One operates in a single parallel feedforward pass</strong>. Rather than text, it directly emits 
            strongly-typed schema data in sub-2ms local latency.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <CheckCircle className="w-4 h-4" />
            2. RLCD Training (Proper Scoring Rules)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            RLCD (<em>Reinforcement Learning for Calibrated Decisions</em>) optimizes proper scoring rules like the 
            <strong> Brier Score</strong>: <span className="font-mono text-cyan-300 text-[11px]">L = (1/N) * sum((p_i - y_i)^2)</span>. 
            The model is strictly penalized for overconfidence. When it asserts 80% certainty, it is empirically correct ~80% of the time.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4" />
            3. Three Typed Question Primitives
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            System One evaluates strongly-typed questions:
            <br />• <strong>Noul</strong>: Binary decision with calibrated probability P(True).
            <br />• <strong>Choice</strong>: Categorical probability distribution over maneuvers.
            <br />• <strong>Score</strong>: Continuous value [0.0 - 1.0] with risk calibration.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 text-xs font-semibold text-slate-200">
          Paradigm Comparison in Autonomous Vehicle Decision-Making
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="p-3">Feature / Paradigm</th>
                <th className="p-3 text-red-400">Generative LLM (RLHF)</th>
                <th className="p-3 text-cyan-400">Classical Rules (MPC / Heuristics)</th>
                <th className="p-3 text-emerald-400 font-bold bg-emerald-950/20">System One (RLCD Standalone)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
              <tr>
                <td className="p-3 font-sans font-medium text-slate-200">Decision Latency</td>
                <td className="p-3 text-red-400">1500 - 4000 ms (Unacceptable at 100 km/h)</td>
                <td className="p-3 text-cyan-300">10 - 50 ms (Fast but rigid)</td>
                <td className="p-3 text-emerald-400 font-bold bg-emerald-950/20">~1.5 ms (Local feedforward pass)</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-200">Output Format</td>
                <td className="p-3 text-red-400">Free text (frequent JSON parse errors)</td>
                <td className="p-3 text-cyan-300">Hardcoded control variables</td>
                <td className="p-3 text-emerald-400 font-bold bg-emerald-950/20">Strongly-typed (Noul, Choice, Score)</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-200">Confidence Calibration</td>
                <td className="p-3 text-red-400">Severe overconfidence (hallucinated certainty)</td>
                <td className="p-3 text-slate-400">No semantic uncertainty estimates</td>
                <td className="p-3 text-emerald-400 font-bold bg-emerald-950/20">Strict Brier Score calibration (ECE &lt; 0.02)</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-200">External Dependencies</td>
                <td className="p-3 text-red-400">Cloud API keys & network connection</td>
                <td className="p-3 text-cyan-300">Local C++/Python</td>
                <td className="p-3 text-emerald-400 font-bold bg-emerald-950/20">100% Standalone (NumPy/PyTorch)</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-200">Safety Governor Support</td>
                <td className="p-3 text-red-400">Impossible (unpredictable token outputs)</td>
                <td className="p-3 text-cyan-300">Physical bounds only</td>
                <td className="p-3 text-emerald-400 font-bold bg-emerald-950/20">Automated Minimum Risk Maneuver (MRM)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Why it matters for Self-Driving Car Example */}
      <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 text-xs space-y-2">
        <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          Application to your Self-Driving Car Pipeline:
        </h4>
        <p className="text-slate-300 leading-relaxed">
          In autonomous driving, it is vital not just to select an action <em>(e.g. "Initiate Emergency Braking" or "Overtake")</em>, 
          but to possess a <strong>mathematically faithful probability score</strong>.
          When a vehicle enters heavy fog, driving rain, or experiences radar degradation, classical uncalibrated models often undertake hazardous high-speed overtakes.
          With System One, the model immediately reports a drop in calibrated confidence (e.g. from 94% down to 41%), 
          which activates the <strong>Safety Governor</strong> to bring the vehicle to an orderly stop on the shoulder (Minimum Risk Maneuver).
        </p>
      </div>
    </div>
  );
};
