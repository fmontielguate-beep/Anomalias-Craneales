
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

// Usamos Gemini 3 Pro para máxima creatividad y razonamiento multimodal (PDF, Texto y VIDEO)
const MODEL_NAME = 'gemini-3-pro-preview';

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const userPrompt = `Analiza detalladamente el material sobre "${topic}". El material puede ser un texto o un archivo multimedia (video/PDF).
  Extrae los conceptos fundamentales y crea un currículo educativo de 3 capítulos. 
  Si es un video, ten en cuenta los diálogos y las escenas clave.
  Contenido adicional: ${sourceContent.substring(0, 4000)}`;

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
      model: MODEL_NAME,
      contents: [{ parts }],
      config: {
        systemInstruction: "Eres un arquitecto de mundos educativos multimodal. Tu misión es transformar cualquier tipo de material (texto, PDF o VIDEO) en una estructura de aprendizaje fascinante. Usa títulos cinematográficos y asegúrate de que cada capítulo sea una progresión lógica del conocimiento.",
        thinkingConfig: { thinkingBudget: 4000 },
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
    console.error("Error en generateCurriculum:", error);
    throw error;
  }
}

export async function generateChapterLevels(
  topic: string,
  chapter: Chapter,
  sourceContent: string,
  mediaFile?: FileData
): Promise<GameLevel[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const userPrompt = `Crea un desafío de Escape Room de 5 niveles para el capítulo: "${chapter.title}".
  
  EL MATERIAL DE ORIGEN: Puede ser texto o un VIDEO/PDF. Si es un video, crea retos basados en lo que se ve o se dice en él.
  
  REGLAS DE VARIEDAD:
  - NIVELES 1-2 (CONEXIÓN): Ganchos culturales o curiosidades relacionadas con el tema del capítulo.
  - NIVELES 3-5 (DOMINIO): Retos técnicos basados directamente en el material (si es video, usa escenas o datos específicos mencionados).
    * Nivel 3: 'El Dilema Visual/Técnico'.
    * Nivel 4: 'Detector de Errores'.
    * Nivel 5: 'La Gran Conexión Final'.
  
  Contenido: ${sourceContent.substring(0, 4000)}`;

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
      model: MODEL_NAME,
      contents: [{ parts }],
      config: {
        systemInstruction: "Genera 5 niveles únicos. Eres un experto en pedagogía y diseño de juegos. Si el material incluye video, aprovecha la información visual y auditiva para crear acertijos inmersivos. La 'explanation' debe ser enriquecedora.",
        thinkingConfig: { thinkingBudget: 8000 },
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
            required: ["id", "category", "riddle", "options", "correctAnswer", "hints", "explanation", "scenicDescription"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.error("Error en generateChapterLevels:", error);
    throw error;
  }
}
