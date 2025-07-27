/**
 * LLM 서비스 통합 레이어
 * Ollama와 Google Gemini API를 통합하여 관리
 */

const OllamaService = require('./OllamaService');
const GeminiService = require('./GeminiService');

class LLMService {
  constructor() {
    this.ollama = new OllamaService();
    this.gemini = new GeminiService();
    
    // 기본 설정
    this.defaultProvider = 'ollama';
    this.fallbackProvider = 'gemini';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1초
    
    // 모델별 제공자 매핑
    this.providerMapping = {
      // Ollama 모델들
      'llama2': 'ollama',
      'llama3': 'ollama', 
      'codellama': 'ollama',
      'mistral': 'ollama',
      'mixtral': 'ollama',
      'phi': 'ollama',
      'llava': 'ollama',
      'gemma': 'ollama',
      
      // Gemini 모델들
      'gemini-pro': 'gemini',
      'gemini-pro-vision': 'gemini',
      'gemini-1.5-pro': 'gemini',
      'gemini-1.5-flash': 'gemini'
    };
    
    // 모델별 기본 설정
    this.modelDefaults = {
      'llama2': { temperature: 0.7, maxTokens: 2048 },
      'llama3': { temperature: 0.7, maxTokens: 4096 },
      'codellama': { temperature: 0.1, maxTokens: 2048 },
      'mistral': { temperature: 0.7, maxTokens: 2048 },
      'llava': { temperature: 0.7, maxTokens: 2048 },
      'gemini-pro': { temperature: 0.7, maxTokens: 2048 },
      'gemini-1.5-pro': { temperature: 0.7, maxTokens: 8192 },
      'gemini-1.5-flash': { temperature: 0.7, maxTokens: 8192 }
    };
  }

  /**
   * 전체 서비스 상태 확인
   */
  async checkAllServices() {
    const [ollamaStatus, geminiStatus] = await Promise.all([
      this.ollama.checkConnection(),
      this.gemini.checkConnection()
    ]);

    return {
      ollama: ollamaStatus,
      gemini: geminiStatus,
      overall: ollamaStatus.connected || geminiStatus.connected ? 'healthy' : 'unhealthy'
    };
  }

