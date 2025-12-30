
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  useSearch: boolean = false,
  mediaFile?: FileData
): Promise<Curriculum> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `Eres un Experto en Gamificación Educativa. 
  Tu tarea es desglosar el tema "${topic}" en un currículo de 6 capítulos para un juego de escape room educativo.
  Analiza el contenido para extraer los pilares fundamentales del conocimiento.`;

  const userPrompt = `Genera un objeto JSON para un currículo sobre: ${topic}. 
  Contexto: ${sourceContent}.
  Campos: 
  - topic: nombre del tema.
  - chapters: array de 6 objetos con (id, title, description, topics: string[]).
  
  Responde solo JSON en español. NO incluyas markdown o bloques de código.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ 
        parts: [
          { text: userPrompt },
          ...(mediaFile ? [{ inlineData: { data: mediaFile.data, mimeType: mediaFile.mimeType } }] : [])
        ] 
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      }
    });

    const cleanText = response.text?.trim().replace(/^```json/, '').replace(/```$/, '') || "{}";
    const syllabus: Curriculum = JSON.parse(cleanText);

    // Extract grounding URLs
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && useSearch) {
      const sources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title,
          uri: chunk.web.uri
        }));
      syllabus.sources = sources;
    }

    return syllabus;
  } catch (error) {
    console.error("Gemini Service Error:", error);
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview';
  const numLevels = isTrialMode ? 5 : 8;

  const systemInstruction = `Eres un Maestro de Acertijos de Cultura Universal. 
  Genera EXACTAMENTE ${numLevels} niveles para el capítulo: "${chapter.title}".
  
  REGLAS DE SEGURIDAD PARA EL ACCESO AL APRENDIZAJE:
  1. NIVEL 1 (GEOGRAFÍA O LITERATURA): Pregunta cultura general mundial. NO PDF.
  2. NIVEL 2 (MÚSICA O ARTE): Pregunta historia del arte o música clásica. NO PDF.
  3. NIVELES 3 en adelante: Preguntas técnicas sobre "${chapter.title}" usando el PDF.
  
  Idioma: Español. Responde SOLO JSON puro.`;

  const userPrompt = `Genera un Array JSON de ${numLevels} niveles. 
  Campos: id, category, scenicDescription, riddle, options(4), correctAnswer, hints(3), explanation, knowledgeSnippet, congratulationMessage.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ 
        parts: [
          { text: userPrompt },
          ...(mediaFile ? [{ inlineData: { data: mediaFile.data, mimeType: mediaFile.mimeType } }] : [])
        ] 
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      }
    });

    const cleanText = response.text?.trim().replace(/^```json/, '').replace(/```$/, '') || "[]";
    const levels: GameLevel[] = JSON.parse(cleanText);

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && useSearch) {
      const sources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title,
          uri: chunk.web.uri
        }));
      levels.forEach(lvl => lvl.sources = sources);
    }

    return levels;
  } catch (error) {
    console.error("Gemini Levels Error:", error);
    throw error;
  }
}
