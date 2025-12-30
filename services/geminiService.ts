
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

const extractJSON = (text: string): string => {
  let clean = text.trim();
  
  // Eliminar prefijos comunes que la IA a veces añade a pesar de las instrucciones
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```/, "");
  }
  
  if (clean.endsWith("```")) {
    clean = clean.replace(/```$/, "");
  }

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');

  // Determinar si es un objeto o un array buscando el primer delimitador válido
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace !== -1) return clean.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1) {
    if (lastBracket !== -1) return clean.substring(firstBracket, lastBracket + 1);
  }
  
  return clean.trim();
};

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Usamos gemini-3-flash-preview por su gran capacidad de procesamiento de documentos y video
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `Eres un Experto en Diseño Curricular y Gamificación. 
  Tu tarea es extraer el conocimiento más relevante del material adjunto (PDF, Video o Texto) y organizarlo en 6 capítulos lógicos para un juego de escape room.
  
  REGLAS ESTRICTAS:
  1. Idioma: Español.
  2. Formato: ÚNICAMENTE JSON puro.
  3. No añadidas explicaciones fuera del JSON.
  4. Si es un video, analiza el audio y las imágenes.
  5. Si es un PDF, lee todo el texto disponible.`;

  const userPrompt = `Analiza el material sobre "${topic}" proporcionado en los archivos/texto adjuntos.
  Crea un plan de 6 capítulos.
  
  ESTRUCTURA REQUERIDA:
  {
    "topic": "${topic}",
    "chapters": [
      { "id": 1, "title": "Título del Capítulo", "description": "Descripción de lo que se aprenderá", "topics": ["tema 1", "tema 2"] }
    ]
  }`;

  try {
    const parts: any[] = [];
    
    // El orden de las partes puede influir: primero el contenido pesado, luego la instrucción
    if (mediaFile) {
      parts.push({
        inlineData: {
          data: mediaFile.data,
          mimeType: mediaFile.mimeType
        }
      });
    }
    
    parts.push({ text: sourceContent ? `CONTENIDO DE TEXTO ADICIONAL: ${sourceContent}\n\n${userPrompt}` : userPrompt });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanJSON = extractJSON(text);
    const parsed = JSON.parse(cleanJSON);
    
    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error("La respuesta de la IA no contiene capítulos válidos.");
    }
    
    return parsed;
  } catch (error: any) {
    console.error("Gemini Curriculum Error:", error);
    throw error;
  }
}

export async function generateChapterLevels(
  topic: string,
  chapter: Chapter,
  sourceContent: string,
  mediaFile?: FileData,
  isTrialMode: boolean = false
): Promise<GameLevel[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  const numLevels = isTrialMode ? 3 : 5;

  const systemInstruction = `Eres un Maestro de Acertijos Educativos. 
  Genera exactamente ${numLevels} niveles de juego para el capítulo "${chapter.title}".
  Cada nivel debe ser un desafío basado en el contenido técnico del material adjunto.
  
  REGLAS:
  1. Los acertijos deben ser inteligentes y educativos.
  2. Idioma: Español.
  3. Formato: ARRAY de objetos JSON.`;

  const userPrompt = `Basándote en el material proporcionado, genera ${numLevels} desafíos para el tema: "${chapter.title}".
  
  FORMATO DE CADA OBJETO:
  {
    "id": número,
    "category": "Tipo de Desafío",
    "scenicDescription": "Ambientación breve",
    "riddle": "El acertijo o pregunta",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correctAnswer": "La opción exacta",
    "hints": ["Pista 1", "Pista 2", "Pista 3"],
    "explanation": "Explicación educativa",
    "knowledgeSnippet": "Dato clave recordable",
    "congratulationMessage": "Mensaje de éxito"
  }`;

  try {
    const parts: any[] = [];
    
    if (mediaFile) {
      parts.push({
        inlineData: {
          data: mediaFile.data,
          mimeType: mediaFile.mimeType
        }
      });
    }

    parts.push({ text: `CAPÍTULO ACTUAL: ${chapter.title}. TEMAS: ${chapter.topics.join(", ")}.\n\n${userPrompt}` });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanJSON = extractJSON(text);
    const levels = JSON.parse(cleanJSON);
    
    return Array.isArray(levels) ? levels : [];
  } catch (error: any) {
    console.error("Gemini Levels Error:", error);
    throw error;
  }
}
