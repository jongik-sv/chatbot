// services/GeminiModelService.ts
import { LLMModel } from '../types';

interface ModelCache {
  models: LLMModel[];
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

export class GeminiModelService {
  private apiKey: string | undefined;
  private cache: ModelCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분 캐시
  private readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  }

  /**
   * 실시간 Gemini 모델 리스트 조회 (캐싱 포함)
   */
  async getGeminiModels(forceRefresh: boolean = false): Promise<{
    success: boolean;
    models: LLMModel[];
    cached: boolean;
    error?: string;
  }> {
    // API 키 확인
    if (!this.apiKey) {
      return {
        success: false,
        models: this.getDefaultGeminiModels(),
        cached: false,
        error: 'Gemini API 키가 설정되지 않았습니다.'
      };
    }

    // 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      return {
        success: true,
        models: this.cache.models,
        cached: true
      };
    }

    try {
      const models = await this.fetchModelsFromAPI();
      
      // 캐시 업데이트
      this.cache = {
        models,
        lastUpdated: Date.now(),
        ttl: this.CACHE_TTL
      };

      return {
        success: true,
        models,
        cached: false
      };
    } catch (error) {
      console.error('Gemini 모델 조회 실패:', error);
      
      // 캐시된 데이터가 있으면 반환, 없으면 기본 모델 반환
      const fallbackModels = this.cache?.models || this.getDefaultGeminiModels();
      
      return {
        success: false,
        models: fallbackModels,
        cached: !!this.cache,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * API에서 모델 리스트 가져오기 - Google 공식 문서 기준 상위 3개 모델
   */
  private async fetchModelsFromAPI(): Promise<LLMModel[]> {
    const response = await fetch(`${this.API_BASE_URL}/models?key=${this.apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10초 타임아웃
    });

    if (!response.ok) {
      throw new Error(`Gemini API 오류: HTTP ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('잘못된 API 응답 형식');
    }

    // Google 공식 문서 기준 권장 모델 순서 (상위 3개)
    const recommendedModels = [
      'gemini-2.5-pro',           // 1순위: 가장 강력한 thinking 모델
      'gemini-2.5-flash',         // 2순위: 성능-가격 균형 최적 모델
      'gemini-2.5-flash-lite'     // 3순위: 비용 효율성 및 저지연 최적화 모델
    ];

    const availableModels: LLMModel[] = [];

    // 권장 순서대로 모델 찾기
    for (const targetModelId of recommendedModels) {
      const foundModel = data.models.find((model: any) => {
        const modelId = model.name.replace('models/', '');
        return modelId === targetModelId && 
               model.supportedGenerationMethods?.includes('generateContent');
      });

      if (foundModel) {
        availableModels.push(this.transformAPIModelToLLMModel(foundModel));
      }
    }

    // 권장 모델이 없는 경우 사용 가능한 모델 중에서 선택
    if (availableModels.length === 0) {
      const fallbackModels = data.models
        .filter((model: any) => 
          model.supportedGenerationMethods?.includes('generateContent')
        )
        .map((model: any) => this.transformAPIModelToLLMModel(model))
        .slice(0, 3); // 상위 3개만

      return fallbackModels;
    }

    return availableModels;
  }

  /**
   * API 모델 데이터를 LLMModel로 변환
   */
  private transformAPIModelToLLMModel(apiModel: any): LLMModel {
    const modelId = apiModel.name.replace('models/', '');
    
    return {
      id: modelId,
      name: this.formatModelDisplayName(apiModel.displayName || modelId),
      provider: 'gemini',
      multimodal: this.isMultimodalModel(modelId),
      available: true,
      description: apiModel.description,
      version: apiModel.version,
      inputTokenLimit: apiModel.inputTokenLimit,
      outputTokenLimit: apiModel.outputTokenLimit,
      supportedGenerationMethods: apiModel.supportedGenerationMethods,
      temperature: apiModel.temperature,
      topP: apiModel.topP,
      topK: apiModel.topK
    };
  }

  /**
   * 모델 표시 이름 포맷팅
   */
  private formatModelDisplayName(displayName: string): string {
    return displayName
      .replace(/^models\//, '')
      .replace(/gemini-/, 'Gemini ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 멀티모달 모델 여부 확인
   */
  private isMultimodalModel(modelId: string): boolean {
    const multimodalModels = [
      'gemini-2.5-pro',            // 최신 Pro 모델
      'gemini-2.5-flash',          // 최신 Flash 모델
      'gemini-2.5-flash-lite',     // 최신 Flash Lite 모델
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-pro-vision',
      'gemini-1.0-pro-vision'
    ];
    
    return multimodalModels.some(name => modelId.includes(name));
  }

  /**
   * 캐시 유효성 확인
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return (Date.now() - this.cache.lastUpdated) < this.cache.ttl;
  }

  /**
   * 기본 Gemini 모델 (API 실패 시 사용) - Google 공식 문서 기준 상위 3개
   */
  private getDefaultGeminiModels(): LLMModel[] {
    return [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'gemini',
        multimodal: true,
        available: true,
        description: 'Our most powerful thinking model with maximum response accuracy'
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        multimodal: true,
        available: true,
        description: 'Best model in terms of price-performance, offering well-rounded capabilities'
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        provider: 'gemini',
        multimodal: true,
        available: true,
        description: 'Optimized for cost efficiency and low latency'
      }
    ];
  }

  /**
   * 특정 모델의 상세 정보 조회
   */
  async getModelDetails(modelId: string): Promise<{
    success: boolean;
    model?: any;
    error?: string;
  }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Gemini API 키가 설정되지 않았습니다.'
      };
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/models/${modelId}?key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const model = await response.json();
      
      return {
        success: true,
        model: this.transformAPIModelToLLMModel(model)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStatus(): {
    cached: boolean;
    lastUpdated?: number;
    ttl?: number;
    remainingTime?: number;
  } {
    if (!this.cache) {
      return { cached: false };
    }

    const remainingTime = this.cache.ttl - (Date.now() - this.cache.lastUpdated);
    
    return {
      cached: true,
      lastUpdated: this.cache.lastUpdated,
      ttl: this.cache.ttl,
      remainingTime: Math.max(0, remainingTime)
    };
  }

  /**
   * API 연결 상태 확인
   */
  async checkAPIStatus(): Promise<{
    connected: boolean;
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    if (!this.apiKey) {
      return {
        connected: false,
        status: 'API 키 없음',
        error: 'Gemini API 키가 설정되지 않았습니다.'
      };
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.API_BASE_URL}/models?key=${this.apiKey}&pageSize=1`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;

      return {
        connected: response.ok,
        status: response.ok ? '정상' : `HTTP ${response.status}`,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status} - ${response.statusText}`
      };
    } catch (error) {
      return {
        connected: false,
        status: '연결 실패',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }
}