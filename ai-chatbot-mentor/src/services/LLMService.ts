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
    const ollamaModels = await this.getOllamaModels();
    models.push(...ollamaModels);

    // Gemini 모델 조회 (API 키가 있는 경우)
    if (this.geminiApiKey) {
      const geminiModels = await this.getGeminiModels();
      models.push(...geminiModels);
    }

    return models;
  }

  /**
   * Ollama 모델 조회
   */
  private async getOllamaModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.ollamaBaseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 네트워크 타임아웃 설정
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
      });

      if (!response.ok) {
        console.warn(`Ollama API 응답 오류: HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.models?.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama' as const,
        multimodal: this.isMultimodalModel(model.name),
        available: true,
        size: model.size,
        modified: model.modified_at
      })) || [];
    } catch (error) {
      console.error('Ollama 모델 조회 실패:', error);
      return [];
    }
  }

  /**
   * Gemini 모델 조회 (Google AI API 사용)
   */
  private async getGeminiModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
      });

      if (!response.ok) {
        console.warn(`Gemini API 응답 오류: HTTP ${response.status}`);
        // 실패 시 기본 모델 반환
        return this.getDefaultGeminiModels();
      }

      const data = await response.json();
      
      return data.models?.filter((model: any) => 
        // generateContent를 지원하는 모델만 필터링
        model.supportedGenerationMethods?.includes('generateContent')
      ).map((model: any) => ({
        id: model.name.replace('models/', ''), // "models/gemini-pro" -> "gemini-pro"
        name: this.formatGeminiModelName(model.displayName || model.name),
        provider: 'gemini' as const,
        multimodal: this.isGeminiMultimodal(model.name),
        available: true,
        description: model.description,
        version: model.version
      })) || this.getDefaultGeminiModels();
    } catch (error) {
      console.error('Gemini 모델 조회 실패:', error);
      // 실패 시 기본 모델 반환
      return this.getDefaultGeminiModels();
    }
  }

  /**
   * 기본 Gemini 모델 (API 호출 실패 시 사용)
   */
  private getDefaultGeminiModels(): LLMModel[] {
    return [
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
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash 8B',
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
  }

  /**
   * Gemini 모델명 포맷팅
   */
  private formatGeminiModelName(displayName: string): string {
    // "Gemini 1.5 Pro" 형태로 변환
    return displayName
      .replace(/^models\//, '')
      .replace(/gemini-/, 'Gemini ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Gemini 모델이 멀티모달인지 확인
   */
  private isGeminiMultimodal(modelName: string): boolean {
    const multimodalGeminiModels = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-pro-vision'
    ];
    const cleanModelName = modelName.replace('models/', '');
    return multimodalGeminiModels.some(name => cleanModelName.includes(name));
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
    if (!this.geminiApiKey) {
      return {
        success: false,
        content: '',
        model: options.model || 'gemini-1.5-flash',
        provider: 'gemini',
        error: 'Gemini API 키가 설정되지 않음'
      };
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiApiKey);
      
      const model = genAI.getGenerativeModel({ 
        model: options.model || 'gemini-1.5-flash',
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
        },
        systemInstruction: options.systemInstruction
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        content: text,
        model: options.model || 'gemini-1.5-flash',
        provider: 'gemini',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error('Gemini 텍스트 생성 실패:', error);
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
        return await this.chatWithGemini(messages, options);
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
   * Gemini로 채팅
   */
  private async chatWithGemini(messages: Array<{role: string, content: string}>, options: LLMGenerationOptions): Promise<LLMResponse> {
    if (!this.geminiApiKey) {
      return {
        success: false,
        content: '',
        model: options.model || 'gemini-1.5-flash',
        provider: 'gemini',
        error: 'Gemini API 키가 설정되지 않음'
      };
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiApiKey);
      
      const model = genAI.getGenerativeModel({ 
        model: options.model || 'gemini-1.5-flash',
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
        },
        systemInstruction: options.systemInstruction
      });

      // 채팅 세션 시작
      const chat = model.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      });

      // 마지막 메시지 전송
      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        content: text,
        model: options.model || 'gemini-1.5-flash',
        provider: 'gemini',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error('Gemini 채팅 실패:', error);
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
   * 멀티모달 생성 (이미지 포함)
   */
  async generateWithImage(prompt: string, imageData: string, options: LLMGenerationOptions & { mimeType?: string } = {}): Promise<LLMResponse> {
    const model = options.model || 'gemini-1.5-flash';
    
    if (!this.geminiApiKey) {
      return {
        success: false,
        content: '',
        model,
        provider: 'gemini',
        error: 'Gemini API 키가 설정되지 않음'
      };
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiApiKey);
      
      const genModel = genAI.getGenerativeModel({ 
        model,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
        }
      });

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: options.mimeType || 'image/jpeg'
        }
      };

      const result = await genModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        content: text,
        model,
        provider: 'gemini',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error('Gemini 멀티모달 생성 실패:', error);
      return {
        success: false,
        content: '',
        model,
        provider: 'gemini',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 서비스 상태 확인
   */
  async checkStatus(): Promise<{ollama: any, gemini: any, overall: string}> {
    const [ollamaStatus, geminiStatus] = await Promise.all([
      this.checkOllamaStatus(),
      this.checkGeminiStatus()
    ]);
    
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
      const response = await fetch(`${this.ollamaBaseURL}/api/tags`, {
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });
      return { 
        connected: response.ok, 
        status: response.ok ? 'healthy' : 'unhealthy',
        url: this.ollamaBaseURL
      };
    } catch (error) {
      return { 
        connected: false, 
        status: 'unhealthy', 
        url: this.ollamaBaseURL,
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * Gemini 상태 확인
   */
  private async checkGeminiStatus() {
    if (!this.geminiApiKey) {
      return { 
        connected: false, 
        status: 'unhealthy', 
        error: 'API 키가 설정되지 않음' 
      };
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`, {
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });
      
      return { 
        connected: response.ok, 
        status: response.ok ? 'healthy' : 'unhealthy',
        apiKeyConfigured: true
      };
    } catch (error) {
      return { 
        connected: false, 
        status: 'unhealthy', 
        apiKeyConfigured: true,
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 모델이 멀티모달을 지원하는지 확인
   */
  isMultimodalSupported(modelId: string): boolean {
    const provider = this.getModelProvider(modelId);
    if (provider === 'gemini') {
      return this.isGeminiMultimodal(modelId);
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