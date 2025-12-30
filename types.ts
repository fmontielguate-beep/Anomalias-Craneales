
export interface UserProfile {
  fullName: string;
  medicalId: string;
  specialtyPreference: string;
}

export interface GameLevel {
  id: number;
  category: string;
  riddle: string;
  scenicDescription: string;
  options: string[];
  correctAnswer: string;
  hints: string[];
  explanation: string;
  knowledgeSnippet: string;
  congratulationMessage: string;
  sources?: { title: string; uri: string }[];
}

export interface Chapter {
  id: number;
  title: string;
  description: string;
  status: 'locked' | 'available' | 'completed';
  topics: string[];
  sources?: { title: string; uri: string }[];
}

export interface Curriculum {
  topic: string;
  chapters: Chapter[];
  sources?: { title: string; uri: string }[];
}

export enum AppStatus {
  AUTH = 'AUTH',
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  CURRICULUM_MAP = 'CURRICULUM_MAP',
  PREVIEW = 'PREVIEW',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type SourceType = 'text' | 'pdf' | 'video';

export interface FileData {
  data: string;
  mimeType: string;
}
