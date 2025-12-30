
import React, { useState, useEffect } from 'react';
import { GameLevel } from '../types';
import { Button } from './Button';
import { soundService } from '../services/soundService';

interface EscapeRoomProps {
  levels: GameLevel[];
  onFinish: () => void;
}

export const EscapeRoom: React.FC<EscapeRoomProps> = ({ levels, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [step, setStep] = useState<'narrative' | 'challenge'>('narrative');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const level = levels[currentIdx];
  const isHumanities = currentIdx < 2;

  useEffect(() => {
    soundService.setEnabled(!isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (step === 'narrative') {
      setDisplayText("");
      let i = 0;
      const text = level.scenicDescription;
      const interval = setInterval(() => {
        setDisplayText(text.substring(0, i));
        // Sonido de máquina de escribir solo en algunos caracteres para no saturar
        if (i % 2 === 0) soundService.playTypewriter();
        i++;
        if (i > text.length) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [currentIdx, step, level.scenicDescription]);

  const handleOption = (opt: string) => {
    if (showFeedback || unlocked) return;
    
    setSelectedOption(opt);
    if (opt === level.correctAnswer) {
      soundService.playSuccess();
      setShowFeedback('correct');
      setTimeout(() => { setUnlocked(true); }, 600);
    } else {
      soundService.playFailure();
      setShowFeedback('incorrect');
      setTimeout(() => { setShowFeedback(null); setSelectedOption(null); }, 1000);
    }
  };

  const nextLevel = () => {
    soundService.playClick();
    if (currentIdx === levels.length - 1) { 
      onFinish(); 
    } else {
      setCurrentIdx(prev => prev + 1);
      setStep('narrative');
      setUnlocked(false);
      setSelectedOption(null);
      setShowFeedback(null);
      setHintsUsed(0);
    }
  };

  // PANTALLA 1: LA NARRATIVA (LETRAS GRANDES)
  if (step === 'narrative') {
    return (
      <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-8 md:p-16 text-center animate-fade relative">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-xl`}></i>
        </button>
        
        <div className="max-w-3xl">
          <div className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${isHumanities ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {isHumanities ? 'Sabiduría de los Tiempos' : 'Misión de Conocimiento'}
          </div>
          <h2 className={`text-3xl md:text-5xl font-black mb-8 leading-tight animate-fade ${isHumanities ? 'text-amber-50 font-cinzel' : 'text-blue-50'}`}>
            {displayText}
            <span className="inline-block w-2 h-8 md:h-12 bg-white/30 ml-2 animate-pulse"></span>
          </h2>
          <Button 
            onClick={() => setStep('challenge')} 
            className={`mt-8 px-12 py-5 text-lg border-none shadow-2xl transition-all hover:scale-105 ${isHumanities ? 'bg-amber-600' : 'bg-blue-600'}`}
          >
            ACEPTAR EL RETO <i className="fas fa-chevron-right ml-3"></i>
          </Button>
        </div>
      </div>
    );
  }

  // PANTALLA 2: EL DESAFÍO Y POP-UP EDUCATIVO
  return (
    <div className={`h-full w-full flex flex-col p-4 transition-colors duration-700 relative ${
      showFeedback === 'correct' ? 'bg-green-50' : 
      showFeedback === 'incorrect' ? 'bg-red-50' : 'bg-slate-50'
    }`}>
      {/* Barra de Progreso */}
      <div className="w-full flex gap-1 mb-6">
        {levels.map((_, i) => (
          <div key={i} className={`h-2 rounded-full flex-grow transition-all duration-500 ${
            i < currentIdx ? 'bg-green-500' : 
            i === currentIdx ? (i < 2 ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]') : 
            'bg-white border border-slate-200'
          }`}></div>
        ))}
      </div>

      <div className="flex-grow flex flex-col gap-4 overflow-hidden max-w-4xl mx-auto w-full">
        <div className={`flex-grow glass rounded-[2.5rem] p-8 flex flex-col transition-all duration-500 ${unlocked ? 'opacity-30 blur-sm scale-95' : 'opacity-100'}`}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isHumanities ? 'bg-amber-500 shadow-amber-200' : 'bg-blue-500 shadow-blue-200'}`}>
                <i className={`fas ${isHumanities ? 'fa-book-open' : 'fa-atom'} text-xl`}></i>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Reto Educativo {level.id}/5</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{level.category}</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-lg`}></i>
            </button>
          </div>

          <div className="flex-grow flex flex-col justify-center">
             <div className="bg-slate-100/50 p-8 rounded-3xl border border-white">
                <p className="text-2xl md:text-3xl text-slate-800 mb-8 font-black leading-tight">{level.riddle}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {level.options.map((opt, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleOption(opt)} 
                      className={`p-5 rounded-2xl border-2 text-left transition-all font-bold text-base flex items-center gap-4 group ${
                      selectedOption === opt 
                        ? (showFeedback === 'correct' ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white')
                        : 'border-transparent bg-white text-slate-600 hover:border-slate-300 hover:shadow-md'
                    }`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-colors ${
                        selectedOption === opt ? 'bg-white/20 border-white text-white' : 'bg-slate-100 border-slate-200 text-slate-400 group-hover:bg-slate-200'
                      }`}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button 
              disabled={hintsUsed >= 3 || unlocked} 
              onClick={() => { soundService.playClick(); setHintsUsed(h => h + 1); }} 
              className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-white border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <i className="fas fa-lightbulb mr-2"></i> Pista ({3 - hintsUsed})
            </button>
            {hintsUsed > 0 && (
              <p className="text-amber-600 text-sm font-bold italic animate-fade flex-grow bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                💡 {level.hints[hintsUsed - 1]}
              </p>
            )}
          </div>
        </div>

        {/* POP-UP EDUCATIVO */}
        {unlocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border-t-[12px] border-green-500 animate-slide-up">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
                    <i className="fas fa-check-double"></i>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900">¡Conocimiento Adquirido!</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{level.congratulationMessage}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                    <p className="text-sm font-black text-green-700 uppercase tracking-widest mb-2">¿Sabías que...?</p>
                    <p className="text-lg md:text-xl text-slate-800 font-bold leading-snug">
                      "{level.knowledgeSnippet}"
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">La Explicación Maestra:</p>
                    <p className="text-base text-slate-600 leading-relaxed font-medium italic">
                      {level.explanation}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={nextLevel} 
                  className="w-full mt-10 py-5 bg-green-500 hover:bg-green-600 text-white text-lg font-black rounded-2xl shadow-lg border-none"
                >
                  {currentIdx === levels.length - 1 ? '¡FINALIZAR AVENTURA!' : 'CONTINUAR EL CAMINO'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
