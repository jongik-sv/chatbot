// utils/constants.ts

export const SUPPORTED_FILE_TYPES = {
  DOCUMENT: ['.pdf', '.docx', '.txt', '.md'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  AUDIO: ['.mp3', '.wav', '.m4a', '.ogg']
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
] as const;

export const CHAT_MODES = {
  CHAT: 'chat',
  DOCUMENT: 'document',
  MENTOR: 'mentor',
  MBTI: 'mbti'
} as const;

export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const;

export const CONTENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio'
} as const;

export const ARTIFACT_TYPES = {
  CODE: 'code',
  DOCUMENT: 'document',
  CHART: 'chart',
  MERMAID: 'mermaid'
} as const;

export const LLM_PROVIDERS = {
  OLLAMA: 'ollama',
  GEMINI: 'gemini'
} as const;