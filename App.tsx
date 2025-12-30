
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('pdf');
  const [inputValue, setInputValue] = useState('');
  const [topic, setTopic] = useState('');
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(null);
  const [isKeyReady, setIsKeyReady] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyReady(hasKey);
      } else {
        // En Netlify, dependemos de la variable de entorno
        setIsKeyReady(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Según las reglas, asumimos éxito y procedemos
        setIsKeyReady(true);
        setError('');
      } catch (e) {
        console.error("Error al abrir selector de llave", e);
      }
    } else {
      setError("Este botón solo funciona dentro de Google AI Studio. En Netlify, configura la variable API_KEY en tu panel de control.");
    }
  };

  const handleStartMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKeyReady) {
      setError("El motor de IA no está conectado.");
      return;
    }
    
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
        setError("La llave API ha expirado o no es válida. Por favor, conéctala de nuevo.");
      } else {
        setError("Error al procesar el material. Revisa tu conexión.");
      }
      setStatus(AppStatus.IDLE);
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
      setError("Error al cargar los niveles del capítulo.");
      setStatus(AppStatus.CURRICULUM_MAP);
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === AppStatus.AUTH) {
    return (
      <ScreenWrapper className="items-center justify-center bg-slate-900 p-6">
        <div className="max-w-md w-full glass p-10 rounded-[3rem] text-center border-none shadow-2xl relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF6B6B] to-indigo-600"></div>
          
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white text-3xl shadow-xl shadow-indigo-100 rotate-3">
            <i className="fas fa-bolt"></i>
          </div>
          
          <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">EduEscape Pro</h2>
          <p className="text-slate-400 text-sm mb-10 font-medium">El motor de IA más avanzado para tus clases.</p>
          
          <div className="space-y-4">
            {!isKeyReady ? (
              <div className="space-y-4 animate-slide-up">
                <Button onClick={handleOpenKeyDialog} className="w-full py-5 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-transform">
                   <i className="fas fa-plug mr-2"></i> CONECTAR MOTOR IA
                </Button>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 text-left leading-relaxed">
                   <p className="mb-2 font-bold text-slate-700"><i className="fas fa-info-circle mr-1"></i> Información importante:</p>
                   Para usar Gemini 3 Pro, debes seleccionar una API Key de un proyecto con facturación (Google ofrece un generoso nivel gratuito). 
                   <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-600 font-bold underline ml-1">Más info aquí.</a>
                </div>
                {error && <p className="text-[10px] text-rose-500 font-bold uppercase">{error}</p>}
              </div>
            ) : (
              <div className="animate-fade">
                <div className="mb-6 flex items-center justify-center gap-2 text-green-500 font-black text-xs uppercase tracking-widest bg-green-50 py-2 rounded-full">
                  <i className="fas fa-check-circle"></i> Motor Listo para la Aventura
                </div>
                <Button onClick={() => setStatus(AppStatus.IDLE)} className="w-full py-5 bg-[#FF6B6B] text-white shadow-xl shadow-rose-100">
                  ENTRAR AL PANEL <i className="fas fa-arrow-right ml-2"></i>
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // ... (el resto del componente IDLE, CURRICULUM_MAP, PLAYING y LOADING se mantienen igual que en la versión anterior)
  
  if (status === AppStatus.IDLE) {
    return (
      <ScreenWrapper className="items-center justify-center p-4 bg-white">
        <div className="max-w-xl w-full glass p-8 rounded-[2rem] text-center border-2 border-slate-200 relative">
          <button onClick={() => setStatus(AppStatus.AUTH)} className="absolute top-4 left-6 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase">
             <i className="fas fa-arrow-left mr-1"></i> Cambiar Motor
          </button>
          <header className="mb-8 mt-4">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Prepara tu Clase</h1>
            <p className="text-slate-400 text-sm">Sube el material para transformar el conocimiento.</p>
          </header>
          
          <form onSubmit={handleStartMission} className="space-y-6">
             <div className="flex justify-center bg-slate-100 p-1 rounded-xl gap-1 mb-4 w-fit mx-auto">
                <button type="button" onClick={() => setSourceType('pdf')} className={`px-4 py-2 rounded-lg font-bold text-xs ${sourceType === 'pdf' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>ARCHIVO PDF</button>
                <button type="button" onClick={() => setSourceType('text')} className={`px-4 py-2 rounded-lg font-bold text-xs ${sourceType === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>PEGAR TEXTO</button>
             </div>

             {sourceType === 'pdf' ? (
              <div onClick={() => fileInputRef.current?.click()} className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 cursor-pointer hover:border-[#FF6B6B] transition-colors">
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setSelectedFileData({ data: (reader.result as string).split(',')[1], mimeType: file.type });
                    setTopic(file.name.replace('.pdf', ''));
                  };
                  reader.readAsDataURL(file);
                }} />
                <i className="fas fa-file-pdf text-3xl text-slate-300 mb-2"></i>
                <p className="font-bold text-slate-500 truncate px-4">{topic || "Selecciona tu PDF educativo"}</p>
              </div>
             ) : (
                <textarea required value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Escribe o pega aquí el contenido de la lección..." className="w-full h-32 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-[#4ECDC4] text-sm" />
             )}

             <Button type="submit" disabled={isProcessing || (!selectedFileData && !inputValue)} className="w-full py-4 bg-[#FF6B6B] text-white font-bold rounded-xl shadow-lg border-none">
               {isProcessing ? "TRANSFORMANDO CON GEMINI PRO..." : "¡GENERAR ESCAPE ROOM!"}
             </Button>
             
             {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
          </form>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.CURRICULUM_MAP && curriculum) {
    return (
      <ScreenWrapper className="p-6 bg-slate-50">
        <div className="max-w-4xl w-full mx-auto h-full flex flex-col">
          <header className="mb-8 flex justify-between items-center">
            <div className="overflow-hidden">
                <p className="text-[10px] font-black text-[#FF6B6B] uppercase tracking-[0.2em] mb-1">Proyecto Educativo con IA</p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 truncate pr-4">{topic}</h1>
            </div>
            <button onClick={() => setStatus(AppStatus.AUTH)} className="text-xs font-bold text-slate-400 bg-white px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">SALIR</button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto custom-scroll pb-10">
            {curriculum.chapters.map((chapter) => (
              <div key={chapter.id} onClick={() => startChapter(chapter)} className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${chapter.status === 'locked' ? 'bg-slate-100 border-transparent opacity-40 cursor-not-allowed' : 'bg-white border-white shadow-md cursor-pointer hover:border-[#FF6B6B]'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl ${chapter.status === 'completed' ? 'bg-green-400' : (chapter.status === 'locked' ? 'bg-slate-300' : 'bg-[#FF6B6B]')}`}>
                  <i className={`fas ${chapter.status === 'locked' ? 'fa-lock' : (chapter.status === 'completed' ? 'fa-check' : 'fa-star')}`}></i>
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-black text-slate-800 truncate">{chapter.title}</h3>
                  <p className="text-slate-400 text-xs line-clamp-1">{chapter.description}</p>
                </div>
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
        <nav className="h-14 px-6 flex justify-between items-center border-b border-slate-100 shrink-0">
           <span className="font-bold text-xs text-slate-500 truncate pr-4"><i className="fas fa-bookmark mr-2 text-indigo-400"></i> {activeChapter?.title}</span>
           <button onClick={() => setStatus(AppStatus.CURRICULUM_MAP)} className="text-[10px] font-bold text-[#FF6B6B] uppercase shrink-0 hover:underline">Volver al Mapa</button>
        </nav>
        <div className="flex-grow overflow-hidden">
          <EscapeRoom levels={levels} onFinish={() => {
             const updated = curriculum!.chapters.map(c => {
               if (c.id === activeChapter?.id) return { ...c, status: 'completed' as const };
               if (c.id === (activeChapter?.id || 0) + 1) return { ...c, status: 'available' as const };
               return c;
             });
             setCurriculum({ ...curriculum!, chapters: updated });
             setStatus(AppStatus.CURRICULUM_MAP);
          }} />
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.LOADING) return (
    <ScreenWrapper className="items-center justify-center bg-white p-8 text-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-[#FF6B6B] rounded-full animate-spin mb-6 mx-auto"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-brain text-slate-200 text-sm"></i>
        </div>
      </div>
      <p className="font-black text-slate-800 text-xl">IA Analizando el Contenido...</p>
      <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Estamos usando Gemini 3 Pro para crear una aventura única y desafiante.</p>
    </ScreenWrapper>
  );

  return null;
};

export default App;
