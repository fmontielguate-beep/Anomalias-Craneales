
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const userPrompt = `Analiza este material sobre "${topic}". 
  Crea un plan de 4 capítulos para un juego educativo.
  Contenido: ${sourceContent}`;

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
        systemInstruction: "Eres un profesor creativo. Diseña un currículo educativo de 4 capítulos en JSON. Cada capítulo debe tener un título divertido y temas claros extraídos del documento.",
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

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    throw new Error("No se pudo procesar el documento. Intenta con un texto más corto o un PDF más simple.");
  }
}

export async function generateChapterLevels(
  topic: string,
  chapter: Chapter,
  sourceContent: string,
  mediaFile?: FileData
): Promise<GameLevel[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const userPrompt = `Genera un desafío de 5 niveles para el tema: "${chapter.title}".
  
  ESTRUCTURA OBLIGATORIA:
  - Nivel 1 y 2: PREGUNTAS DE CULTURA GENERAL (Geografía, Historia, Música, Literatura o Arte). No deben estar relacionadas con el PDF, son el "peaje" de acceso.
  - Nivel 3, 4 y 5: PREGUNTAS ESPECÍFICAS sobre estos temas del PDF: ${chapter.topics.join(", ")}.
  
  Contenido de referencia del PDF: ${sourceContent.substring(0, 4000)}`;

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
        systemInstruction: "Genera un JSON con un array de 5 objetos GameLevel. Los 2 primeros DEBEN ser de cultura general aleatoria. Los 3 últimos DEBEN ser sobre el contenido educativo proporcionado. Usa un tono de aventura de escape room.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              category: { type: Type.STRING, description: "Ej: Geografía, Música, o el tema del capítulo" },
              scenicDescription: { type: Type.STRING, description: "Ambientación narrativa breve" },
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
    console.error("Gemini Error:", error);
    throw new Error("Error al generar los niveles. Por favor, revisa tu conexión.");
  }
}
