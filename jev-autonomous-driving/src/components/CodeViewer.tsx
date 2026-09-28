import React, { useState } from 'react';
import { 
  Code2, Copy, Check, Download, Terminal, 
  FileCode, PlayCircle, ExternalLink, Sparkles 
} from 'lucide-react';
import { PYTHON_FILES, PythonFileItem } from '../python/pythonCode';

interface CodeViewerProps {
  lang?: 'en' | 'pl';
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ lang = 'en' }) => {
  const [activeFileId, setActiveFileId] = useState<string>('system_one_core_v4_rlcd');
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = PYTHON_FILES.find(f => f.id === activeFileId) || PYTHON_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: PythonFileItem) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    PYTHON_FILES.forEach((file, index) => {
      setTimeout(() => handleDownload(file), index * 200);
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            System One — Standalone Python Implementation (arXiv:2609.29429)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700 shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy File'}
          </button>

          <button
            onClick={() => handleDownload(activeFile)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download {activeFile.name}
          </button>

          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download All (6 Files)
          </button>
        </div>
      </div>

      {/* Tabs for files */}
      <div className="bg-slate-950/60 px-3 pt-2 border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
        {PYTHON_FILES.map(file => (
          <button
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-mono transition border-t border-x ${
              activeFileId === file.id
                ? 'bg-slate-900 border-slate-700 text-emerald-400 font-semibold'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            <span>{file.name}</span>
          </button>
        ))}
      </div>

      {/* File summary bar */}
      <div className="bg-slate-950/40 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex items-center justify-between">
        <span>{activeFile.description}</span>
        <span className="font-mono text-[11px] text-slate-500">
          {activeFile.code.split('\n').length} lines of code
        </span>
      </div>

      {/* Code viewport with line numbers */}
      <div className="relative bg-slate-950 p-4 font-mono text-xs overflow-x-auto max-h-[520px] text-slate-300 leading-relaxed selection:bg-cyan-900 selection:text-cyan-100">
        <pre className="tab-size-4">
          <code>
            {activeFile.code.split('\n').map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell pr-4 text-right select-none text-slate-600 font-mono text-[11px] w-8">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">
                  {highlightPythonSyntax(line)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Terminal execution instructions */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 text-xs flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>How to run in your local Python environment:</span>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-slate-300 space-y-2">
          <div className="text-slate-400"># 1. Install lightweight standard dependencies (No proprietary SDK required!):</div>
          <div className="text-cyan-300 select-all">pip install -r requirements.txt</div>

          <div className="text-slate-400 pt-1"># 2. Run the standalone RLCD calibration & Brier score evaluation:</div>
          <div className="text-purple-300 select-all">python system_one_core_v4_rlcd.py</div>

          <div className="text-slate-400 pt-1"># 3. Run the complete autonomous vehicle decision benchmark:</div>
          <div className="text-emerald-400 select-all font-bold">python run_simulation.py</div>
          <div className="text-[11px] text-emerald-400/80">
            ✓ 100% Standalone local execution — Sub-2ms feedforward pass with zero external API calls!
          </div>
        </div>
      </div>
    </div>
  );
};

// Syntax highlighting helper for Python code lines
function highlightPythonSyntax(line: string): React.ReactNode {
  if (line.trim().startsWith('#')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }
  if (line.trim().startsWith('"""') || line.trim().endsWith('"""')) {
    return <span className="text-emerald-400/90">{line}</span>;
  }

  const keywords = ['import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'in', 'while', 'try', 'except', 'as', 'and', 'or', 'not', 'True', 'False', 'None'];
  
  const words = line.split(/(\s+|[(),.:=[\]{}])/);
  return (
    <>
      {words.map((w, i) => {
        if (keywords.includes(w)) {
          return <span key={i} className="text-pink-400 font-semibold">{w}</span>;
        }
        if (['Noul', 'Choice', 'Score', 'TypeSafeClient', 'JevDecision', 'AutonomousVehicleController', 'AutonomousCarEnvironment'].includes(w)) {
          return <span key={i} className="text-cyan-300 font-semibold">{w}</span>;
        }
        if (/^"[^"]*"$/.test(w) || /^'[^']*'$/.test(w)) {
          return <span key={i} className="text-amber-300">{w}</span>;
        }
        if (/^\d+(\.\d+)?$/.test(w)) {
          return <span key={i} className="text-purple-300">{w}</span>;
        }
        return <span key={i}>{w}</span>;
      })}
    </>
  );
}
