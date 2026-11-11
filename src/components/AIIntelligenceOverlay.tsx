import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import * as Icons from './Icons';

interface AIIntelligenceOverlayProps {
  imageBase64: string;
  onClose: () => void;
  onComplete: (data: any) => void;
  onSwitchToManual?: () => void;
}

const ALL_13_STAGES = [
  "Stage 1 — Image Intake & Validation",
  "Stage 2 — Object Detection & Cropping",
  "Stage 3 — Category Classification",
  "Stage 4 — Color & Pattern Extraction",
  "Stage 5 — Material & Surface Estimation",
  "Stage 6 — Design Detail Recognition",
  "Stage 7 — Structured JSON Parsing",
  "Stage 8 — Auto-Generated Title & Description",
  "Stage 9 — Product Attribute Extraction",
  "Stage 10 — Search & Market Positioning",
  "Stage 11 — Useful Tags & Safety Notes",
  "Stage 12 — Image Integrity Screening",
  "Stage 13 — Draft Assembly & Seller Review"
];

export default function AIIntelligenceOverlay({
  imageBase64,
  onClose,
  onComplete,
  onSwitchToManual
}: AIIntelligenceOverlayProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(1);
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const socket = io();

    // Smooth stage progress ticker while awaiting response
    const stageInterval = setInterval(() => {
      if (isCancelled) return;
      setCurrentStageIndex(prev => {
        if (prev < 12) {
          const next = prev + 1;
          setProgress(Math.min(92, Math.floor((next / 13) * 100)));
          return next;
        }
        return prev;
      });
    }, 300);

    // Listen to Socket.IO real-time stage progress
    socket.on("ai_stage_progress", (data: any) => {
      if (isCancelled) return;
      if (data.stageIndex) {
        setCurrentStageIndex(data.stageIndex);
        const calculatedProgress = Math.min(100, Math.floor((data.stageIndex / 13) * 100));
        setProgress(calculatedProgress);
      }
      if (data.status === 'failed') {
        clearInterval(stageInterval);
        setError(data.error || "AI pipeline execution encountered an error.");
      }
    });

    const runAnalysis = async () => {
      try {
        const res = await fetch('/api/ai/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             imageBase64,
             mimeType: imageBase64.match(/^data:([^;]+);/)?.[1] || 'image/jpeg'
           })
        });
        
        const data = await res.json();
        clearInterval(stageInterval);
        
        if (!isCancelled) {
          if (data.validation && (data.validation.isValidImage === false || data.validation.isQualitySufficient === false)) {
            setError(data.validation.validationMessage || "Please upload a clearer image with one primary product or object.");
          } else if (data.error) {
            setError(data.error);
          } else {
            setProgress(100);
            setCurrentStageIndex(13);
            setTimeout(() => {
              if (!isCancelled) onComplete(data);
            }, 500);
          }
        }
      } catch (err: any) {
        clearInterval(stageInterval);
        if (!isCancelled) {
          setError(err.message || "Failed to analyze image");
        }
      }
    };

    runAnalysis();

    return () => {
      isCancelled = true;
      clearInterval(stageInterval);
      socket.disconnect();
    };
  }, [imageBase64, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute top-6 right-6 z-10">
        <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all">
          <Icons.Close size={24} />
        </button>
      </div>

      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 border border-white/20 rounded-[32px] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        {error ? (
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center">
              <Icons.Warning size={40} className="text-rose-400" />
            </div>
            <h3 className="text-lg font-black text-white whitespace-pre-line leading-relaxed">
              {error}
            </h3>
            <div className="flex flex-col w-full gap-2 pt-2">
              <button 
                onClick={onClose} 
                className="w-full py-3.5 bg-gradient-to-r from-[#0d7d6f] to-teal-400 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-lg active:scale-95 transition-transform"
              >
                Upload Clearer Image
              </button>
              {onSwitchToManual && (
                <button 
                  onClick={onSwitchToManual}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs active:scale-95 transition-all"
                >
                  Switch to Manual Entry
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Image Scanner Frame */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-white/30 mb-6 relative shadow-2xl shrink-0">
               <img src={imageBase64} className="w-full h-full object-cover" alt="Product image analysis" />
              <div className="absolute inset-0 bg-[#0d7d6f]/20 mix-blend-overlay" />
              <motion.div 
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-[#0d7d6f] via-teal-300 to-[#0d7d6f] shadow-[0_0_15px_rgba(13,125,111,1)]"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">InStoreLook AI</h2>
            <p className="text-teal-200 text-[10px] font-bold uppercase tracking-widest mb-6 text-center">
               13-Stage Product Intelligence Engine
            </p>

            {/* Scrollable Stage Stepper */}
            <div className="w-full max-h-52 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar border-y border-white/10 py-3">
              {ALL_13_STAGES.map((stage, idx) => {
                const stageNum = idx + 1;
                const isPast = stageNum < currentStageIndex;
                const isCurrent = stageNum === currentStageIndex;
                return (
                  <div key={stage} className="flex items-center gap-3 text-left">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isPast ? 'bg-[#0d7d6f] text-white' : isCurrent ? 'bg-white text-[#1A1A1A]' : 'bg-white/10 text-white/30'
                    }`}>
                      {isPast ? (
                        <Icons.Check size={12} strokeWidth={3} />
                      ) : isCurrent ? (
                        <Icons.ProgressActivity size={12} className="animate-spin text-[#0d7d6f]" />
                      ) : (
                        <span className="text-[9px] font-black">{stageNum}</span>
                      )}
                    </div>
                    <span className={`text-xs font-bold transition-all ${
                      isPast ? 'text-white/80' : isCurrent ? 'text-white font-extrabold animate-pulse' : 'text-white/30'
                    }`}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full mt-6">
              <div className="flex justify-between text-[10px] font-black text-white/70 mb-2 uppercase tracking-widest">
                <span>Pipeline Stage {currentStageIndex} / 13</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#0d7d6f] via-teal-400 to-emerald-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
