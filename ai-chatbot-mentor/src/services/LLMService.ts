// services/LLMService.ts
import { LLMModel, ChatRequest, ChatResponse } from '../types';

// 기존 JavaScript 서비스들을 import
const LLMServiceJS = require('../../../../services/LLMService');

export interface LLMGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  stream?: boolean;
  onToken?: (token: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface LLMResponse {
  success: boolean;
  content: string;
  model: string;
  provider: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMService {
  private llmService: any;

  constructor() {
    this.llmService = new LLMServiceJS();
  }

  /**
   * 사용 가능한 모든 모델 조회
   */
  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const result = await this.llmService.getAllAvailableModels();
      
      if (!result.success) {
        console.error('모델 목록 조회 실패:', result.error);
        return [];
      }

      return result.models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: model.provider as 'ollama' | 'gemini',
        multimodal: model.capabilities?.multimodal || false,
        available: model.available || true
      }));
    } catch (error) {
      console.error('모델 목록 조회 중 오류:', error);
      return [];
    }
  }

  /**
   * 텍스트 생성
   */
  async generateText(prompt: string, options: LLMGenerationOptions = {}): Promise<LLMResponse> {
    try {
      const result = await this.llmService.generateText(prompt, {
        model: options.model || 'llama2',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2048,
        systemInstruction: options.systemInstruction || '',
        stream: options.stream || false,
        onToken: options.onToken,
        onComplete: options.onComplete,
        onError: options.onError
      });

      return {
        success: result.success,
        content: result.content || '',
        model: result.model || options.model || 'llama2',
        provider: result.provider || 'ollama',
        error: result.error,
        usage: result.usage
      };
    } catch (error) {
      console.error('텍스트 생성 실패:', error);
      return {
        success: false,
        content: '',
        model: options.model || 'llama2',
        provider: 'ollama',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 채팅 형태로 대화
   */
  async chat(messages: Array<{role: string, content: string}>, options: LLMGenerationOptions = {}): Promise<LLMResponse> {
    try {
      const result = await this.llmService.chat(messages, {
        model: options.model || 'llama2',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2048,
        systemInstruction: options.systemInstruction || '',
        stream: options.stream || false,
        onToken: options.onToken,
        onComplete: options.onComplete,
        onError: options.onError
      });

      return {
        success: result.success,
        content: result.message?.content || result.content || '',
        model: result.model || options.model || 'llama2',
        provider: result.provider || 'ollama',
        error: result.error,
        usage: result.usage
      };
    } catch (error) {
      console.error('채팅 실패:', error);
      return {
        success: false,
        content: '',
        model: options.model || 'llama2',
        provider: 'ollama',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 멀티모달 생성 (이미지 포함)
   */
  async generateWithImage(prompt: string, imageData: string, options: LLMGenerationOptions = {}): Promise<LLMResponse> {
    try {
      const result = await this.llmService.generateWithImage(prompt, imageData, {
        model: options.model || 'gemini-1.5-flash',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2048,
        systemInstruction: options.systemInstruction || '',
        stream: options.stream || false,
        onToken: options.onToken,
        onComplete: options.onComplete,
        onError: options.onError
      });

      return {
        success: result.success,
        content: result.content || '',
        model: result.model || options.model || 'gemini-1.5-flash',
        provider: result.provider || 'gemini',
        error: result.error,
        usage: result.usage
      };
    } catch (error) {
      console.error('멀티모달 생성 실패:', error);
      return {
        success: false,
        content: '',
        model: options.model || 'gemini-1.5-flash',
        provider: 'gemini',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 서비스 상태 확인
   */
  async checkStatus(): Promise<{ollama: any, gemini: any, overall: string}> {
    try {
      return await this.llmService.checkAllServices();
    } catch (error) {
      console.error('서비스 상태 확인 실패:', error);
      return {
        ollama: { connected: false, status: 'unhealthy' },
        gemini: { connected: false, status: 'unhealthy' },
        overall: 'unhealthy'
      };
    }
  }

  /**
   * 모델이 멀티모달을 지원하는지 확인
   */
  isMultimodalSupported(modelId: string): boolean {
    return this.llmService.isMultimodalSupported(modelId);
  }

  /**
   * 모델의 제공자 확인
   */
  getModelProvider(modelId: string): 'ollama' | 'gemini' {
    return this.llmService.getModelProvider(modelId);
  }
}