  /**
   * 모든 사용 가능한 모델 조회
   */
  async getAllAvailableModels() {
    try {
      const [ollamaResult, geminiResult] = await Promise.all([
        this.ollama.getAvailableModels(),
        this.gemini.getAvailableModels()
      ]);

      const allModels = [];
      
      if (ollamaResult.success) {
        allModels.push(...ollamaResult.models);
      }
      
      if (geminiResult.success) {
        allModels.push(...geminiResult.models);
      }

      // 모델 정보 표준화
      const standardizedModels = allModels.map(model => ({
        ...model,
        provider: model.provider || this.getModelProvider(model.id),
        defaults: this.modelDefaults[model.id] || { temperature: 0.7, maxTokens: 2048 },
        available: true
      }));

      return {
        success: true,
        models: standardizedModels,
        count: standardizedModels.length,
        providers: {
          ollama: ollamaResult.success ? ollamaResult.count : 0,
          gemini: geminiResult.success ? geminiResult.count : 0
        }
      };
    } catch (error) {
      console.error('모델 목록 조회 실패:', error.message);
      return {
        success: false,
        models: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * 모델의 제공자 확인
   */
  getModelProvider(modelId) {
    return this.providerMapping[modelId] || 
           (modelId.includes('gemini') ? 'gemini' : 'ollama');
  }

  /**
   * 적절한 서비스 선택
   */
  getServiceForModel(modelId) {
    const provider = this.getModelProvider(modelId);
    return provider === 'gemini' ? this.gemini : this.ollama;
  }

  /**
   * 텍스트 생성 (통합)
   */
  async generateText(prompt, options = {}) {
    const {
      model = 'llama2',
      provider = null,
      fallback = true,
      systemInstruction = '',
      ...otherOptions
    } = options;

    // 모델 기본값 적용
    const modelDefaults = this.modelDefaults[model] || {};
    const finalOptions = { ...modelDefaults, ...otherOptions };

    let targetProvider = provider || this.getModelProvider(model);
    let service = targetProvider === 'gemini' ? this.gemini : this.ollama;

    // 첫 번째 시도
    try {
      let result;
      
      if (targetProvider === 'gemini') {
        result = await service.generateText(prompt, {
          model,
          systemInstruction,
          ...finalOptions
        });
      } else {
        result = await service.generateText(prompt, {
          model,
          system: systemInstruction,
          ...finalOptions
        });
      }

      if (result.success) {
        return {
          ...result,
          provider: targetProvider,
          model
        };
      } else {
        throw new Error(result.error || '알 수 없는 오류');
      }
    } catch (error) {
      console.warn(`${targetProvider} 서비스 실패:`, error.message);

      // 폴백 시도
      if (fallback && targetProvider !== this.fallbackProvider) {
        console.log(`${this.fallbackProvider}로 폴백 시도...`);
        
        try {
          const fallbackService = this.fallbackProvider === 'gemini' ? this.gemini : this.ollama;
          const fallbackModel = this.getFallbackModel(model, this.fallbackProvider);
          
          let result;
          
          if (this.fallbackProvider === 'gemini') {
            result = await fallbackService.generateText(prompt, {
              model: fallbackModel,
              systemInstruction,
              ...finalOptions
            });
          } else {
            result = await fallbackService.generateText(prompt, {
              model: fallbackModel,
              system: systemInstruction,
              ...finalOptions
            });
          }

          if (result.success) {
            return {
              ...result,
              provider: this.fallbackProvider,
              model: fallbackModel,
              fallback: true,
              originalError: error.message
            };
          }
        } catch (fallbackError) {
          console.error('폴백도 실패:', fallbackError.message);
        }
      }

      return {
        success: false,
        content: '',
        error: error.message,
        provider: targetProvider,
        model
      };
    }
  }

  /**
   * 멀티모달 생성 (통합)
   */
  async generateWithImage(prompt, imageData, options = {}) {
    const {
      model = 'gemini-1.5-flash',
      provider = null,
      fallback = true,
      systemInstruction = '',
      mimeType = 'image/jpeg',
      ...otherOptions
    } = options;

    let targetProvider = provider || this.getModelProvider(model);
    
    // 멀티모달 지원 확인
    if (targetProvider === 'ollama' && !this.ollama.isMultimodalModel(model)) {
      // Ollama 모델이 멀티모달을 지원하지 않으면 Gemini로 자동 전환
      targetProvider = 'gemini';
      console.log(`${model}은 멀티모달을 지원하지 않음. Gemini로 전환.`);
    }

    const service = targetProvider === 'gemini' ? this.gemini : this.ollama;
    const finalOptions = { ...this.modelDefaults[model], ...otherOptions };

    try {
      let result;
      
      if (targetProvider === 'gemini') {
        result = await service.generateWithImage(prompt, imageData, {
          model: model.includes('gemini') ? model : 'gemini-1.5-flash',
          systemInstruction,
          mimeType,
          ...finalOptions
        });
      } else {
        result = await service.generateWithImage(prompt, imageData, {
          model,
          system: systemInstruction,
          ...finalOptions
        });
      }

      if (result.success) {
        return {
          ...result,
          provider: targetProvider,
          model
        };
      } else {
        throw new Error(result.error || '알 수 없는 오류');
      }
    } catch (error) {
      console.warn(`${targetProvider} 멀티모달 생성 실패:`, error.message);

      // 폴백 시도 (Gemini로만)
      if (fallback && targetProvider !== 'gemini') {
        console.log('Gemini로 폴백 시도...');
        
        try {
          const result = await this.gemini.generateWithImage(prompt, imageData, {
            model: 'gemini-1.5-flash',
            systemInstruction,
            mimeType,
            ...finalOptions
          });

          if (result.success) {
            return {
              ...result,
              provider: 'gemini',
              model: 'gemini-1.5-flash',
              fallback: true,
              originalError: error.message
            };
          }
        } catch (fallbackError) {
          console.error('Gemini 폴백도 실패:', fallbackError.message);
        }
      }

      return {
        success: false,
        content: '',
        error: error.message,
        provider: targetProvider,
        model
      };
    }
  }

  /**
   * 채팅 (통합)
   */
  async chat(messages, options = {}) {
    const {
      model = 'llama2',
      provider = null,
      fallback = true,
      systemInstruction = '',
      ...otherOptions
    } = options;

    let targetProvider = provider || this.getModelProvider(model);
    const service = targetProvider === 'gemini' ? this.gemini : this.ollama;
    const finalOptions = { ...this.modelDefaults[model], ...otherOptions };

    try {
      let result;
      
      if (targetProvider === 'gemini') {
        // 시스템 메시지를 systemInstruction으로 변환
        let systemMsg = systemInstruction;
        const systemMessage = messages.find(msg => msg.role === 'system');
        if (systemMessage) {
          systemMsg = systemMessage.content;
        }
        
        const chatMessages = messages.filter(msg => msg.role !== 'system');
        
        result = await service.chat(chatMessages, {
          model,
          systemInstruction: systemMsg,
          ...finalOptions
        });
      } else {
        result = await service.chat(messages, {
          model,
          ...finalOptions
        });
      }

      if (result.success) {
        return {
          ...result,
          provider: targetProvider,
          model
        };
      } else {
        throw new Error(result.error || '알 수 없는 오류');
      }
    } catch (error) {
      console.warn(`${targetProvider} 채팅 실패:`, error.message);

      // 폴백 시도
      if (fallback && targetProvider !== this.fallbackProvider) {
        console.log(`${this.fallbackProvider}로 폴백 시도...`);
        
        try {
          const fallbackService = this.fallbackProvider === 'gemini' ? this.gemini : this.ollama;
          const fallbackModel = this.getFallbackModel(model, this.fallbackProvider);
          
          let result;
          
          if (this.fallbackProvider === 'gemini') {
            let systemMsg = systemInstruction;
            const systemMessage = messages.find(msg => msg.role === 'system');
            if (systemMessage) {
              systemMsg = systemMessage.content;
            }
            
            const chatMessages = messages.filter(msg => msg.role !== 'system');
            
            result = await fallbackService.chat(chatMessages, {
              model: fallbackModel,
              systemInstruction: systemMsg,
              ...finalOptions
            });
          } else {
            result = await fallbackService.chat(messages, {
              model: fallbackModel,
              ...finalOptions
            });
          }

          if (result.success) {
            return {
              ...result,
              provider: this.fallbackProvider,
              model: fallbackModel,
              fallback: true,
              originalError: error.message
            };
          }
        } catch (fallbackError) {
          console.error('폴백도 실패:', fallbackError.message);
        }
      }

      return {
        success: false,
        message: { role: 'assistant', content: '' },
        error: error.message,
        provider: targetProvider,
        model
      };
    }
  }

  /**
   * 폴백 모델 선택
   */
  getFallbackModel(originalModel, targetProvider) {
    if (targetProvider === 'gemini') {
      // Ollama -> Gemini 폴백
      if (originalModel.includes('llava') || originalModel.includes('vision')) {
        return 'gemini-1.5-flash'; // 멀티모달용
      }
      return 'gemini-1.5-flash'; // 일반적인 경우
    } else {
      // Gemini -> Ollama 폴백
      return 'llama2'; // 기본 Ollama 모델
    }
  }

  /**
   * 모델이 멀티모달을 지원하는지 확인
   */
  isMultimodalSupported(modelId) {
    const provider = this.getModelProvider(modelId);
    
    if (provider === 'gemini') {
      return this.gemini.availableModels.find(m => 
        m.id === modelId && m.capabilities.multimodal
      ) !== undefined;
    } else {
      return this.ollama.isMultimodalModel(modelId);
    }
  }

  /**
   * 스트리밍 지원 확인
   */
  isStreamingSupported(modelId) {
    const provider = this.getModelProvider(modelId);
    
    if (provider === 'gemini') {
      const model = this.gemini.availableModels.find(m => m.id === modelId);
      return model ? model.capabilities.streaming : true;
    } else {
      return true; // Ollama는 모든 모델에서 스트리밍 지원
    }
  }

  /**
   * 토큰 한계 확인
   */
  getTokenLimit(modelId) {
    const provider = this.getModelProvider(modelId);
    
    if (provider === 'gemini') {
      const model = this.gemini.availableModels.find(m => m.id === modelId);
      return model ? model.capabilities.maxTokens : 32768;
    } else {
      // Ollama 모델의 일반적인 토큰 한계
      return 4096;
    }
  }

  /**
   * 사용 통계 수집
   */
  getUsageStats() {
    return {
      totalRequests: this.totalRequests || 0,
      successfulRequests: this.successfulRequests || 0,
      failedRequests: this.failedRequests || 0,
      fallbackRequests: this.fallbackRequests || 0,
      providerUsage: this.providerUsage || { ollama: 0, gemini: 0 }
    };
  }

  /**
   * 서비스 설정 업데이트
   */
  updateConfiguration(config) {
    if (config.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    }
    
    if (config.fallbackProvider) {
      this.fallbackProvider = config.fallbackProvider;
    }
    
    if (config.retryAttempts) {
      this.retryAttempts = config.retryAttempts;
    }
    
    if (config.retryDelay) {
      this.retryDelay = config.retryDelay;
    }
    
    if (config.modelDefaults) {
      this.modelDefaults = { ...this.modelDefaults, ...config.modelDefaults };
    }
  }
}

module.exports = LLMService;