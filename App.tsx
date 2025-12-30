
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, GameLevel, SourceType, FileData, Chapter, Curriculum, UserProfile } from './types';
import { generateCurriculum, generateChapterLevels } from './services/geminiService';
import { Button } from './components/Button';
import { EscapeRoom } from './components/EscapeRoom';

const ScreenWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`h-screen w-full flex flex-col overflow-hidden relative ${className}`}>
    {children}
  </div>
);

const ApiKeyOverlay: React.FC<{ onSelect: () => void, onClose: () => void }> = ({ onSelect, onClose }) => (
  <div className="absolute inset-0 z-[200] bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
    <div className="max-w-md w-full glass p-8 rounded-[3rem] text-center border-4 border-[#FF6B6B]/20 shadow-2xl">
      <i className="fas fa-plug text-amber-500 text-4xl mb-4"></i>
      <h3 className="text-2xl font-black text-slate-800 mb-2">Conexión Requerida</h3>
      <p className="text-slate-500 mb-6 text-sm leading-relaxed">Para generar aventuras personalizadas con IA, necesitamos establecer una conexión segura con Google Cloud.</p>
      <Button onClick={onSelect} className="w-full bg-[#FF6B6B] text-white py-4 uppercase font-black shadow-lg">CONFIGURAR CONEXIÓN</Button>
      <button onClick={onClose} className="mt-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">CERRAR</button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.AUTH);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('pdf');
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [isGuestTrial, setIsGuestTrial] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [trialPassword, setTrialPassword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [topic, setTopic] = useState('');
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initApp = () => {
      const savedUser = localStorage.getItem('edu_escape_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setStatus(AppStatus.IDLE);
          if (userData.medicalId === 'AUDIT-MODE') {
            setIsGuestTrial(true);
            setIsTrialMode(true);
          }
        } catch (e) {
          localStorage.clear();
        }
      }
    };
    initApp();
  }, []);

  const handleSelectApiKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      setError('');
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setCurriculum(null);
    setStatus(AppStatus.AUTH);
  };

  const handleCreateCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Verificación proactiva de API KEY para evitar bloqueos en Netlify
    if (!process.env.API_KEY) {
      setNeedsApiKey(true);
      return;
    }

    setIsProcessing(true);
    setStatus(AppStatus.LOADING);

    try {
      const syllabus = await generateCurriculum(
        topic || "Aventura de Aprendizaje",
        inputValue,
        sourceType === 'search' || sourceType === 'youtube',
        selectedFileData || undefined
      );
      
      if (!syllabus || !syllabus.chapters) throw new Error("Respuesta inválida");

      syllabus.chapters = syllabus.chapters.map((c, i) => ({
        ...c,
        status: i === 0 ? 'available' : 'locked'
      }));

      setCurriculum(syllabus);
      setTopic(syllabus.topic);
      setStatus(AppStatus.CURRICULUM_MAP);
    } catch (err: any) {
      console.error("Error en generación:", err);
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API_KEY")) {
        setNeedsApiKey(true);
        setStatus(AppStatus.IDLE);
      } else {
        setError("El Oráculo no pudo procesar este material. Intenta con un texto más breve o revisa el PDF.");
        setStatus(AppStatus.IDLE);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startChapter = async (chapter: Chapter) => {
    if (chapter.status === 'locked' || !process.env.API_KEY) {
      if (!process.env.API_KEY) setNeedsApiKey(true);
      return;
    }
    setError('');
    setIsProcessing(true);
    setStatus(AppStatus.LOADING);
    setActiveChapter(chapter);

    try {
      const chapterLevels = await generateChapterLevels(
        topic,
        chapter,
        inputValue,
        sourceType === 'search' || sourceType === 'youtube',
        selectedFileData || undefined,
        isTrialMode
      );
      setLevels(chapterLevels);
      setStatus(AppStatus.PREVIEW);
    } catch (err: any) {
      console.error("Error en niveles:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setNeedsApiKey(true);
        setStatus(AppStatus.IDLE);
      } else {
        setError("Fallo al construir la sala. Prueba reintentando.");
        setStatus(AppStatus.ERROR);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === AppStatus.AUTH) {
    return (
      <ScreenWrapper className="items-center justify-center bg-[#F7FFF7] p-6">
        <div className="max-w-md w-full glass p-8 md:p-12 rounded-[4rem] text-center border-4 border-[#FF6B6B]/20 shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#FF6B6B] to-[#FFD93D] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
            <i className="fas fa-magic text-white text-3xl"></i>
          </div>
          <h2 className="text-4xl font-fredoka font-black text-[#FF6B6B] mb-2 uppercase tracking-tighter">EduEscape</h2>
          <p className="text-[#4ECDC4] font-bold text-sm mb-8 italic">¡Aprender es la mayor aventura!</p>
          
          {!showPasswordPrompt ? (
            <div className="space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const userData: UserProfile = {
                  fullName: formData.get('fullName') as string,
                  medicalId: formData.get('medicalId') as string,
                  specialtyPreference: 'Estudiante',
                };
                setUser(userData);
                setIsGuestTrial(false);
                localStorage.setItem('edu_escape_user', JSON.stringify(userData));
                setStatus(AppStatus.IDLE);
              }} className="space-y-4 text-left">
                <input name="fullName" required placeholder="Nombre de Héroe" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-[#FF6B6B] transition-all" />
                <input name="medicalId" required placeholder="ID de Jugador" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-[#FF6B6B] transition-all" />
                <Button type="submit" className="w-full py-5 text-xl btn-joy bg-[#FF6B6B] text-white uppercase font-black">ENTRAR AL JUEGO</Button>
              </form>
              <button onClick={() => setShowPasswordPrompt(true)} className="w-full text-[#6C5CE7] font-black uppercase text-[11px] tracking-widest mt-4">MODO INVITADO</button>
            </div>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (trialPassword === 'Helena2016') {
                const trialUser = { fullName: 'Invitado', medicalId: 'AUDIT-MODE', specialtyPreference: 'Auditoría' };
                setUser(trialUser);
                setIsGuestTrial(true);
                setIsTrialMode(true);
                localStorage.setItem('edu_escape_user', JSON.stringify(trialUser));
                setStatus(AppStatus.IDLE);
                setShowPasswordPrompt(false);
                setTrialPassword('');
              } else {
                setError('Código incorrecto.');
                setTrialPassword('');
              }
            }} className="space-y-6 text-left">
              <div className="p-6 bg-white rounded-[2rem] border-4 border-[#6C5CE7]">
                <input type="password" autoFocus required value={trialPassword} onChange={(e) => setTrialPassword(e.target.value)} placeholder="Código secreto..." className="w-full bg-[#F7FFF7] border-none text-center text-xl font-black outline-none" />
              </div>
              <div className="flex gap-4">
                <Button type="submit" className="flex-grow py-5 font-black btn-joy bg-[#6C5CE7] text-white uppercase">VALIDAR</Button>
                <Button variant="ghost" type="button" onClick={() => setShowPasswordPrompt(false)} className="px-6 rounded-2xl bg-slate-100"><i className="fas fa-times"></i></Button>
              </div>
            </form>
          )}
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.IDLE) {
    return (
      <ScreenWrapper className="items-center justify-center p-6 bg-transparent">
        {needsApiKey && <ApiKeyOverlay onSelect={handleSelectApiKey} onClose={() => setNeedsApiKey(false)} />}
        <div className="max-w-4xl w-full h-full max-h-[90vh] glass p-8 md:p-12 rounded-[5rem] flex flex-col relative overflow-hidden shadow-2xl border-4 border-white animate-in slide-in-from-bottom-12 duration-500">
          {isGuestTrial && (
            <div className="absolute top-0 left-0 w-full py-2 bg-[#FFD93D] text-amber-900 text-[10px] font-black uppercase tracking-[0.4em] text-center z-50">
              MODO PRUEBA ACTIVO
            </div>
          )}
          
          <div className="flex justify-between items-center mb-8 relative z-50">
             <div className="bg-white px-4 py-2 rounded-full shadow-sm border-2 border-slate-100 flex items-center gap-2">
               <div className="w-4 h-4 rounded-full bg-[#4ECDC4]"></div>
               <span className="text-[11px] text-[#6C5CE7] font-black uppercase tracking-widest">{user?.fullName}</span>
             </div>
             <button onClick={logout} className="text-slate-300 font-black text-[10px] uppercase hover:text-[#FF6B6B] transition-colors">SALIR</button>
          </div>

          <div className="text-center mb-8 flex-shrink-0">
            <h1 className="text-6xl md:text-7xl font-cinzel font-black shimmer-text leading-none mb-2">EduEscape</h1>
            <p className="text-slate-400 text-base font-bold italic">Selecciona tu material de estudio.</p>
          </div>

          <form onSubmit={handleCreateCurriculum} className="flex-grow flex flex-col justify-center space-y-8 max-w-2xl mx-auto w-full relative z-10 overflow-hidden">
            <div className="flex justify-center gap-3 flex-wrap flex-shrink-0">
              {(['pdf', 'youtube', 'search', 'text'] as SourceType[]).map((type) => (
                <button 
                  key={type} 
                  type="button" 
                  onClick={() => { setSourceType(type); setError(''); setSelectedFileData(null); setTopic(''); }}
                  className={`px-6 py-2 rounded-xl font-black text-[10px] border-2 transition-all ${sourceType === type ? 'bg-[#FF6B6B] border-white text-white shadow-lg scale-105' : 'bg-white border-slate-50 text-slate-300'}`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex-grow overflow-hidden flex flex-col">
              {sourceType === 'pdf' ? (
                <div onClick={() => fileInputRef.current?.click()} className="group flex-grow border-4 border-dashed border-[#F7FFF7] rounded-[3rem] p-8 text-center cursor-pointer hover:border-[#4ECDC4] bg-white shadow-inner flex flex-col items-center justify-center transition-all">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     // Protección contra archivos gigantes que traban el navegador
                     if (file.size > 10 * 1024 * 1024) {
                       setError("El PDF es demasiado grande (máx 10MB)");
                       return;
                     }
                     const reader = new FileReader();
                     reader.onload = () => {
                       const base64 = (reader.result as string).split(',')[1];
                       setSelectedFileData({ data: base64, mimeType: file.type });
                       setTopic(file.name.replace(/\.[^/.]+$/, ""));
                       setError('');
                     };
                     reader.readAsDataURL(file);
                  }} />
                  <div className="w-16 h-16 bg-[#6C5CE7] text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <i className="fas fa-file-upload text-2xl"></i>
                  </div>
                  <p className="text-xl font-black text-slate-800 line-clamp-2 px-4">{topic || "Carga tu PDF aquí"}</p>
                  {error && <p className="text-red-500 text-[10px] font-black mt-2 uppercase">{error}</p>}
                </div>
              ) : (
                <textarea required value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Contenido o enlace..." className="flex-grow bg-[#F7FFF7] border-2 border-white rounded-[2rem] px-6 py-4 text-lg shadow-inner outline-none focus:border-[#4ECDC4] transition-all resize-none" />
              )}
            </div>

            <Button type="submit" disabled={sourceType === 'pdf' && !selectedFileData} className="w-full py-6 text-2xl font-black rounded-[2rem] bg-[#FF6B6B] text-white shadow-xl btn-joy flex-shrink-0 uppercase">
              GENERAR DESAFÍO
            </Button>
          </form>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.CURRICULUM_MAP && curriculum) {
    return (
      <ScreenWrapper className="bg-transparent p-6">
        {needsApiKey && <ApiKeyOverlay onSelect={handleSelectApiKey} onClose={() => setNeedsApiKey(false)} />}
        <div className="max-w-6xl w-full mx-auto h-full flex flex-col">
          <header className="flex justify-between items-center mb-8 flex-shrink-0 relative z-50">
            <div className="text-left">
              <span className="bg-[#FFD93D] px-4 py-1 rounded-full font-black text-[10px] uppercase shadow-sm">MAPA DE LA AVENTURA</span>
              <h1 className="text-4xl md:text-5xl font-cinzel font-black text-slate-800 mt-2 truncate max-w-md">{topic}</h1>
            </div>
            <Button onClick={() => setStatus(AppStatus.IDLE)} variant="secondary" className="rounded-xl px-4 py-3 font-black text-[10px] uppercase border-2 shadow-sm">CAMBIAR TEMA</Button>
          </header>

          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scroll pb-6">
            {curriculum.chapters.map((chapter) => (
              <div 
                key={chapter.id} 
                onClick={() => startChapter(chapter)}
                className={`group p-8 border-4 rounded-[3rem] transition-all relative flex flex-col h-full bg-white ${
                  chapter.status === 'locked' ? 'opacity-40 grayscale cursor-not-allowed' : 'shadow-xl cursor-pointer hover:border-[#FF6B6B] hover:-translate-y-2'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 shadow-sm ${chapter.status === 'completed' ? 'bg-[#4ECDC4] text-white' : 'bg-[#FF6B6B] text-white'}`}>
                  <i className={`fas ${chapter.status === 'locked' ? 'fa-lock' : 'fa-star'}`}></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{chapter.title}</h3>
                <p className="text-slate-400 font-bold italic text-sm line-clamp-3 flex-grow">{chapter.description}</p>
                {chapter.status === 'available' && <span className="text-[10px] font-black text-[#FF6B6B] text-right uppercase mt-4">ENTRAR <i className="fas fa-play ml-1"></i></span>}
              </div>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.PREVIEW && activeChapter) {
    return (
      <ScreenWrapper className="items-center justify-center p-6">
        <div className="max-w-2xl w-full glass p-10 md:p-16 rounded-[5rem] text-center border-4 border-white shadow-2xl animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-[#FF6B6B] text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
              <i className="fas fa-scroll text-4xl"></i>
           </div>
           <span className="bg-[#4ECDC4]/20 text-[#4ECDC4] px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-4 inline-block tracking-widest">OBJETIVO DE MISIÓN</span>
           <h2 className="text-4xl md:text-5xl font-cinzel font-black text-slate-800 mb-6 leading-tight uppercase">{activeChapter.title}</h2>
           <div className="bg-[#F7FFF7] p-8 rounded-[3rem] border-2 border-dashed border-[#4ECDC4]/30 mb-10">
              <p className="text-slate-500 text-lg font-bold italic leading-relaxed">
                "{activeChapter.description}"
              </p>
           </div>
           <div className="flex flex-col gap-4">
              <Button onClick={() => setStatus(AppStatus.PLAYING)} className="w-full py-6 text-2xl bg-[#FF6B6B] text-white rounded-[2rem] shadow-xl btn-joy uppercase font-black">
                ¡INICIAR MISIÓN!
              </Button>
              <button onClick={() => setStatus(AppStatus.CURRICULUM_MAP)} className="text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-[#6C5CE7] transition-colors">
                VOLVER AL MAPA
              </button>
           </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.PLAYING && activeChapter) {
    return (
      <ScreenWrapper className="bg-white">
        <nav className="h-[80px] px-8 glass flex justify-between items-center flex-shrink-0 z-[100] border-b-4 border-[#F7FFF7] shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
               <i className="fas fa-rocket"></i>
             </div>
             <div className="hidden sm:block">
               <span className="text-[9px] text-[#4ECDC4] font-black uppercase tracking-widest">{topic}</span>
               <h3 className="text-lg font-cinzel font-black text-slate-800 leading-none">{activeChapter.title}</h3>
             </div>
          </div>
          <button onClick={() => setStatus(AppStatus.CURRICULUM_MAP)} className="text-slate-400 font-black text-[10px] uppercase border-2 border-slate-50 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">MAPA</button>
        </nav>
        <div className="flex-grow overflow-hidden relative">
          <EscapeRoom levels={levels} onFinish={() => {
            const updated = curriculum!.chapters.map(c => {
               if (c.id === activeChapter.id) return { ...c, status: 'completed' as const };
               if (c.id === activeChapter.id + 1 && c.status === 'locked') return { ...c, status: 'available' as const };
               return c;
            });
            setCurriculum({ ...curriculum!, chapters: updated });
            setStatus(activeChapter.id === curriculum!.chapters.length ? AppStatus.COMPLETED : AppStatus.CURRICULUM_MAP);
          }} />
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.LOADING) return (
    <ScreenWrapper className="items-center justify-center text-center p-12 bg-[#F7FFF7]">
      <div className="w-20 h-20 border-8 border-[#FFE66D] border-t-[#FF6B6B] rounded-full animate-spin shadow-xl mb-8"></div>
      <h2 className="text-4xl font-cinzel font-black text-[#FF6B6B] mb-2 uppercase">CREANDO MUNDO</h2>
      <p className="text-[#4ECDC4] text-xs font-black uppercase tracking-[0.4em] animate-pulse mb-12">Analizando el saber...</p>
      
      {/* Botón de escape por si la red falla */}
      <button 
        onClick={() => setStatus(AppStatus.IDLE)} 
        className="mt-8 px-6 py-2 bg-white rounded-full text-[10px] font-black uppercase text-slate-400 border-2 border-slate-100 hover:text-red-400 transition-colors"
      >
        CANCELAR CARGA
      </button>
    </ScreenWrapper>
  );

  return (
    <ScreenWrapper className="items-center justify-center text-center p-12">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
        <i className="fas fa-ghost text-5xl text-red-400"></i>
      </div>
      <h2 className="text-4xl font-cinzel font-black text-slate-800 mb-4 uppercase leading-none">HA OCURRIDO UN ERROR</h2>
      <p className="text-slate-400 mb-8 text-xl font-bold italic">{error || "Lo sentimos, el Oráculo está descansando."}</p>
      <Button onClick={() => setStatus(AppStatus.IDLE)} className="px-8 py-4 bg-[#4ECDC4] text-white rounded-xl uppercase font-black shadow-lg">VOLVER AL INICIO</Button>
    </ScreenWrapper>
  );
};

export default App;
