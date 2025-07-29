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

export interface CreateArtifactRequest {
  sessionId: number;
  messageId?: number;
  type: Artifact['type'];
  title: string;
  content: string;
  language?: string;
}

export interface UpdateArtifactRequest {
  title?: string;
  content?: string;
  language?: string;
}

export interface ArtifactMetadata {
  type: Artifact['type'];
  title: string;
  createdAt: string;
  size: number;
  language?: string;
  lines?: number;
  wordCount?: number;
  chartType?: string;
  dataPoints?: number;
  diagramType?: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter' | 'bubble';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
    }[];
  };
  options?: {
    responsive?: boolean;
    plugins?: {
      title?: {
        display: boolean;
        text: string;
      };
      legend?: {
        display: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
    };
    scales?: {
      x?: {
        display: boolean;
        title?: {
          display: boolean;
          text: string;
        };
      };
      y?: {
        display: boolean;
        title?: {
          display: boolean;
          text: string;
        };
      };
    };
  };
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
  ruleInfo?: {
    appliedRules: Array<{
      name: string;
      displayName: string;
      category: string;
      priority: number;
    }>;
    rulesSummary: string;
    originalMessage: string;
    enhancedMessage: string;
  };
  continuationInfo?: {
    isContinuation: boolean;
    previousMessageId?: number;
    wasArtifactUpdated: boolean;
    artifactsProcessed: number;
  };
}

// MBTI 관련 타입 정의
export type MBTIType = 
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export interface MBTIProfile {
  type: MBTIType;
  name: string;
  nickname: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  communicationStyle: string;
  learningPreferences: string[];
  motivations: string[];
  stressors: string[];
  workStyle: string;
  decisionMaking: string;
  relationshipStyle: string;
  cognitiveStack: {
    dominant: string;
    auxiliary: string;
    tertiary: string;
    inferior: string;
  };
}

export interface MBTIMentor extends Mentor {
  mbtiType: MBTIType;
  mbtiProfile: MBTIProfile;
  adaptedPersonality: MentorPersonality;
}

export interface MBTICompatibility {
  userType: MBTIType;
  mentorType: MBTIType;
  compatibilityScore: number; // 1-10
  strengths: string[];
  challenges: string[];
  communicationTips: string[];
  learningTips: string[];
}