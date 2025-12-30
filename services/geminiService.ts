
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const userPrompt = `Analiza material sobre "${topic}". Crea 3 capítulos educativos inspiradores. Contenido: ${sourceContent.substring(0, 3000)}`;

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
        systemInstruction: "Eres un arquitecto de mundos educativos. Diseña un currículo de 3 capítulos. Evita títulos genéricos. Usa metáforas relacionadas con el tema (ej: si es medicina, 'El Laberinto de las Arterias').",
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
    throw new Error("Error de conexión.");
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

  const userPrompt = `Crea un desafío de Escape Room de 5 niveles para: "${chapter.title}".
  
  DIVERSIFICACIÓN OBLIGATORIA DE MECÁNICAS:
  
  - NIVEL 1 y 2 (APERTURA CULTURAL): No repitas categorías. Elige 2 diferentes entre: Mitología Comparada, Inventos Perdidos, Etimología de Palabras Raras, Curiosidades del Cosmos o Dilemas Filosóficos.
  
  - NIVEL 3, 4 y 5 (CONTENIDO TÉCNICO DEL PDF): 
    * No hagas solo preguntas de '¿Qué es...?'. 
    * Usa 'Escenarios Críticos': 'Si el parámetro X sube, ¿qué pasaría con Y según el texto?'. 
    * Usa 'Detectives de Errores': Presenta 3 verdades y 1 mentira sutil del PDF.
    * Usa 'Analogías Creativas': Compara un concepto técnico con algo mundano para ver si se entendió la esencia.
  
  LA NARRATIVA: Cada nivel debe ocurrir en un lugar distinto (ej: Una cúpula de cristal, un bosque de hologramas, una sala de máquinas de vapor).
  
  Contenido: ${sourceContent.substring(0, 3000)}`;

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
        systemInstruction: "Genera 5 niveles únicos. Eres un Game Designer experto en pedagogía. Tu misión es que ninguna pregunta se parezca a la anterior en formato o estilo. La 'explanation' debe ser fascinante y conectar el dato con una utilidad real.",
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
    throw new Error("Error al generar el desafío educativo.");
  }
}
