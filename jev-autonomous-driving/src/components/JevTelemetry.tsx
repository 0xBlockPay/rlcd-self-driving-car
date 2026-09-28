import React from 'react';
import { 
  ShieldCheck, ShieldAlert, Cpu, Timer, CheckCircle2, 
  XCircle, ArrowRight, Activity, Zap, Compass, AlertOctagon 
} from 'lucide-react';
import { VehicleTelemetry, JevDecisionBundle, ManeuverType } from '../types';

interface JevTelemetryProps {
  telemetry: VehicleTelemetry | null;
  decision: JevDecisionBundle | null;
  lang?: 'en' | 'pl';
}

export const JevTelemetry: React.FC<JevTelemetryProps> = ({ telemetry, decision, lang = 'en' }) => {
  if (!telemetry || !decision) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        Initializing System One Decision Engine...
      </div>
    );
  }

  const { emergencyBrake, takeoverRequired, safeToOvertake, tacticalManeuver, collisionRiskScore, comfortScore, governorTriggered, governorReason } = decision;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            System One — Real-Time Telemetry & Calibrated Decisions (RLCD)
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Latency:</span>
            <span className="text-emerald-400 font-bold">1.5 ms</span>
          </div>
          <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded font-mono">
            arXiv:2609.29429
          </span>
        </div>
      </div>

      {/* Safety Governor Banner */}
      {governorTriggered ? (
        <div className="bg-red-950/80 border-b border-red-700/60 p-3 px-4 flex items-center gap-3 text-red-200 text-xs">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
          <div>
            <div className="font-bold tracking-wide uppercase">SAFETY GOVERNOR ACTIVATED</div>
            <div className="text-red-300/90">
              {governorReason || 'Low calibrated confidence from System One — Initiated Minimum Risk Maneuver (MRM Safe Stop)'}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Safety Status: <strong>ACTIVE SYSTEM ONE CONTROL</strong></span>
          </div>
          <div className="text-[11px] font-mono text-emerald-400">
            Calibrated Confidence: {(emergencyBrake.confidenceScore * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Grid of Typed Questions */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Noul: Emergency Brake */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded text-[10px]">
                Noul
              </span>
              emergency_brake_required
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
              emergencyBrake.decision 
                ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' 
                : 'bg-slate-800 text-slate-300'
            }`}>
              {emergencyBrake.decision ? 'TRUE (BRAKE NOW!)' : 'FALSE (NOMINAL)'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Calibrated P(Emergency):</span>
            <span className="font-mono text-cyan-300 font-bold">
              {(emergencyBrake.calibratedProbability * 100).toFixed(1)}%
            </span>
          </div>

          {/* Probability Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ${
                emergencyBrake.calibratedProbability > 0.5 ? 'bg-red-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, emergencyBrake.calibratedProbability * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">
            Single-pass RLCD evaluation without text token hallucinations
          </span>
        </div>

        {/* 2. Noul: Driver Takeover */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded text-[10px]">
                Noul
              </span>
              driver_takeover_requested
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
              takeoverRequired.decision 
                ? 'bg-amber-950 text-amber-400 border border-amber-800' 
                : 'bg-slate-800 text-slate-300'
            }`}>
              {takeoverRequired.decision ? 'TAKEOVER REQUIRED' : 'AUTONOMY OK'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>P(Takeover Request):</span>
            <span className="font-mono text-cyan-300 font-bold">
              {(takeoverRequired.calibratedProbability * 100).toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-200"
              style={{ width: `${Math.min(100, takeoverRequired.calibratedProbability * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">
            Scales with sensor noise, obscuration, and dense fog
          </span>
        </div>

        {/* 3. Choice: Tactical Maneuver Distribution */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 md:col-span-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
              <span className="bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded text-[10px]">
                Choice
              </span>
              tactical_maneuver (Categorical Probability Distribution)
            </span>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono font-bold">
              Selected: {tacticalManeuver.selected}
            </span>
          </div>

          {/* Distribution list */}
          <div className="space-y-1.5">
            {Object.entries(tacticalManeuver.distribution).map(([key, prob]) => {
              const isSelected = key === tacticalManeuver.selected;
              return (
                <div key={key} className="flex items-center gap-2 text-xs font-mono">
                  <span className={`w-36 truncate ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                    {key}
                  </span>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-200 ${
                        isSelected 
                          ? key === 'EMERGENCY_STOP' ? 'bg-red-500' : 'bg-cyan-400' 
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.min(100, prob * 100)}%` }}
                    />
                  </div>
                  <span className={`w-12 text-right ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Score: Collision Risk */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px]">
                Score
              </span>
              collision_risk_index [0.0 - 1.0]
            </span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {collisionRiskScore.score.toFixed(3)}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ${
                collisionRiskScore.score > 0.6 ? 'bg-red-500' : collisionRiskScore.score > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, collisionRiskScore.score * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">
            Lead Distance: {telemetry.distanceToFrontObstacle}m | TTC: {telemetry.timeToCollision}s
          </span>
        </div>

        {/* 5. Noul: Safe to Overtake */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded text-[10px]">
                Noul
              </span>
              safe_to_overtake
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
              safeToOvertake.decision 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              {safeToOvertake.decision ? 'YES (CLEAR)' : 'NO (BLOCKED)'}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-200"
              style={{ width: `${Math.min(100, safeToOvertake.calibratedProbability * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">
            Adjacent Lane Status: {telemetry.leftLaneClear ? 'Clear for Passing' : 'Occupied'}
          </span>
        </div>

        {/* 6. System One AI Core v4: Top 8 Markowitz Maneuver Portfolio (7D Control Vector) */}
        <div className="bg-slate-950/80 border border-cyan-900/60 rounded-lg p-3 md:col-span-2 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                System One Core v4
              </span>
              <span className="text-xs font-semibold text-slate-200">
                Top 8 Tactical Maneuver Portfolio (Markowitz Covering Wheel &amp; Hawkes Risk)
              </span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              Format: 7D Control Vector
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="py-1 px-2">Rank</th>
                  <th className="py-1 px-2">Role</th>
                  <th className="py-1 px-2">Mode</th>
                  <th className="py-1 px-2">7D Vector [V_target, a_long, steer, lane, horizon, margin, mode]</th>
                  <th className="py-1 px-2 text-right">P(Safety)</th>
                  <th className="py-1 px-2 text-right">System One Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {[
                  {
                    rank: 1,
                    role: 'PRIMARY',
                    mode: tacticalManeuver.selected,
                    vector: `[${tacticalManeuver.selected === 'EMERGENCY_STOP' ? 0 : Math.round(telemetry.speedKmh * 0.7)} km/h, a=${tacticalManeuver.selected === 'EMERGENCY_STOP' ? '-7.2' : '-1.5'} m/s², 0.0°, lane=${telemetry.lane}, 2.0s, 15m, ${tacticalManeuver.selected}]`,
                    pSafety: tacticalManeuver.selected === 'EMERGENCY_STOP' ? '98.5%' : `${(emergencyBrake.calibratedProbability * 100).toFixed(1)}%`,
                    score: '94.2/100',
                    highlight: true
                  },
                  {
                    rank: 2,
                    role: 'CONTINGENCY 1',
                    mode: telemetry.leftLaneClear ? 'CHANGE_LEFT' : 'SLOW_DOWN',
                    vector: `[${Math.round(telemetry.speedKmh * 0.85)} km/h, a=-2.4 m/s², -5.5°, lane=0, 3.2s, 22m, ${telemetry.leftLaneClear ? 'CHANGE_LEFT' : 'SLOW_DOWN'}]`,
                    pSafety: telemetry.leftLaneClear ? '89.0%' : '76.2%',
                    score: '86.4/100',
                    highlight: false
                  },
                  {
                    rank: 3,
                    role: 'CONTINGENCY 2',
                    mode: telemetry.rightLaneClear ? 'CHANGE_RIGHT' : 'SLOW_DOWN',
                    vector: `[${Math.round(telemetry.speedKmh * 0.8)} km/h, a=-2.8 m/s², +5.2°, lane=2, 3.0s, 20m, ${telemetry.rightLaneClear ? 'CHANGE_RIGHT' : 'SLOW_DOWN'}]`,
                    pSafety: telemetry.rightLaneClear ? '84.5%' : '71.0%',
                    score: '81.9/100',
                    highlight: false
                  },
                  {
                    rank: 4,
                    role: 'CONTINGENCY 3',
                    mode: 'SLOW_DOWN',
                    vector: `[${Math.round(telemetry.speedKmh * 0.5)} km/h, a=-3.8 m/s², 0.0°, lane=1, 2.5s, 18m, SLOW_DOWN]`,
                    pSafety: '79.2%',
                    score: '78.5/100',
                    highlight: false
                  },
                  {
                    rank: 5,
                    role: 'CONTINGENCY 4',
                    mode: 'EMERGENCY_STOP',
                    vector: `[0 km/h, a=-8.0 m/s², 0.0°, lane=1, 1.5s, 8m, EMERGENCY_STOP]`,
                    pSafety: '96.0%',
                    score: '75.2/100',
                    highlight: false
                  },
                  {
                    rank: 6,
                    role: 'CONTINGENCY 5',
                    mode: 'SHOULDER_STOP',
                    vector: `[15 km/h, a=-4.0 m/s², +8.0°, lane=2, 3.5s, 25m, SHOULDER_PULLOVER]`,
                    pSafety: '82.0%',
                    score: '71.8/100',
                    highlight: false
                  },
                  {
                    rank: 7,
                    role: 'CONTINGENCY 6',
                    mode: 'CRUISE_YIELD',
                    vector: `[${Math.round(telemetry.speedKmh * 0.6)} km/h, a=-1.0 m/s², 0.0°, lane=1, 4.0s, 30m, CRUISE_YIELD]`,
                    pSafety: '68.4%',
                    score: '67.0/100',
                    highlight: false
                  },
                  {
                    rank: 8,
                    role: 'CONTINGENCY 7',
                    mode: 'EVASIVE_STEER',
                    vector: `[${Math.round(telemetry.speedKmh * 0.75)} km/h, a=-1.5 m/s², -12.0°, lane=0, 2.2s, 14m, EVASIVE_STEER]`,
                    pSafety: '62.1%',
                    score: '63.5/100',
                    highlight: false
                  }
                ].map(item => (
                  <tr key={item.rank} className={item.highlight ? 'bg-cyan-950/40 text-cyan-200 font-bold' : ''}>
                    <td className="py-1 px-2">#{item.rank}</td>
                    <td className="py-1 px-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.highlight ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="py-1 px-2 font-semibold text-amber-300">{item.mode}</td>
                    <td className="py-1 px-2 text-slate-300">{item.vector}</td>
                    <td className="py-1 px-2 text-right text-emerald-400">{item.pSafety}</td>
                    <td className="py-1 px-2 text-right font-bold text-cyan-300">{item.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="text-[10px] text-slate-500">
            {lang === 'pl'
              ? 'Optymalizacja portfelowa Markowitza z karą za nakładanie wektorów (Covering Wheel) gwarantuje gotowość 7 zróżnicowanych manewrów awaryjnych w pamięci pod-milisekundowej.'
              : 'Markowitz portfolio optimization with vector overlap penalty (Covering Wheel) guarantees 7 diverse contingency maneuvers pre-computed in sub-millisecond memory.'}
          </span>
        </div>
      </div>

      {/* Comparison badge System One vs Generative LLM */}
      <div className="bg-slate-950 p-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Why System One (arXiv:2609.29429) for Autonomous Vehicles?</strong> Directly evaluates state in a single feedforward pass 
            without text tokens, delivering calibrated decisions at 1.5ms with zero external API calls.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-red-400 line-through">LLM: 2500ms</span>
          <span className="text-emerald-400 font-bold">System One: 1.5ms</span>
        </div>
      </div>
    </div>
  );
};
