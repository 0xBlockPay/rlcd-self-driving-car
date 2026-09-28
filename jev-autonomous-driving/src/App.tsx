/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Car, Code2, BookOpen, Compass, Cpu, ShieldCheck, 
  ExternalLink, Sparkles, Terminal, Activity, Zap, Globe 
} from 'lucide-react';
import { Simulator } from './components/Simulator';
import { JevTelemetry } from './components/JevTelemetry';
import { CodeViewer } from './components/CodeViewer';
import { PaperDeepDive } from './components/PaperDeepDive';
import { ReliabilityDiagram } from './components/ReliabilityDiagram';
import { VehicleTelemetry, JevDecisionBundle, ScenarioPreset } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'PYTHON_CODE' | 'THEORY'>('SIMULATOR');
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [decision, setDecision] = useState<JevDecisionBundle | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ScenarioPreset>('HIGHWAY_CRUISE');
  const [lang, setLang] = useState<'en' | 'pl'>('en');

  const handleTelemetryUpdate = (newTelem: VehicleTelemetry, newDecision: JevDecisionBundle) => {
    setTelemetry(newTelem);
    setDecision(newDecision);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                System One
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                RLCD Architecture
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Autonomous Vehicle Decision Framework based on <strong>arXiv:2609.29429</strong>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'SIMULATOR'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Simulator & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('PYTHON_CODE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'PYTHON_CODE'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Python Code (SDK)</span>
          </button>

          <button
            onClick={() => setActiveTab('THEORY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'THEORY'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Paper & RLCD Theory</span>
          </button>
        </div>

        {/* Right side tools */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition"
            title="Toggle Language / Zmień język"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono uppercase font-bold">{lang}</span>
          </button>

          {/* ArXiv Link */}
          <a
            href="https://arxiv.org/pdf/2609.29429"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition"
          >
            <span className="font-mono text-cyan-400 font-medium">arXiv:2609.29429</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        {/* Intro banner */}
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/30 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                System One Decision Architecture
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-slate-400 text-xs font-mono">Latency: ~78 ms</span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-slate-400 text-xs font-mono">Brier Calibrated</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              System One — Autonomous Vehicle Decision Framework
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Replacing slow, hallucination-prone generative LLMs, 
              <strong> System One (arXiv:2609.29429)</strong> evaluates raw vehicle sensor state in a single concurrent pass, 
              directly outputting strongly-typed decisions (<em>Noul</em>, <em>Choice</em>, <em>Score</em>) with mathematically calibrated confidence scores. 
              Implemented 100% locally in Python with zero external API dependencies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('PYTHON_CODE')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition"
            >
              <Code2 className="w-4 h-4" />
              View & Download Python Code
            </button>
          </div>
        </div>

        {/* Tab 1: Simulator & Live Telemetry */}
        {activeTab === 'SIMULATOR' && (
          <div className="flex flex-col gap-6">
            <Simulator 
              onTelemetryUpdate={handleTelemetryUpdate}
              selectedPreset={selectedPreset}
              onPresetChange={setSelectedPreset}
              lang={lang}
            />
            <JevTelemetry 
              telemetry={telemetry} 
              decision={decision} 
              lang={lang}
            />
          </div>
        )}

        {/* Tab 2: Python Code & Architecture */}
        {activeTab === 'PYTHON_CODE' && (
          <div className="flex flex-col gap-6">
            <CodeViewer lang={lang} />
          </div>
        )}

        {/* Tab 3: Theoretical Deep Dive & Reliability Diagram */}
        {activeTab === 'THEORY' && (
          <div className="flex flex-col gap-6">
            <PaperDeepDive lang={lang} />
            <ReliabilityDiagram lang={lang} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span>System One Autonomous Driving Engine</span>
          <span>•</span>
          <span className="font-mono text-cyan-400">Standalone RLCD Implementation (arXiv:2609.29429)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Research basis:</span>
          <a 
            href="https://arxiv.org/pdf/2609.29429" 
            target="_blank" 
            rel="noreferrer"
            className="text-cyan-400 hover:underline font-mono"
          >
            arXiv:2609.29429
          </a>
        </div>
      </footer>
    </div>
  );
}
