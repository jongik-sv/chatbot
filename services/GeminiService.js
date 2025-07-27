/**
 * Google Gemini API 클라이언트 서비스
 * Google Gemini API와의 통신을 담당
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    
    if (!this.apiKey) {
      console.warn('Google API 키가 설정되지 않았습니다. Gemini 서비스를 사용할 수 없습니다.');
      this.genAI = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // 안전 설정
    this.safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    // 사용 가능한 모델들
    this.availableModels = [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        capabilities: {
          text: true,
          multimodal: true,
          streaming: true,
          maxTokens: 2097152, // 2M tokens
          supportedFormats: ['text', 'image', 'audio', 'video']
        }
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        capabilities: {
          text: true,
          multimodal: true,
          streaming: true,
          maxTokens: 1048576, // 1M tokens
          supportedFormats: ['text', 'image', 'audio', 'video']
        }
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'google',
        capabilities: {
          text: true,
          multimodal: false,
          streaming: true,
          maxTokens: 32768,
          supportedFormats: ['text']
        }
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        provider: 'google',
        capabilities: {
          text: true,
          multimodal: true,
          streaming: false,
          maxTokens: 16384,
          supportedFormats: ['text', 'image']
        }
      }
    ];
  }

  /**
   * API 연결 상태 확인
   */
  async checkConnection() {
    try {
      if (!this.genAI) {
        return {
          connected: false,
          status: 'unhealthy',
          error: 'Google API 키가 설정되지 않음'
        };
      }

      // 간단한 텍스트 생성으로 연결 테스트
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent('Test connection');
      
      return {
        connected: true,
        status: 'healthy',
        response: result.response.text()
      };
    } catch (error) {
      console.error('Gemini 연결 실패:', error.message);
      return {
        connected: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 사용 가능한 모델 목록 조회
   */
  async getAvailableModels() {
    try {
      if (!this.genAI) {
        return {
          success: false,
          models: [],
          count: 0,
          error: 'Google API 키가 설정되지 않음'
        };
      }

      return {
        success: true,
        models: this.availableModels,
        count: this.availableModels.length
      };
    } catch (error) {
      console.error('Gemini 모델 목록 조회 실패:', error.message);
      return {
        success: false,
        models: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * 텍스트 생성
   */
  async generateText(prompt, options = {}) {
    const {
      model = 'gemini-1.5-flash',
      temperature = 0.7,
      maxOutputTokens = 2048,
      topP = 0.8,
      topK = 40,
      systemInstruction = '',
      stream = false,
      onToken = null,
      onComplete = null,
      onError = null
    } = options;

    try {
      if (!this.genAI) {
        throw new Error('Google API 키가 설정되지 않음');
      }

      const generationConfig = {
        temperature,
        topP,
        topK,
        maxOutputTokens,
      };

      const modelConfig = {
        model,
        generationConfig,
        safetySettings: this.safetySettings,
      };

      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      const genModel = this.genAI.getGenerativeModel(modelConfig);

      if (stream) {
        return await this.generateStreamingText(genModel, prompt, onToken, onComplete, onError);
      } else {
        const result = await genModel.generateContent(prompt);
        const response = await result.response;
        
        return {
          success: true,
          content: response.text(),
          model,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0
          },
          finishReason: response.candidates?.[0]?.finishReason || 'STOP'
        };
      }
    } catch (error) {
      console.error('Gemini 텍스트 생성 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }

  /**
   * 스트리밍 텍스트 생성
   */
  async generateStreamingText(model, prompt, onToken, onComplete, onError) {
    try {
      const result = await model.generateContentStream(prompt);
      let fullContent = '';
      let usage = {};

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;
        
        if (onToken) onToken(chunkText);
      }

      const finalResponse = await result.response;
      usage = {
        promptTokens: finalResponse.usageMetadata?.promptTokenCount || 0,
        completionTokens: finalResponse.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: finalResponse.usageMetadata?.totalTokenCount || 0
      };

      const resultData = {
        success: true,
        content: fullContent,
        usage,
        finishReason: finalResponse.candidates?.[0]?.finishReason || 'STOP'
      };

      if (onComplete) onComplete(resultData);
      return resultData;

    } catch (error) {
      console.error('Gemini 스트리밍 생성 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }

  /**
   * 멀티모달 생성 (텍스트 + 이미지)
   */
  async generateWithImage(prompt, imageData, options = {}) {
    const {
      model = 'gemini-1.5-flash',
      temperature = 0.7,
      maxOutputTokens = 2048,
      mimeType = 'image/jpeg',
      systemInstruction = '',
      stream = false,
      onToken = null,
      onComplete = null,
      onError = null
    } = options;

    try {
      if (!this.genAI) {
        throw new Error('Google API 키가 설정되지 않음');
      }

      // 이미지 데이터 처리
      let base64Data = imageData;
      if (Buffer.isBuffer(imageData)) {
        base64Data = imageData.toString('base64');
      } else if (typeof imageData === 'string' && !imageData.startsWith('data:')) {
        // base64 문자열인 경우 그대로 사용
      } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // data URL인 경우 base64 부분만 추출
        base64Data = imageData.split(',')[1];
      }

      const generationConfig = {
        temperature,
        maxOutputTokens,
      };

      const modelConfig = {
        model,
        generationConfig,
        safetySettings: this.safetySettings,
      };

      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      const genModel = this.genAI.getGenerativeModel(modelConfig);

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };

      const parts = [prompt, imagePart];

      if (stream) {
        const result = await genModel.generateContentStream(parts);
        let fullContent = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullContent += chunkText;
          
          if (onToken) onToken(chunkText);
        }

        const finalResponse = await result.response;
        const resultData = {
          success: true,
          content: fullContent,
          model,
          usage: {
            promptTokens: finalResponse.usageMetadata?.promptTokenCount || 0,
            completionTokens: finalResponse.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: finalResponse.usageMetadata?.totalTokenCount || 0
          },
          finishReason: finalResponse.candidates?.[0]?.finishReason || 'STOP'
        };

        if (onComplete) onComplete(resultData);
        return resultData;
      } else {
        const result = await genModel.generateContent(parts);
        const response = await result.response;
        
        return {
          success: true,
          content: response.text(),
          model,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0
          },
          finishReason: response.candidates?.[0]?.finishReason || 'STOP'
        };
      }
    } catch (error) {
      console.error('Gemini 멀티모달 생성 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }

  /**
   * 채팅 형태로 대화
   */
  async chat(messages, options = {}) {
    const {
      model = 'gemini-1.5-flash',
      temperature = 0.7,
      maxOutputTokens = 2048,
      systemInstruction = '',
      stream = false,
      onToken = null,
      onComplete = null,
      onError = null
    } = options;

    try {
      if (!this.genAI) {
        throw new Error('Google API 키가 설정되지 않음');
      }

      const generationConfig = {
        temperature,
        maxOutputTokens,
      };

      const modelConfig = {
        model,
        generationConfig,
        safetySettings: this.safetySettings,
      };

      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      const genModel = this.genAI.getGenerativeModel(modelConfig);
      
      // 채팅 세션 시작
      const chatSession = genModel.startChat({
        history: this.convertMessagesToHistory(messages.slice(0, -1)), // 마지막 메시지 제외
      });

      const lastMessage = messages[messages.length - 1];
      const userMessage = lastMessage.content;

      if (stream) {
        const result = await chatSession.sendMessageStream(userMessage);
        let fullContent = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullContent += chunkText;
          
          if (onToken) onToken(chunkText);
        }

        const finalResponse = await result.response;
        const resultData = {
          success: true,
          message: {
            role: 'assistant',
            content: fullContent
          },
          model,
          usage: {
            promptTokens: finalResponse.usageMetadata?.promptTokenCount || 0,
            completionTokens: finalResponse.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: finalResponse.usageMetadata?.totalTokenCount || 0
          },
          finishReason: finalResponse.candidates?.[0]?.finishReason || 'STOP'
        };

        if (onComplete) onComplete(resultData);
        return resultData;
      } else {
        const result = await chatSession.sendMessage(userMessage);
        const response = await result.response;
        
        return {
          success: true,
          message: {
            role: 'assistant',
            content: response.text()
          },
          model,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0
          },
          finishReason: response.candidates?.[0]?.finishReason || 'STOP'
        };
      }
    } catch (error) {
      console.error('Gemini 채팅 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        message: { role: 'assistant', content: '' },
        error: error.message
      };
    }
  }

  /**
   * 메시지 배열을 Gemini 채팅 히스토리 형식으로 변환
   */
  convertMessagesToHistory(messages) {
    const history = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // 시스템 메시지는 systemInstruction으로 처리되므로 히스토리에 포함하지 않음
        continue;
      }
      
      history.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      });
    }
    
    return history;
  }

  /**
   * 안전 설정 업데이트
   */
  updateSafetySettings(newSettings) {
    this.safetySettings = newSettings;
  }

  /**
   * 토큰 수 계산 (추정)
   */
  estimateTokens(text) {
    // 대략적인 토큰 수 계산 (1 토큰 ≈ 4자)
    return Math.ceil(text.length / 4);
  }

  /**
   * 지원되는 파일 형식 확인
   */
  isSupportedFileType(mimeType, modelId = 'gemini-1.5-flash') {
    const model = this.availableModels.find(m => m.id === modelId);
    if (!model || !model.capabilities.multimodal) {
      return false;
    }

    const supportedTypes = {
      'image/jpeg': true,
      'image/png': true,
      'image/webp': true,
      'image/heic': true,
      'image/heif': true,
      'video/mp4': true,
      'video/mpeg': true,
      'video/quicktime': true,
      'video/avi': true,
      'video/x-flv': true,
      'video/mpg': true,
      'video/webm': true,
      'video/wmv': true,
      'video/3gpp': true,
      'audio/wav': true,
      'audio/mp3': true,
      'audio/aiff': true,
      'audio/aac': true,
      'audio/ogg': true,
      'audio/flac': true
    };

    return supportedTypes[mimeType] || false;
  }
}

module.exports = GeminiService;