// services/LLMService.ts
import { LLMModel } from '../types';

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
  private ollamaBaseURL: string;
  private geminiApiKey: string | undefined;

  constructor() {
    this.ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
  }

  /**
   * 사용 가능한 모든 모델 조회
   */
  async getAvailableModels(): Promise<LLMModel[]> {
    const models: LLMModel[] = [];

    // Ollama 모델 조회
    try {
      const response = await fetch(`${this.ollamaBaseURL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const ollamaModels = data.models?.map((model: any) => ({
          id: model.name,
          name: model.name,
          provider: 'ollama' as const,
          multimodal: this.isMultimodalModel(model.name),
          available: true
        })) || [];
        models.push(...ollamaModels);
      }
    } catch (error) {
      console.error('Ollama 모델 조회 실패:', error);
    }

    // Gemini 모델 추가 (API 키가 있는 경우)
    if (this.geminiApiKey) {
      const geminiModels: LLMModel[] = [
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          provider: 'gemini',
          multimodal: true,
          available: true
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          provider: 'gemini',
          multimodal: true,
          available: true
        },
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          provider: 'gemini',
          multimodal: false,
          available: true
        }
      ];
      models.push(...geminiModels);
    }

    return models;
  }

  /**
   * 멀티모달 모델인지 확인
   */
  private isMultimodalModel(modelName: string): boolean {
    const multimodalModels = [
      'llava', 'bakllava', 'moondream', 'llava-phi3', 'llava-llama3'
    ];
    return multimodalModels.some(name => 
      modelName.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * 텍스트 생성
   */
  async generateText(prompt: string, options: LLMGenerationOptions = {}): Promise<LLMResponse> {
    const model = options.model || 'qwen3:8b';
    const provider = this.getModelProvider(model);

    try {
      if (provider === 'ollama') {
        return await this.generateWithOllama(prompt, options);
      } else {
        return await this.generateWithGemini(prompt, options);
      }
    } catch (error) {
      console.error('텍스트 생성 실패:', error);
      return {
        success: false,
        content: '',
        model,
        provider,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * Ollama로 텍스트 생성
   */
  private async generateWithOllama(prompt: string, options: LLMGenerationOptions): Promise<LLMResponse> {
    const model = options.model || 'qwen3:8b';
    
    const requestBody = {
      model,
      prompt,
      system: options.systemInstruction || '',
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 2048
      }
    };

    const response = await fetch(`${this.ollamaBaseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama API 오류: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      content: data.response || '',
      model,
      provider: 'ollama'
    };
  }

  /**
   * Gemini로 텍스트 생성
   */
  private async generateWithGemini(prompt: string, options: LLMGenerationOptions): Promise<LLMResponse> {
    // 간단한 구현 - 실제로는 Google Generative AI SDK 사용
    return {
      success: false,
      content: '',
      model: options.model || 'gemini-1.5-flash',
      provider: 'gemini',
      error: 'Gemini API 키가 설정되지 않음'
    };
  }

  /**
   * 채팅 형태로 대화
   */
  async chat(messages: Array<{role: string, content: string}>, options: LLMGenerationOptions = {}): Promise<LLMResponse> {
    const model = options.model || 'qwen3:8b';
    const provider = this.getModelProvider(model);

    try {
      if (provider === 'ollama') {
        const requestBody = {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048
          }
        };

        const response = await fetch(`${this.ollamaBaseURL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Ollama Chat API 오류: HTTP ${response.status}`);
        }

        const data = await response.json();
        
        return {
          success: true,
          content: data.message?.content || '',
          model,
          provider: 'ollama'
        };
      } else {
        return {
          success: false,
          content: '',
          model,
          provider: 'gemini',
          error: 'Gemini API 키가 설정되지 않음'
        };
      }
    } catch (error) {
      console.error('채팅 실패:', error);
      return {
        success: false,
        content: '',
        model,
        provider,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 멀티모달 생성 (이미지 포함)
   */
  async generateWithImage(prompt: string, imageData: string, options: LLMGenerationOptions = {}): Promise<LLMResponse> {
    const model = options.model || 'gemini-1.5-flash';
    
    return {
      success: false,
      content: '',
      model,
      provider: 'gemini',
      error: '멀티모달 기능은 아직 구현되지 않음'
    };
  }

  /**
   * 서비스 상태 확인
   */
  async checkStatus(): Promise<{ollama: any, gemini: any, overall: string}> {
    const ollamaStatus = await this.checkOllamaStatus();
    const geminiStatus = { connected: !!this.geminiApiKey, status: this.geminiApiKey ? 'healthy' : 'unhealthy' };
    
    return {
      ollama: ollamaStatus,
      gemini: geminiStatus,
      overall: ollamaStatus.connected || geminiStatus.connected ? 'healthy' : 'unhealthy'
    };
  }

  /**
   * Ollama 상태 확인
   */
  private async checkOllamaStatus() {
    try {
      const response = await fetch(`${this.ollamaBaseURL}/api/tags`);
      return { connected: response.ok, status: response.ok ? 'healthy' : 'unhealthy' };
    } catch (error) {
      return { connected: false, status: 'unhealthy', error: error instanceof Error ? error.message : '알 수 없는 오류' };
    }
  }

  /**
   * 모델이 멀티모달을 지원하는지 확인
   */
  isMultimodalSupported(modelId: string): boolean {
    const provider = this.getModelProvider(modelId);
    if (provider === 'gemini') {
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro-vision'].includes(modelId);
    } else {
      return this.isMultimodalModel(modelId);
    }
  }

  /**
   * 모델의 제공자 확인
   */
  getModelProvider(modelId: string): 'ollama' | 'gemini' {
    if (modelId.includes('gemini')) {
      return 'gemini';
    }
    return 'ollama';
  }
}