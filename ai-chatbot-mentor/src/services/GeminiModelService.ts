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
   * API에서 모델 리스트 가져오기
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

    // 최신 Flash와 Pro 모델만 필터링
    const targetModels = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    
    const filteredModels = data.models
      .filter((model: any) => {
        // generateContent를 지원하는 모델만
        if (!model.supportedGenerationMethods?.includes('generateContent')) {
          return false;
        }
        
        const modelId = model.name.replace('models/', '');
        
        // 타겟 모델 중 하나와 일치하는지 확인
        return targetModels.some(target => modelId.includes(target));
      })
      .map((model: any) => this.transformAPIModelToLLMModel(model));

    // Flash와 Pro 각각에서 가장 최신 버전만 선택
    const latestModels = this.selectLatestModels(filteredModels);
    
    return latestModels.sort((a, b) => {
      // Pro를 먼저, Flash를 나중에 정렬
      if (a.id.includes('pro') && !b.id.includes('pro')) return -1;
      if (!a.id.includes('pro') && b.id.includes('pro')) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Flash와 Pro 각각에서 가장 최신 모델 선택
   */
  private selectLatestModels(models: LLMModel[]): LLMModel[] {
    const proModels = models.filter(m => m.id.includes('pro'));
    const flashModels = models.filter(m => m.id.includes('flash'));
    
    const result: LLMModel[] = [];
    
    // Pro 모델 중 가장 최신 선택 (1.5-pro 우선)
    if (proModels.length > 0) {
      const latestPro = proModels.find(m => m.id === 'gemini-1.5-pro') || 
                       proModels.sort((a, b) => this.compareModelVersions(b.id, a.id))[0];
      result.push(latestPro);
    }
    
    // Flash 모델 중 가장 최신 선택 (1.5-flash 우선)
    if (flashModels.length > 0) {
      const latestFlash = flashModels.find(m => m.id === 'gemini-1.5-flash') || 
                          flashModels.sort((a, b) => this.compareModelVersions(b.id, a.id))[0];
      result.push(latestFlash);
    }
    
    return result;
  }

  /**
   * 모델 버전 비교 (높은 버전이 우선)
   */
  private compareModelVersions(a: string, b: string): number {
    // 1.5 > 1.0 형태로 비교
    const getVersion = (modelId: string) => {
      const match = modelId.match(/(\d+)\.(\d+)/);
      if (!match) return 0;
      return parseFloat(`${match[1]}.${match[2]}`);
    };
    
    return getVersion(a) - getVersion(b);
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
   * 기본 Gemini 모델 (API 실패 시 사용) - 최신 Flash, Pro 2가지만
   */
  private getDefaultGeminiModels(): LLMModel[] {
    return [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        multimodal: true,
        available: true,
        description: 'Google의 가장 강력한 멀티모달 AI 모델'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        multimodal: true,
        available: true,
        description: '빠르고 효율적인 멀티모달 AI 모델'
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