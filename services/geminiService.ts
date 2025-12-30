
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

const extractJSON = (text: string): string => {
  let clean = text.trim();
  if (clean.includes('```')) {
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      clean = match[1];
    }
  }
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
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `Eres un Experto en Gamificación Educativa. 
  Tu misión es convertir el material proporcionado en un currículo de 6 capítulos para un escape room.
  Usa ÚNICAMENTE la información del contexto o el archivo proporcionado.
  Idioma: Español. Responde solo con JSON puro.`;

  const userPrompt = `Analiza este material sobre "${topic}": "${sourceContent.substring(0, 15000)}".
  Genera un objeto JSON:
  {
    "topic": "${topic}",
    "chapters": [
      { "id": 1, "title": "Título del Capítulo", "description": "Breve descripción", "topics": ["punto1", "punto2"] }
    ]
  }
  Crea exactamente 6 capítulos basados en el contenido.`;

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
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanJSON = extractJSON(text);
    return JSON.parse(cleanJSON);
  } catch (error: any) {
    console.error("Curriculum generation failed:", error);
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
  const numLevels = isTrialMode ? 4 : 6;

  const systemInstruction = `Eres un Maestro de Acertijos. Genera un juego de escape room de ${numLevels} niveles.
  IMPORTANTE: Todos los desafíos deben basarse estrictamente en la información sobre "${chapter.title}" del material proporcionado.
  Idioma: Español. Responde solo con un ARRAY JSON.`;

  const userPrompt = `Genera un array de ${numLevels} objetos JSON para el capítulo "${chapter.title}".
  Material de referencia: ${sourceContent.substring(0, 5000)}.
  Estructura de cada objeto:
  {
    "id": número,
    "category": "Tipo de desafío",
    "scenicDescription": "Ambientación corta",
    "riddle": "El acertijo o pregunta técnica",
    "options": ["opción 1", "opción 2", "opción 3", "opción 4"],
    "correctAnswer": "la opción correcta exacta",
    "hints": ["pista 1", "pista 2", "pista 3"],
    "explanation": "Por qué es correcta",
    "knowledgeSnippet": "Dato curioso o clave",
    "congratulationMessage": "¡Genial!"
  }`;

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
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanJSON = extractJSON(text);
    const levels = JSON.parse(cleanJSON);
    return Array.isArray(levels) ? levels : [];
  } catch (error: any) {
    console.error("Levels generation failed:", error);
    throw error;
  }
}
