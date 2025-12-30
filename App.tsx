
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, GameLevel, SourceType, FileData, Chapter, Curriculum, UserProfile } from './types';
import { generateCurriculum, generateChapterLevels } from './services/geminiService';
import { Button } from './components/Button';
import { EscapeRoom } from './components/EscapeRoom';

const ScreenWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`h-screen w-full flex flex-col overflow-hidden relative ${className} animate-fade`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.AUTH);
  const [sourceType, setSourceType] = useState<SourceType>('pdf');
  const [inputValue, setInputValue] = useState('');
  const [topic, setTopic] = useState('');
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(null);
  const [isKeyReady, setIsKeyReady] = useState(!!process.env.API_KEY);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKeyStatus = async () => {
      if (process.env.API_KEY) {
        setIsKeyReady(true);
        return;
      }
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        if (selected) setIsKeyReady(true);
      }
    };
    checkKeyStatus();
  }, []);

  const handleStartMotor = async () => {
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
      setIsKeyReady(true);
      setStatus(AppStatus.IDLE);
      setError('');
    } catch (e) {
      if (process.env.API_KEY) {
        setIsKeyReady(true);
        setStatus(AppStatus.IDLE);
      } else {
        setError("No se pudo iniciar el motor. Asegúrate de tener una API_KEY configurada.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (Gemini inlineData tiene límites, sugerimos < 20MB para estabilidad)
    if (file.size > 20 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Intenta con uno de menos de 20MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFileData({ 
        data: (reader.result as string).split(',')[1], 
        mimeType: file.type 
      });
      setTopic(file.name.split('.')[0]);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleStartMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    setStatus(AppStatus.LOADING);
    try {
      const syllabus = await generateCurriculum(topic || "Nueva Lección", inputValue, selectedFileData || undefined);
      syllabus.chapters = syllabus.chapters.map((c, i) => ({ ...c, status: i === 0 ? 'available' : 'locked' }));
      setCurriculum(syllabus);
      setStatus(AppStatus.CURRICULUM_MAP);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setIsKeyReady(false);
        setStatus(AppStatus.AUTH);
        setError("La llave API no es válida. Por favor, reconecta el motor.");
      } else {
        setError("Error al procesar el material. El análisis de video puede tardar más, intenta de nuevo.");
        setStatus(AppStatus.IDLE);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startChapter = async (chapter: Chapter) => {
    if (chapter.status === 'locked' || isProcessing) return;
    
    setIsProcessing(true);
    setStatus(AppStatus.LOADING);
    setActiveChapter(chapter);
    try {
      const chapterLevels = await generateChapterLevels(topic, chapter, inputValue, selectedFileData || undefined);
      setLevels(chapterLevels);
      setStatus(AppStatus.PLAYING);
    } catch (err: any) {
      setError("Error al generar los desafíos de este capítulo.");
      setStatus(AppStatus.CURRICULUM_MAP);
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === AppStatus.AUTH) {
    return (
      <ScreenWrapper className="items-center justify-center bg-[#0F172A] p-6">
        <div className="max-w-md w-full glass p-10 rounded-[3rem] text-center border-none shadow-2xl relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600"></div>
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white text-4xl shadow-2xl shadow-indigo-200 animate-pulse">
            <i className="fas fa-microchip"></i>
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">EduEscape AI</h2>
          <p className="text-slate-400 text-sm mb-10 font-medium">Motor de Aprendizaje Generativo v3.0</p>
          <div className="space-y-4">
            <Button onClick={handleStartMotor} className={`w-full py-6 text-white border-none shadow-xl transition-all font-black tracking-widest ${isKeyReady ? 'bg-emerald-500 shadow-emerald-100' : 'bg-indigo-600 shadow-indigo-100 hover:scale-[1.02]'}`}>
              <i className={`fas ${isKeyReady ? 'fa-play' : 'fa-bolt'} mr-3`}></i>
              {isKeyReady ? 'ARRANCAR MOTOR GRATUITO' : 'CONECTAR CEREBRO IA'}
            </Button>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{isKeyReady ? 'Sistema Operativo: LISTO' : 'Requiere conexión con Google Gemini'}</p>
            {error && <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mt-4"><p className="text-[11px] text-rose-600 font-bold leading-relaxed">{error}</p></div>}
            <div className="pt-6 border-t border-slate-50"><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-indigo-400 hover:text-indigo-600 font-black underline uppercase tracking-tighter">¿Cómo funciona el nivel gratuito? <i className="fas fa-external-link-alt ml-1"></i></a></div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.IDLE) {
    return (
      <ScreenWrapper className="items-center justify-center p-4 bg-slate-50">
        <div className="max-w-xl w-full bg-white p-10 rounded-[2.5rem] text-center shadow-xl relative border border-slate-100">
          <button onClick={() => setStatus(AppStatus.AUTH)} className="absolute top-6 left-8 text-slate-300 hover:text-slate-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><i className="fas fa-power-off"></i> Reiniciar Motor</button>
          <header className="mb-10">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><i className="fas fa-file-import text-xl"></i></div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">Carga tu Material</h1>
            <p className="text-slate-400 text-sm font-medium">La IA analizará texto, PDF o video para crear la aventura.</p>
          </header>
          
          <form onSubmit={handleStartMission} className="space-y-6">
             <div className="flex justify-center bg-slate-100/80 p-1.5 rounded-2xl gap-1 mb-6 w-fit mx-auto overflow-x-auto max-w-full">
                <button type="button" onClick={() => { setSourceType('pdf'); setSelectedFileData(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${sourceType === 'pdf' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>PDF</button>
                <button type="button" onClick={() => { setSourceType('video'); setSelectedFileData(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${sourceType === 'video' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>VIDEO PROPIO</button>
                <button type="button" onClick={() => { setSourceType('text'); setSelectedFileData(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${sourceType === 'text' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>TEXTO</button>
             </div>

             {sourceType !== 'text' ? (
              <div onClick={() => fileInputRef.current?.click()} className="group p-10 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300">
                <input type="file" ref={fileInputRef} className="hidden" accept={sourceType === 'pdf' ? ".pdf" : "video/*"} onChange={handleFileChange} />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <i className={`fas ${sourceType === 'pdf' ? 'fa-file-pdf' : 'fa-video'} text-2xl text-indigo-400`}></i>
                </div>
                <p className="font-black text-slate-500 truncate px-4 text-sm">{topic || `Selecciona tu ${sourceType.toUpperCase()}`}</p>
                <p className="text-[10px] text-slate-300 mt-2 font-bold uppercase tracking-tighter">Máximo 20MB • {sourceType === 'pdf' ? 'Solo PDF' : 'MP4, WebM, MOV'}</p>
              </div>
             ) : (
                <div className="relative">
                  <textarea required value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Pega aquí el contenido de tu clase..." className="w-full h-44 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 outline-none focus:border-indigo-400 focus:bg-white text-sm font-medium transition-all resize-none custom-scroll" />
                  <div className="absolute bottom-4 right-6 text-[10px] font-black text-slate-300">{inputValue.length} CARACTERES</div>
                </div>
             )}

             <Button type="submit" disabled={isProcessing || (!selectedFileData && !inputValue)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-100 hover:shadow-indigo-200 border-none text-lg">
               {isProcessing ? <span className="flex items-center gap-3"><i className="fas fa-sync fa-spin"></i> GENERANDO...</span> : "¡CONSTRUIR ESCAPE ROOM!"}
             </Button>
             {error && <p className="text-[11px] font-bold text-rose-500 mt-4 bg-rose-50 py-2 rounded-lg">{error}</p>}
          </form>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.CURRICULUM_MAP && curriculum) {
    return (
      <ScreenWrapper className="p-6 bg-[#F8FAFC]">
        <div className="max-w-4xl w-full mx-auto h-full flex flex-col">
          <header className="mb-10 flex justify-between items-end">
            <div>
                <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sesión de Aprendizaje Activa</p></div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 truncate max-w-xl">{topic}</h1>
            </div>
            <button onClick={() => setStatus(AppStatus.IDLE)} className="text-[10px] font-black text-slate-400 bg-white px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md uppercase tracking-widest"><i className="fas fa-plus mr-2"></i> Nuevo Tema</button>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scroll pb-20 pr-2">
            {curriculum.chapters.map((chapter, idx) => (
              <div key={chapter.id} onClick={() => startChapter(chapter)} className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col h-64 ${chapter.status === 'locked' ? 'bg-slate-100 border-transparent opacity-60 grayscale cursor-not-allowed' : 'bg-white border-white shadow-xl shadow-slate-200/50 cursor-pointer hover:border-indigo-400 hover:-translate-y-2'}`}>
                <div className="absolute top-6 right-8 text-4xl font-black text-slate-50 opacity-10 group-hover:opacity-20 transition-opacity">0{idx + 1}</div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg transition-transform group-hover:scale-110 ${chapter.status === 'completed' ? 'bg-emerald-500 shadow-emerald-100' : (chapter.status === 'locked' ? 'bg-slate-300' : 'bg-indigo-600 shadow-indigo-100')}`}>
                  <i className={`fas ${chapter.status === 'locked' ? 'fa-lock' : (chapter.status === 'completed' ? 'fa-check' : 'fa-play')}`}></i>
                </div>
                <div className="mt-auto"><h3 className="font-black text-xl text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{chapter.title}</h3><p className="text-slate-400 text-xs font-medium line-clamp-2 leading-relaxed">{chapter.description}</p></div>
                {chapter.status === 'available' && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">EMPEZAR MISIÓN <i className="fas fa-arrow-right ml-1"></i></div>}
              </div>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.PLAYING) {
    return (
      <ScreenWrapper className="bg-white">
        <nav className="h-16 px-8 flex justify-between items-center border-b border-slate-50 shrink-0 bg-white/80 backdrop-blur-md z-10">
           <div className="flex items-center gap-4 truncate">
             <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs"><i className="fas fa-map-marked-alt"></i></div>
             <span className="font-black text-xs text-slate-600 truncate tracking-tight">{activeChapter?.title}</span>
           </div>
           <button onClick={() => setStatus(AppStatus.CURRICULUM_MAP)} className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-2 rounded-lg uppercase hover:bg-rose-100 transition-colors tracking-widest">Abandonar Misión</button>
        </nav>
        <div className="flex-grow overflow-hidden"><EscapeRoom levels={levels} onFinish={() => {
             const updated = curriculum!.chapters.map(c => {
               if (c.id === activeChapter?.id) return { ...c, status: 'completed' as const };
               if (c.id === (activeChapter?.id || 0) + 1) return { ...c, status: 'available' as const };
               return c;
             });
             setCurriculum({ ...curriculum!, chapters: updated });
             setStatus(AppStatus.CURRICULUM_MAP);
          }} /></div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.LOADING) return (
    <ScreenWrapper className="items-center justify-center bg-[#0F172A] p-12 text-center">
      <div className="relative mb-10"><div className="w-24 h-24 border-[6px] border-slate-800 border-t-cyan-400 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-brain text-cyan-400 text-2xl animate-pulse"></i></div></div>
      <h2 className="font-black text-white text-3xl mb-4 tracking-tight">Procesando Conocimiento</h2>
      <p className="text-slate-400 text-base max-w-sm mx-auto font-medium leading-relaxed">Gemini 3 Pro está analizando tu contenido (incluyendo video) para diseñar acertijos y desafíos únicos.</p>
    </ScreenWrapper>
  );

  return null;
};

export default App;
