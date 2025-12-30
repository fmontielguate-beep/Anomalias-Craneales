
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

// Usamos Gemini 3 Pro para máxima creatividad y razonamiento complejo
const MODEL_NAME = 'gemini-3-pro-preview';

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  mediaFile?: FileData
): Promise<Curriculum> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const userPrompt = `Analiza material sobre "${topic}". Crea 3 capítulos educativos inspiradores. Contenido: ${sourceContent.substring(0, 4000)}`;

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
        systemInstruction: "Eres un arquitecto de mundos educativos de élite. Diseña un currículo de 3 capítulos. Usa títulos cinematográficos y metáforas profundas. Asegúrate de que los temas cubran los puntos más críticos del material proporcionado.",
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

  const userPrompt = `Crea un desafío de Escape Room de 5 niveles para: "${chapter.title}".
  
  REGLAS DE ORO PARA LA VARIEDAD (USA TU MÁXIMO RAZONAMIENTO):
  
  - NIVELES DE APERTURA (1 y 2): Deben ser "ganchos" culturales fascinantes. No repitas temas. Elige entre: Paradojas temporales, enigmas de civilizaciones antiguas, secretos de la naturaleza o hitos de la ingeniería.
  
  - NIVELES TÉCNICOS (3, 4 y 5): Basados estrictamente en el PDF/Texto.
    * Nivel 3: 'El Dilema' (Presenta un problema práctico que solo se resuelve con un concepto del texto).
    * Nivel 4: 'La Mentira sutil' (Identifica qué dato es falso entre 4 afirmaciones técnicas muy similares).
    * Nivel 5: 'La Gran Conexión' (Relaciona el concepto más difícil del texto con un escenario futurista o hipotético).
  
  - LENGUAJE: Usa un tono de "Maestro de Juegos" misterioso pero alentador.
  
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
        systemInstruction: "Genera 5 niveles con mecánicas de juego totalmente distintas. Eres un diseñador de Escape Rooms profesional. Cada 'riddle' debe ser un desafío mental. La 'explanation' debe ser pedagógicamente rica, explicando el 'por qué' detrás de la respuesta correcta.",
        thinkingConfig: { thinkingBudget: 2000 }, // Permitimos que la IA piense para crear mejores acertijos
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
