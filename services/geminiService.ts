
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

const extractJSON = (text: string): string => {
  // Elimina bloques de código markdown si existen
  let clean = text.trim();
  if (clean.includes('```')) {
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      clean = match[1];
    }
  }
  // Intenta encontrar el primer '{' y el último '}' o '[' y ']'
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    return clean.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    return clean.substring(firstBracket, lastBracket + 1);
  }
  return clean;
};

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  useSearch: boolean = false,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `Eres un Experto en Gamificación Educativa. 
  Genera un currículo de exactamente 6 capítulos basado en el material proporcionado. 
  Idioma: Español. 
  Formato: JSON puro, sin explicaciones adicionales.`;

  const userPrompt = `Analiza el tema "${topic}" y el contenido: "${sourceContent.substring(0, 10000)}".
  Genera un objeto JSON con esta estructura:
  {
    "topic": "${topic}",
    "chapters": [
      { "id": 1, "title": "Título", "description": "Resumen", "topics": ["tema1", "tema2"] }
    ]
  }
  Crea exactamente 6 capítulos.`;

  try {
    const parts: any[] = [{ text: userPrompt }];
    if (mediaFile) {
      parts.push({
        inlineData: {
          data: mediaFile.data,
          mimeType: mediaFile.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      }
    });

    const text = response.text || "";
    const cleanJSON = extractJSON(text);
    return JSON.parse(cleanJSON);
  } catch (error: any) {
    console.error("Critical Curriculum Error:", error);
    throw error;
  }
}

export async function generateChapterLevels(
  topic: string,
  chapter: Chapter,
  sourceContent: string,
  useSearch: boolean = false,
  mediaFile?: FileData,
  isTrialMode: boolean = false
): Promise<GameLevel[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  const numLevels = isTrialMode ? 5 : 8;

  const systemInstruction = `Eres un Maestro de Acertijos. Genera un juego de escape room de ${numLevels} niveles.
  Niveles 1-2: Cultura General.
  Niveles 3-${numLevels}: Basados específicamente en el tema "${chapter.title}".
  Idioma: Español. Formato: ARRAY JSON.`;

  const userPrompt = `Genera un array de ${numLevels} objetos JSON para el capítulo "${chapter.title}". 
  Campos obligatorios por objeto: id, category, scenicDescription, riddle, options (4 strings), correctAnswer (debe coincidir exactamente con una opción), hints (3 strings), explanation, knowledgeSnippet, congratulationMessage.`;

  try {
    const parts: any[] = [{ text: userPrompt }];
    if (mediaFile) {
      parts.push({
        inlineData: {
          data: mediaFile.data,
          mimeType: mediaFile.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      }
    });

    const text = response.text || "";
    const cleanJSON = extractJSON(text);
    const levels = JSON.parse(cleanJSON);
    
    if (!Array.isArray(levels)) {
       throw new Error("Formato de respuesta inválido: Se esperaba un Array.");
    }

    return levels;
  } catch (error: any) {
    console.error("Critical Levels Error:", error);
    throw error;
  }
}
