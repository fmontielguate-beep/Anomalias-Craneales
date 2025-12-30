
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const userPrompt = `Analiza el material sobre "${topic}". 
  Extrae los conceptos fundamentales y organízalos en una secuencia de aprendizaje de 5 capítulos.
  ${sourceContent ? `Usa también este texto: ${sourceContent}` : ''}`;

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
        systemInstruction: "Eres un experto en pedagogía. Analiza el archivo adjunto y genera un currículo educativo de 5 capítulos en JSON.",
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
    if (!result.chapters) throw new Error("Respuesta incompleta");
    return result;
  } catch (error: any) {
    console.error("Critical Curriculum Error:", error);
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

  const userPrompt = `Basándote en el material adjunto, genera ${numLevels} preguntas de opción múltiple sobre "${chapter.title}".
  Los temas a cubrir son: ${chapter.topics.join(", ")}.`;

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
        systemInstruction: `Eres un diseñador de acertijos para un escape room. Crea ${numLevels} niveles desafiantes.`,
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

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.error("Critical Levels Error:", error);
    throw error;
  }
}
