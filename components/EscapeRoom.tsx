
import React, { useState, useEffect } from 'react';
import { GameLevel } from '../types';
import { Button } from './Button';

interface EscapeRoomProps {
  levels: GameLevel[];
  onFinish: () => void;
}

export const EscapeRoom: React.FC<EscapeRoomProps> = ({ levels, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [displayText, setDisplayText] = useState("");

  const level = levels[currentIdx];
  const isGatekeeper = currentIdx < 2;

  useEffect(() => {
    setDisplayText("");
    let i = 0;
    const text = level.scenicDescription;
    const interval = setInterval(() => {
      setDisplayText(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 12);
    return () => clearInterval(interval);
  }, [currentIdx, level.scenicDescription]);

  const handleOption = (opt: string) => {
    if (showFeedback || unlocked) return;
    
    setSelectedOption(opt);
    if (opt === level.correctAnswer) {
      setShowFeedback('correct');
      setTimeout(() => { setUnlocked(true); }, 800);
    } else {
      setShowFeedback('incorrect');
      setTimeout(() => { setShowFeedback(null); setSelectedOption(null); }, 1000);
    }
  };

  const nextLevel = () => {
    if (currentIdx === levels.length - 1) { onFinish(); } 
    else {
      setCurrentIdx(prev => prev + 1);
      setUnlocked(false);
      setSelectedOption(null);
      setShowFeedback(null);
      setHintsUsed(0);
    }
  };

  return (
    <div className={`h-full w-full flex flex-col p-6 transition-colors duration-700 ${
      showFeedback === 'correct' ? 'bg-[#F0FFF4]' : 
      showFeedback === 'incorrect' ? 'bg-[#FFF5F5]' : 'bg-[#FFF9F0]'
    }`}>
      {/* Barra de Progreso Minimal */}
      <div className="w-full flex gap-2 mb-6 flex-shrink-0">
        {levels.map((_, i) => (
          <div key={i} className={`h-3 rounded-full flex-grow transition-all duration-700 ${
            i < currentIdx ? 'bg-[#4ECDC4]' : 
            i === currentIdx ? (isGatekeeper ? 'bg-[#FFD93D] animate-pulse ring-4 ring-amber-50' : 'bg-[#FF6B6B] animate-pulse ring-4 ring-red-50') : 
            'bg-white shadow-inner'
          }`}></div>
        ))}
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden items-stretch">
        {/* Columna Izquierda: El Desafío */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
          <div className={`glass p-6 md:p-10 rounded-[3rem] flex-grow flex flex-col transition-all duration-700 relative overflow-hidden ${unlocked ? 'opacity-10 blur-sm grayscale pointer-events-none' : 'border-white shadow-xl'}`}>
            <div className="flex justify-between items-start mb-6 flex-shrink-0">
              <div className="flex-grow pr-4">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] block mb-1 ${isGatekeeper ? 'text-amber-600' : 'text-[#FF6B6B]'}`}>
                  {isGatekeeper ? '🔒 ACCESO: CULTURA GENERAL' : '🎯 DESAFÍO TÉCNICO'}
                </span>
                <h3 className="text-2xl md:text-3xl font-cinzel font-black text-slate-800 leading-tight truncate">{level.category}</h3>
              </div>
              <div className={`px-4 py-2 rounded-2xl border-4 text-center flex-shrink-0 ${isGatekeeper ? 'bg-[#FFE66D] border-white text-amber-900' : 'bg-[#FF6B6B] border-white text-white'}`}>
                <span className="text-sm font-black">Nº {level.id}</span>
              </div>
            </div>

            <div className="flex-grow flex flex-col justify-center overflow-hidden">
               <p className="text-slate-400 text-sm md:text-base font-bold italic mb-4 border-l-4 border-[#FFE66D] pl-4 py-2 bg-white/30 rounded-r-2xl flex-shrink-0 max-h-20 overflow-y-auto custom-scroll">
                "{displayText}"
              </p>
              
              <div className="bg-white p-6 rounded-[2.5rem] border-4 border-slate-50 shadow-sm flex-grow flex flex-col justify-center overflow-hidden">
                <p className="text-xl md:text-2xl text-slate-800 mb-6 font-black leading-tight flex-shrink-0 overflow-y-auto max-h-24 custom-scroll">{level.riddle}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scroll pr-2">
                  {level.options.map((opt, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleOption(opt)} 
                      className={`p-4 rounded-2xl border-4 text-left transition-all btn-joy flex items-center shadow-sm relative group ${
                      selectedOption === opt 
                        ? (showFeedback === 'correct' ? 'bg-[#4ECDC4] border-[#4ECDC4] text-white' : 'bg-[#FF6B6B] border-[#FF6B6B] text-white animate-shake')
                        : 'border-[#F7FFF7] bg-[#F7FFF7]/50 text-slate-600 hover:border-[#FF6B6B] hover:bg-white'
                    }`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black mr-4 border-2 flex-shrink-0 ${
                        selectedOption === opt ? 'bg-white/20 border-white/20 text-white' : 'bg-white border-slate-100 text-slate-300'
                      }`}>{String.fromCharCode(65 + i)}</span>
                      <span className="text-sm font-black leading-tight line-clamp-2">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 flex-shrink-0">
              <button disabled={hintsUsed >= 3 || unlocked} onClick={() => setHintsUsed(h => h + 1)} className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase border-4 bg-white text-[#4ECDC4] border-[#4ECDC4] btn-joy">
                PISTA ({3 - hintsUsed})
              </button>
              {hintsUsed > 0 && (
                <div className="p-3 bg-white rounded-2xl border-2 border-[#F7FFF7] flex-grow shadow-inner">
                  <p className="text-[#4ECDC4] text-xs font-black italic truncate">💡 {level.hints[hintsUsed - 1]}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: El Tesoro/Feedback */}
        <div className="lg:col-span-5 flex flex-col overflow-hidden">
          {!unlocked ? (
            <div className="glass h-full rounded-[3rem] border-4 border-dashed border-[#F7FFF7] flex flex-col items-center justify-center p-8 text-center opacity-40">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-12">
                <i className={`fas ${isGatekeeper ? 'fa-globe-americas' : 'fa-brain'} text-4xl text-slate-200`}></i>
              </div>
              <h3 className="text-xl font-cinzel text-slate-400 mb-2 uppercase font-black">BLOQUEADO</h3>
              <p className="text-slate-300 text-xs font-black italic">Acierta para ver el saber.</p>
            </div>
          ) : (
            <div className={`glass h-full rounded-[3rem] border-t-[12px] flex flex-col p-8 animate-in zoom-in-95 duration-500 shadow-xl relative overflow-hidden ${isGatekeeper ? 'border-[#FFD93D]' : 'border-[#FF6B6B]'}`}>
              <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white rotate-3 ${isGatekeeper ? 'bg-[#FFD93D] text-amber-900' : 'bg-[#FF6B6B] text-white'}`}>
                  <i className={`fas ${isGatekeeper ? 'fa-unlock' : 'fa-trophy'} text-2xl`}></i>
                </div>
                <div className="flex-grow overflow-hidden">
                  <h3 className="text-2xl font-cinzel font-black text-slate-800 truncate">¡LOGRADO!</h3>
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] truncate ${isGatekeeper ? 'text-amber-600' : 'text-[#FF6B6B]'}`}>
                    {level.congratulationMessage}
                  </p>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto custom-scroll pr-4 space-y-6 mb-6">
                <div className="p-6 rounded-[2.5rem] bg-white border-4 border-slate-50 shadow-sm">
                  <h4 className="font-black text-[9px] uppercase text-[#FF6B6B] mb-2">Conocimiento Clave</h4>
                  <p className="text-lg text-slate-800 font-black leading-tight italic">"{level.knowledgeSnippet}"</p>
                </div>

                <div className="p-6 bg-white/50 rounded-[2.5rem] border-2 border-[#F7FFF7] shadow-inner">
                   <h4 className="text-slate-300 font-black text-[9px] uppercase mb-2">Por qué es así:</h4>
                   <p className="text-slate-500 text-xs leading-relaxed font-bold italic">{level.explanation}</p>
                </div>
                
                {level.sources && level.sources.length > 0 && !isGatekeeper && (
                  <div className="p-4 bg-[#F7FFF7]/50 rounded-2xl border-2 border-white">
                    <h4 className="text-[#4ECDC4] font-black text-[8px] uppercase mb-3">Fuentes:</h4>
                    <div className="space-y-2">
                      {level.sources.map((src, idx) => (
                        <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-[#4ECDC4] font-black truncate hover:underline">
                          <i className="fas fa-link mr-2"></i> {src.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={nextLevel} className={`w-full py-5 text-xl font-black rounded-2xl shadow-lg border-4 border-white flex-shrink-0 ${isGatekeeper ? 'bg-[#FFD93D] text-amber-900' : 'bg-[#FF6B6B] text-white'}`}>
                {currentIdx === levels.length - 1 ? '¡FINALIZAR!' : '¡SIGUIENTE!'} <i className="fas fa-chevron-right ml-4"></i>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
