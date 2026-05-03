/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Shield, Target, Key, Power, Disc, Cpu, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

type LogType = 'info' | 'success' | 'error';
interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: LogType;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [token, setToken] = useState("");
  const [targetId, setTargetId] = useState("");
  const [keyword, setKeyword] = useState("join");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Generate or retrieve persistent sessionId
  const sessionId = useMemo(() => {
    let id = localStorage.getItem('sniper_session_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('sniper_session_id', id);
    }
    return id;
  }, []);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('initSession', sessionId);
    });

    socket.on('sessionStatus', (data) => {
      if (data.isRunning) {
        setSessionRunning(true);
        setStep(4);
        addLog("Session safely restored from backend.", "success");
        if (data.config) {
          setTargetId(data.config.targetId || "");
          setKeyword(data.config.keyword || "join");
        }
      }
    });

    socket.on('log', (data: { message: string, type: LogType }) => {
      addLog(data.message, data.type);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string, type: LogType = 'info') => {
    const d = new Date();
    const timestamp = `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
    
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      message,
      type
    }].slice(-100)); // Keep last 100 logs
  };

  const nextStep = () => {
    if (step === 1 && !token.trim()) return;
    if (step === 2 && !targetId.trim()) return;
    setStep(prev => prev + 1);
  };

  const startBot = () => {
    if (!keyword.trim()) return;
    setStep(4);
    setSessionRunning(true);
    addLog("Booting isolated instance...", "info");
    socketRef.current?.emit('launchBot', { sessionId, token, targetId, keyword });
  };

  const stopBot = () => {
    socketRef.current?.emit('stopBot', sessionId);
    setSessionRunning(false);
    setStep(1);
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Aurora Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)] blur-[60px]"
        />
        <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_50%)] blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[520px] bg-[#0f0f11]/65 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl overflow-hidden shadow-black/80"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-4"
            >
              <Cpu className="w-3 h-3 mr-2 text-indigo-400" />
              v2 High Reliability System
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white">
              The First <span className="text-indigo-500">Signer</span>
            </h1>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 flex items-center">
                    <Key className="w-4 h-4 mr-2" /> Discord Token
                  </label>
                  <input 
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter secure authentication token"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <button 
                  onClick={nextStep}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                >
                  Authenticate Protocol
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 flex items-center">
                    <Target className="w-4 h-4 mr-2" /> Target Identification ID
                  </label>
                  <input 
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="e.g., 1464707986499960883"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 bg-white/5 border border-white/10 py-4 rounded-xl text-zinc-400 font-medium hover:bg-white/10 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={nextStep}
                    className="flex-[2] bg-white text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                  >
                    Configure Channel
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 flex items-center">
                    <Shield className="w-4 h-4 mr-2" /> Action Keyword
                  </label>
                  <input 
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g., join"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 bg-white/5 border border-white/10 py-4 rounded-xl text-zinc-400 font-medium hover:bg-white/10 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={startBot}
                    className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
                  >
                    Initialize Protocol
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 py-3 rounded-2xl border border-emerald-500/20">
                  <motion.div 
                    animate={{ opacity: [1, 0.4, 1] }} 
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
                  />
                  <span>SYSTEM ACTIVE & ISOLATED</span>
                </div>

                <div className="bg-black rounded-2xl border border-white/10 overflow-hidden shadow-inner shadow-black">
                  <div className="bg-zinc-900 px-4 py-2 border-bottom border-white/5 flex items-center justify-between">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">sniper_console ~ output</span>
                    <Terminal className="w-3 h-3 text-zinc-600" />
                  </div>
                  <div 
                    ref={logContainerRef}
                    className="h-64 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed scroll-smooth"
                  >
                    {logs.length === 0 ? (
                      <div className="text-zinc-600 italic">Waiting for incoming logs...</div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="mb-1 flex group">
                          <span className="text-zinc-700 mr-2 shrink-0 select-none">{log.timestamp}</span>
                          <span className={`
                            ${log.type === 'success' ? 'text-emerald-400' : ''}
                            ${log.type === 'error' ? 'text-red-400' : ''}
                            ${log.type === 'info' ? 'text-sky-400' : ''}
                          `}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button 
                  onClick={stopBot}
                  className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-4 rounded-xl hover:bg-red-500 hover:text-white transition-all group"
                >
                  <Power className="w-4 h-4 inline-block mr-2 group-hover:animate-pulse" />
                  Disconnect Protocol
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer / Branding */}
          <div className="mt-10 pt-8 border-t border-white/5 text-center px-4">
            <span className="block text-[8px] uppercase tracking-[0.4em] text-zinc-500 font-bold mb-3">Project Engineered By</span>
            <strong className="text-2xl md:text-3xl font-black tracking-[0.2em] uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-zinc-600 via-white to-zinc-600 bg-[length:200%_auto] animate-gradient-spin">
              PREM CULLEN
            </strong>
          </div>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradient-spin {
          to { background-position: 200% center; }
        }
        .animate-gradient-spin {
          animation: gradient-spin 3s linear infinite;
        }
      `}} />
    </div>
  );
}
