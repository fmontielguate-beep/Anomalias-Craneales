
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, GameLevel, SourceType, FileData, Chapter, Curriculum, UserProfile } from './types';
import { generateCurriculum, generateChapterLevels } from './services/geminiService';
import { Button } from './components/Button';
import { EscapeRoom } from './components/EscapeRoom';

const MOCK_CURRICULUM: Curriculum = {
  topic: "El Sistema Solar (Ejemplo)",
  chapters: [
    { id: 1, title: "El Sol: Nuestra Estrella", description: "Descubre el motor de luz de nuestro sistema.", status: 'available', topics: ["Temperatura del sol", "Luz solar"] },
    { id: 2, title: "Los Planetas Rocosos", description: "Mercurio, Venus, Tierra y Marte.", status: 'locked', topics: ["Planetas interiores"] },
    { id: 3, title: "Gigantes de Gas", description: "Júpiter y Saturno, los reyes del tamaño.", status: 'locked', topics: ["Planetas exteriores"] },
    { id: 4, title: "Más allá de Plutón", description: "Cometas y el cinturón de Kuiper.", status: 'locked', topics: ["Espacio profundo"] }
  ]
};

const MOCK_LEVELS: GameLevel[] = [
  {
    id: 1,
    category: "Geografía Mundial",
    riddle: "¿Cuál es el río más largo del mundo?",
    scenicDescription: "Para entrar en la nave, debes demostrar que conoces nuestro planeta.",
    options: ["Nilo", "Amazonas", "Misisipi", "Danubio"],
    correctAnswer: "Amazonas",
    hints: ["Está en Sudamérica.", "Tiene la mayor cuenca hidrográfica.", "Atraviesa la selva más grande."],
    explanation: "El Amazonas es el río más largo y caudaloso, vital para el clima global.",
    knowledgeSnippet: "Contiene el 20% del agua dulce líquida de la Tierra.",
    congratulationMessage: "¡Peaje superado! Bienvenido a bordo."
  },
  {
    id: 2,
    category: "Literatura Universal",
    riddle: "¿Quién escribió 'Don Quijote de la Mancha'?",
    scenicDescription: "El sistema de seguridad solicita una clave literaria.",
    options: ["Lope de Vega", "Federico García Lorca", "Miguel de Cervantes", "Quevedo"],
    correctAnswer: "Miguel de Cervantes",
    hints: ["Le llamaban el 'Manco de Lepanto'.", "Es el libro más editado después de la Biblia.", "Nació en Alcalá de Henares."],
    explanation: "Cervantes publicó la primera parte en 1605, revolucionando la novela moderna.",
    knowledgeSnippet: "Se considera la primera novela polifónica.",
    congratulationMessage: "¡Acceso concedido al núcleo del saber!"
  },
  {
    id: 3,
    category: "Astronomía Básica",
    riddle: "¿Cuál es el planeta más cercano al Sol?",
    scenicDescription: "Ya en el espacio, miremos por el telescopio principal.",
    options: ["Venus", "Marte", "Mercurio", "Júpiter"],
    correctAnswer: "Mercurio",
    hints: ["Es pequeño y muy caliente.", "Empieza por M.", "No tiene lunas."],
    explanation: "Mercurio es el primer planeta y orbita muy cerca del Sol.",
    knowledgeSnippet: "Mercurio tarda solo 88 días en dar una vuelta completa al Sol.",
    congratulationMessage: "¡Excelente navegación estelar!"
  },
  {
    id: 4,
    category: "El Sol",
    riddle: "¿Qué proceso genera la energía del Sol?",
    scenicDescription: "Estamos cerca de la corona solar. El calor es intenso.",
    options: ["Combustión", "Fisión Nuclear", "Fusión Nuclear", "Magnetismo"],
    correctAnswer: "Fusión Nuclear",
    hints: ["Átomos de hidrógeno se unen.", "Libera una energía masiva.", "Ocurre en el núcleo."],
    explanation: "La fusión nuclear de hidrógeno en helio es lo que hace brillar a las estrellas.",
    knowledgeSnippet: "El Sol convierte 600 millones de toneladas de hidrógeno en helio cada segundo.",
    congratulationMessage: "¡Soportaste el calor del conocimiento!"
  },
  {
    id: 5,
    category: "Curiosidades Solares",
    riddle: "¿Cuánto tarda la luz del Sol en llegar a la Tierra?",
    scenicDescription: "Última prueba antes de completar este sector.",
    options: ["8 segundos", "8 minutos", "8 horas", "Instantáneo"],
    correctAnswer: "8 minutos",
    hints: ["La luz viaja a 300.000 km/s.", "La distancia es de 150 millones de km.", "Menos de 10 minutos."],
    explanation: "Debido a la gran distancia, vemos el Sol como era hace 8 minutos y 20 segundos.",
    knowledgeSnippet: "Si el Sol se apagara, tardaríamos 8 minutos en enterarnos.",
    congratulationMessage: "¡Capítulo completado con éxito, astronauta!"
  }
];

const ScreenWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`h-screen w-full flex flex-col overflow-hidden relative ${className}`}>
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDemo = () => {
    setIsDemoMode(true);
    setUser({ fullName: "Invitado", medicalId: "DEMO", specialtyPreference: "Demo" });
    setCurriculum(MOCK_CURRICULUM);
    setTopic(MOCK_CURRICULUM.topic);
    setStatus(AppStatus.CURRICULUM_MAP);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFileData({ data: (reader.result as string).split(',')[1], mimeType: file.type });
      setTopic(file.name.replace(/\.[^/.]+$/, ""));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleStartMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue && !selectedFileData) {
        setError("Por favor, sube un PDF o escribe un texto.");
        return;
    }
    setError('');
    setIsProcessing(true);
    setStatus(AppStatus.LOADING);
    try {
      const syllabus = await generateCurriculum(topic || "Lección", inputValue, selectedFileData || undefined);
      syllabus.chapters = syllabus.chapters.map((c, i) => ({ ...c, status: i === 0 ? 'available' : 'locked' }));
      setCurriculum(syllabus);
      setStatus(AppStatus.CURRICULUM_MAP);
    } catch (err: any) {
      setError("Error: No se pudo conectar con el motor de IA. ¿Tienes la clave configurada?");
      setStatus(AppStatus.IDLE);
    } finally {
      setIsProcessing(false);
    }
  };

  const startChapter = async (chapter: Chapter) => {
    if (chapter.status === 'locked' || isProcessing) return;
    if (isDemoMode) {
      setLevels(MOCK_LEVELS);
      setActiveChapter(chapter);
      setStatus(AppStatus.PLAYING);
      return;
    }
    setIsProcessing(true);
    setStatus(AppStatus.LOADING);
    setActiveChapter(chapter);
    try {
      const chapterLevels = await generateChapterLevels(topic, chapter, inputValue, selectedFileData || undefined);
      setLevels(chapterLevels);
      setStatus(AppStatus.PLAYING);
    } catch (err: any) {
      setError(err.message);
      setStatus(AppStatus.CURRICULUM_MAP);
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === AppStatus.AUTH) {
    return (
      <ScreenWrapper className="items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full glass p-10 rounded-[3rem] text-center shadow-2xl border-4 border-white">
          <div className="w-20 h-20 bg-[#FF6B6B] rounded-3xl flex items-center justify-center mx-auto mb-6 text-white text-3xl shadow-lg rotate-3">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2">EduEscape</h2>
          <p className="text-slate-400 text-sm mb-10 font-medium">Aprende con Inteligencia Artificial</p>
          
          <div className="space-y-6">
            <div className="p-6 bg-indigo-50 rounded-3xl border-2 border-indigo-100">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">¿Eres nuevo?</p>
                <Button onClick={startDemo} className="w-full py-4 bg-[#6C5CE7] text-white font-black rounded-2xl shadow-lg border-none hover:scale-105 transition-transform">
                    <i className="fas fa-play-circle mr-2"></i> VER JUEGO DE EJEMPLO
                </Button>
                <p className="text-[10px] text-indigo-300 mt-2 font-bold">Tema: El Sistema Solar (Sin archivos)</p>
            </div>

            <div className="relative flex items-center gap-4 py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="text-[10px] font-black text-slate-300 uppercase">O USA TU MATERIAL</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const name = (new FormData(e.currentTarget).get('name') as string);
              setUser({ fullName: name, medicalId: 'S', specialtyPreference: 'G' });
              setStatus(AppStatus.IDLE);
            }} className="space-y-4">
              <input name="name" required placeholder="Escribe tu nombre..." className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-[#FF6B6B] text-center font-bold" />
              <Button type="submit" className="w-full py-4 bg-white text-[#FF6B6B] border-2 border-[#FF6B6B] font-black rounded-2xl hover:bg-[#FF6B6B] hover:text-white transition-colors">
                SUBIR MIS PROPIOS PDF <i className="fas fa-chevron-right ml-2"></i>
              </Button>
            </form>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.IDLE) {
    return (
      <ScreenWrapper className="items-center justify-center p-6 bg-[#F7FFF7]">
        <div className="max-w-2xl w-full glass p-10 rounded-[4rem] text-center shadow-2xl border-4 border-white">
            <button onClick={() => setStatus(AppStatus.AUTH)} className="absolute top-8 left-8 text-slate-300 hover:text-slate-500 font-bold text-xs uppercase tracking-widest">
                <i className="fas fa-arrow-left mr-2"></i> Volver
            </button>

          <header className="mb-10">
            <div className="inline-block px-4 py-1 bg-[#4ECDC4]/10 text-[#4ECDC4] rounded-full text-[10px] font-black uppercase mb-4 tracking-tighter">Creador de Desafíos</div>
            <h1 className="text-4xl font-black text-slate-800 mb-2">Prepara tu PDF</h1>
            <p className="text-slate-400 font-bold">Sube el contenido que tus alumnos deben aprender.</p>
          </header>
          
          <form onSubmit={handleStartMission} className="space-y-6">
             <div className="flex justify-center bg-slate-100 p-1.5 rounded-2xl gap-1 mb-4 w-fit mx-auto">
                <button type="button" onClick={() => {setSourceType('pdf'); setInputValue('');}} className={`px-6 py-2 rounded-xl font-bold text-xs transition-all ${sourceType === 'pdf' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>ARCHIVO PDF</button>
                <button type="button" onClick={() => {setSourceType('text'); setSelectedFileData(null); setTopic('');}} className={`px-6 py-2 rounded-xl font-bold text-xs transition-all ${sourceType === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>TEXTO COPIADO</button>
             </div>

             {sourceType === 'pdf' ? (
              <div onClick={() => fileInputRef.current?.click()} className="p-12 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 cursor-pointer hover:border-[#FF6B6B] hover:bg-white transition-all group">
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <i className={`fas ${selectedFileData ? 'fa-file-check text-[#4ECDC4]' : 'fa-cloud-upload text-slate-300'} text-2xl`}></i>
                </div>
                <p className="font-black text-slate-500 text-lg">{topic || "Selecciona tu PDF aquí"}</p>
                <p className="text-[10px] text-slate-300 mt-2 font-bold uppercase tracking-widest">Máximo 10MB sugerido</p>
              </div>
             ) : (
              <div className="relative">
                <textarea required value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Pega aquí los apuntes, un artículo o el tema de la clase..." className="w-full h-48 bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 outline-none focus:border-[#4ECDC4] resize-none font-medium shadow-inner" />
                <div className="absolute bottom-6 right-8 text-[10px] font-black text-slate-300 uppercase">Input de Texto</div>
              </div>
             )}

             <Button type="submit" disabled={isProcessing} className="w-full py-6 text-xl bg-[#FF6B6B] text-white font-black rounded-[2rem] shadow-xl shadow-red-100 hover:scale-[1.02] transition-transform">
               {isProcessing ? (
                 <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    PROCESANDO CONTENIDO...
                 </span>
               ) : "¡CREAR MI ESCAPE ROOM!"}
             </Button>
             
             {error && (
               <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-500 animate-shake">
                 <i className="fas fa-exclamation-circle"></i>
                 <p className="text-xs font-black">{error}</p>
               </div>
             )}
          </form>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.CURRICULUM_MAP && curriculum) {
    return (
      <ScreenWrapper className="p-8 items-center bg-slate-50">
        <div className="max-w-4xl w-full">
          <header className="flex justify-between items-end mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white ${isDemoMode ? 'bg-[#6C5CE7]' : 'bg-[#4ECDC4]'}`}>
                    {isDemoMode ? 'MODO DEMO' : 'MI PDF'}
                </span>
                <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">Mapa de Aventura</span>
              </div>
              <h1 className="text-5xl font-black text-slate-800 leading-tight">{topic}</h1>
            </div>
            <button onClick={() => {setStatus(AppStatus.AUTH); setIsDemoMode(false);}} className="bg-white border-2 border-slate-100 text-slate-400 font-black text-xs px-6 py-3 rounded-2xl shadow-sm hover:bg-slate-50">SALIR DEL JUEGO</button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {curriculum.chapters.map((chapter) => (
              <div key={chapter.id} onClick={() => startChapter(chapter)} className={`group p-8 rounded-[3.5rem] border-4 transition-all cursor-pointer flex items-center gap-8 ${chapter.status === 'locked' ? 'bg-slate-200/50 border-transparent opacity-50 grayscale cursor-not-allowed' : 'bg-white border-white shadow-xl hover:border-[#FF6B6B] hover:-translate-y-1'}`}>
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-lg shrink-0 transition-transform group-hover:rotate-6 ${chapter.status === 'completed' ? 'bg-[#4ECDC4]' : 'bg-[#FF6B6B]'}`}>
                  <i className={`fas ${chapter.status === 'locked' ? 'fa-lock' : (chapter.status === 'completed' ? 'fa-check-circle' : 'fa-star-shooting')}`}></i>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{chapter.title}</h3>
                  <p className="text-slate-400 text-sm font-bold leading-snug line-clamp-2 italic">"{chapter.description}"</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 p-8 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-sm italic">"El conocimiento es la única llave que abre todas las puertas."</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (status === AppStatus.PLAYING && activeChapter) {
    return (
      <ScreenWrapper className="bg-white">
        <nav className="h-[70px] px-10 flex justify-between items-center border-b-2 border-slate-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center text-white shadow-sm"><i className="fas fa-book-sparkles"></i></div>
            <div>
              <p className="text-[9px] font-black text-[#FF6B6B] uppercase tracking-widest">Nivel Actual</p>
              <h3 className="font-black text-slate-800">{activeChapter.title}</h3>
            </div>
          </div>
          <button onClick={() => setStatus(AppStatus.CURRICULUM_MAP)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-[10px] px-5 py-2 rounded-xl transition-colors uppercase">Volver al Mapa</button>
        </nav>
        <div className="flex-grow overflow-hidden">
          <EscapeRoom levels={levels} onFinish={() => {
            const updated = curriculum!.chapters.map(c => {
               if (c.id === activeChapter.id) return { ...c, status: 'completed' as const };
               if (c.id === activeChapter.id + 1) return { ...c, status: 'available' as const };
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
    <ScreenWrapper className="items-center justify-center bg-white">
      <div className="relative">
        <div className="w-24 h-24 border-8 border-slate-50 border-t-[#FF6B6B] rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-[#FF6B6B]">
            <i className="fas fa-brain-circuit animate-pulse text-2xl"></i>
        </div>
      </div>
      <h2 className="mt-8 text-2xl font-black text-slate-800 animate-pulse">Generando Desafíos...</h2>
      <p className="text-slate-400 font-bold mt-2">La IA está leyendo tu contenido</p>
    </ScreenWrapper>
  );

  return null;
};

export default App;
