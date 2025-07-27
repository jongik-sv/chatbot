// types/index.ts

export interface User {
  id: number;
  username: string;
  email?: string;
  mbtiType?: string;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  defaultModel: string;
  language: string;
  theme: 'light' | 'dark';
  autoSave: boolean;
}

export interface ChatSession {
  id: number;
  userId: number;
  title: string;
  mode: 'chat' | 'document' | 'mentor' | 'mbti';
  modelUsed: string;
  mentorId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  contentType: 'text' | 'image' | 'audio';
  metadata?: MessageMetadata;
  createdAt: Date;
}

export interface MessageMetadata {
  fileName?: string;
  fileSize?: number;
  artifacts?: Artifact[];
  sources?: string[];
}

export interface Mentor {
  id: number;
  userId: number;
  name: string;
  description: string;
  personality: MentorPersonality;
  expertise: string[];
  mbtiType?: string;
  systemPrompt: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface MentorPersonality {
  traits: string[];
  communicationStyle: string;
  teachingApproach: string;
  responseStyle: string;
}

export interface Document {
  id: number;
  userId: number;
  mentorId?: number;
  filename: string;
  fileType: string;
  filePath: string;
  content: string;
  metadata: DocumentMetadata;
  createdAt: Date;
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  summary?: string;
}

export interface Artifact {
  id: number;
  sessionId: number;
  messageId: number;
  type: 'code' | 'document' | 'chart' | 'mermaid';
  title: string;
  content: string;
  language?: string;
  createdAt: Date;
}

export interface KnowledgeSource {
  id: number;
  mentorId: number;
  sourceType: 'youtube' | 'webpage' | 'document';
  sourceUrl: string;
  title: string;
  content: string;
  processedAt: Date;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: 'ollama' | 'gemini';
  multimodal: boolean;
  available: boolean;
  description?: string;
  version?: string;
  size?: number;
  modified?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface ChatRequest {
  message: string;
  model: string;
  mode: string;
  sessionId?: number;
  mentorId?: number;
  userId?: number;
  files?: File[];
}

export interface ChatResponse {
  content: string;
  artifacts?: Artifact[];
  sources?: string[];
  sessionId: number;
  messageId: number;
}