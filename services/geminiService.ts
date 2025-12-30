
import { GoogleGenAI, Type } from "@google/genai";
import { GameLevel, FileData, Chapter, Curriculum } from "../types";

export async function generateCurriculum(
  topic: string,
  sourceContent: string,
  useSearch: boolean = false,
  mediaFile?: FileData
): Promise<Curriculum> {
  // Create a new instance right before the call to ensure up-to-date API key usage.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Usamos flash por defecto para evitar bloqueos de facturación y ganar velocidad
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `Eres un Experto en Gamificación Educativa. 
  Tu tarea es desglosar el tema "${topic}" en un currículo de 6 capítulos para un juego de escape room educativo.
  Analiza el contenido para extraer los pilares fundamentales del conocimiento.`;

  const userPrompt = `Genera un objeto JSON para un currículo sobre: ${topic}. 
  Contexto: ${sourceContent}.
  Campos: 
  - topic: nombre del tema.
  - chapters: array de 6 objetos con (id, title, description, topics: string[]).
  
  Responde solo JSON en español.`;

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

  const syllabus: Curriculum = JSON.parse(response.text || "{}");

  // Extract grounding URLs as required for search grounding
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
}

export async function generateChapterLevels(
  topic: string,
  chapter: Chapter,
  sourceContent: string,
  useSearch: boolean = false,
  mediaFile?: FileData,
  isTrialMode: boolean = false
): Promise<GameLevel[]> {
  // Create a new instance right before the call to ensure up-to-date API key usage.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  const numLevels = isTrialMode ? 5 : 8;

  const systemInstruction = `Eres un Maestro de Acertijos de Cultura Universal. 
  Genera EXACTAMENTE ${numLevels} niveles para el capítulo: "${chapter.title}".
  
  REGLAS DE SEGURIDAD PARA EL ACCESO AL APRENDIZAJE:
  1. NIVEL 1 (GEOGRAFÍA O LITERATURA): Haz una pregunta de cultura general sobre geografía mundial o literatura universal clásica. NO debe tener relación con el PDF.
  2. NIVEL 2 (MÚSICA O ARTE): Haz una pregunta sobre compositores famosos, instrumentos o pintores históricos. NO debe tener relación con el PDF.
  3. NIVELES 3 en adelante: Preguntas técnicas basadas en "${chapter.title}" del tema "${topic}" usando el contenido proporcionado.
  
  El tono debe ser épico y divertido. Idioma: Español.`;

  const userPrompt = `Genera un Array JSON de ${numLevels} niveles siguiendo las reglas de cultura general para los niveles 1 y 2. 
  Campos: id, category, scenicDescription, riddle, options(4), correctAnswer, hints(3), explanation, knowledgeSnippet, congratulationMessage.`;

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
      thinkingConfig: { thinkingBudget: 0 } // Gemini 3 models support thinkingBudget; 0 for lower latency
    }
  });

  const levels: GameLevel[] = JSON.parse(response.text || "[]");

  // Extract grounding URLs as required for search grounding
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
}
