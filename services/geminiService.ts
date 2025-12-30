
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

const extractJSON = (text: string): string => {
  let clean = text.trim();
  
  // Limpieza agresiva de bloques de código
  clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").replace(/^```\s*/i, "");
  
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');

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
  // Usamos gemini-flash-latest por ser el más robusto y disponible universalmente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-flash-latest';

  const systemInstruction = `Eres un Experto en Educación. Analiza el material adjunto y crea un mapa de 5 capítulos para un juego.
  REGLA DE ORO: Responde SOLO con JSON en ESPAÑOL. No incluyas texto explicativo fuera del JSON.`;

  const userPrompt = `Analiza el material de "${topic}".
  Estructura de respuesta:
  {
    "topic": "${topic}",
    "chapters": [
      { "id": 1, "title": "Nombre", "description": "Resumen corto", "topics": ["tema1"] }
    ]
  }
  Crea exactamente 5 capítulos basados en el contenido.`;

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
    parts.push({ text: sourceContent ? `CONTENIDO: ${sourceContent}\n\n${userPrompt}` : userPrompt });

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
    console.error("Curriculum Error:", error);
    throw new Error("No se pudo analizar el contenido. Prueba con un archivo más pequeño.");
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
  const modelName = 'gemini-flash-latest';
  const numLevels = isTrialMode ? 3 : 4;

  const systemInstruction = `Eres un Maestro de Acertijos. Genera ${numLevels} desafíos basados en el tema "${chapter.title}".
  Responde SOLO con un ARRAY JSON en ESPAÑOL.`;

  const userPrompt = `Genera un array JSON de ${numLevels} niveles para el tema "${chapter.title}".
  Cada nivel debe tener: id, category, scenicDescription, riddle, options(4), correctAnswer, hints(3), explanation, knowledgeSnippet, congratulationMessage.`;

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
    parts.push({ text: `TEMAS: ${chapter.topics.join(", ")}.\n\n${userPrompt}` });

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
    console.error("Levels Error:", error);
    throw new Error("Error al crear los desafíos.");
  }
}
