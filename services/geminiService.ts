
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

  const systemInstruction = `Eres un experto en educación y gamificación.
  Tu misión es analizar el contenido proporcionado (que puede ser un PDF, un VIDEO o un TEXTO) y estructurar un plan de estudio de 6 capítulos para un juego.
  Extrae los puntos clave más importantes.
  Responde ÚNICAMENTE en formato JSON en español.`;

  const userPrompt = `Analiza el material sobre "${topic}". 
  ${sourceContent ? `Texto proporcionado: "${sourceContent.substring(0, 10000)}"` : 'Por favor, analiza el archivo adjunto (PDF o Video).'}
  
  Genera un objeto JSON con esta estructura exacta:
  {
    "topic": "${topic}",
    "chapters": [
      { "id": 1, "title": "Nombre del capítulo", "description": "Breve resumen", "topics": ["punto clave 1", "punto clave 2"] }
    ]
  }
  Deben ser exactamente 6 capítulos.`;

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
    console.error("Critical error in curriculum generation:", error);
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

  const systemInstruction = `Eres un Maestro de Escape Rooms. Tu tarea es generar ${numLevels} niveles de juego basados en el tema "${chapter.title}".
  Debes basar las preguntas en la información del PDF, VIDEO o TEXTO proporcionado.
  Idioma: Español. Responde solo con un ARRAY JSON.`;

  const userPrompt = `Genera un array de ${numLevels} niveles JSON para el capítulo "${chapter.title}".
  Cada objeto debe contener: id, category, scenicDescription, riddle, options(4), correctAnswer, hints(3), explanation, knowledgeSnippet, congratulationMessage.
  Asegúrate de que las preguntas sean desafiantes y educativas.`;

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
    console.error("Critical error in levels generation:", error);
    throw error;
  }
}
