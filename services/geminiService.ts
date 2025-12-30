
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  // Inicializamos dentro de la función para asegurar el uso de la API Key más reciente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Usamos Pro para tareas de razonamiento complejo sobre documentos
  const modelName = 'gemini-3-pro-preview';

  const userPrompt = `Analiza detenidamente el material adjunto sobre "${topic}". 
  Tu objetivo es diseñar un plan de estudios de 5 capítulos para un juego educativo. 
  Cada capítulo debe cubrir un área temática distinta del material.
  ${sourceContent ? `También considera este texto: ${sourceContent}` : ''}`;

  try {
    const parts: any[] = [];
    
    // IMPORTANTE: Primero enviamos el archivo para que la IA lo cargue en su memoria de contexto
    if (mediaFile) {
      parts.push({
        inlineData: {
          data: mediaFile.data,
          mimeType: mediaFile.mimeType
        }
      });
    }

    // Luego enviamos las instrucciones
    parts.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts }],
      config: {
        systemInstruction: "Eres un experto en pedagogía y gamificación. Tu misión es transformar documentos en currículos educativos estructurados en JSON. Sé creativo y preciso.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  topics: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "title", "description", "topics"]
              }
            }
          },
          required: ["topic", "chapters"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    if (!result.chapters || result.chapters.length === 0) {
      throw new Error("La IA no pudo extraer capítulos del material.");
    }
    return result;
  } catch (error: any) {
    console.error("Error en generateCurriculum:", error);
    // Propagamos el error real para mostrarlo en la UI
    throw new Error(error.message || "Fallo desconocido en la IA");
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
  const modelName = 'gemini-3-pro-preview';
  const numLevels = isTrialMode ? 2 : 4;

  const userPrompt = `Basándote en el material adjunto, genera ${numLevels} preguntas de examen tipo escape room para el capítulo: "${chapter.title}".
  Temas específicos a evaluar: ${chapter.topics.join(", ")}.
  Crea acertijos que requieran haber leído el material.`;

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

    parts.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts }],
      config: {
        systemInstruction: `Diseña un juego de escape room. Debes generar exactamente ${numLevels} niveles en formato JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              category: { type: Type.STRING },
              scenicDescription: { type: Type.STRING },
              riddle: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              hints: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING },
              knowledgeSnippet: { type: Type.STRING },
              congratulationMessage: { type: Type.STRING }
            },
            required: ["id", "category", "riddle", "options", "correctAnswer", "hints", "explanation"]
          }
        }
      }
    });

    const levels = JSON.parse(response.text || "[]");
    return Array.isArray(levels) ? levels : [];
  } catch (error: any) {
    console.error("Error en generateChapterLevels:", error);
    throw new Error(error.message || "Fallo al generar preguntas");
  }
}
