/**
 * Ollama API 클라이언트 서비스
 * 로컬 Ollama 서버와의 통신을 담당
 */

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.timeout = 30000; // 30초 타임아웃
  }

  /**
   * Ollama 서버 연결 상태 확인
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return { connected: true, status: 'healthy' };
    } catch (error) {
      console.error('Ollama 연결 실패:', error.message);
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
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`모델 목록 조회 실패: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // 모델 정보를 표준화된 형태로 변환
      const models = data.models?.map(model => ({
        id: model.name,
        name: model.name,
        provider: 'ollama',
        size: model.size,
        modified_at: model.modified_at,
        digest: model.digest,
        details: model.details || {},
        capabilities: {
          text: true,
          multimodal: this.isMultimodalModel(model.name),
          streaming: true
        }
      })) || [];

      return {
        success: true,
        models,
        count: models.length
      };
    } catch (error) {
      console.error('Ollama 모델 목록 조회 실패:', error.message);
      return {
        success: false,
        models: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * 멀티모달 모델인지 확인
   */
  isMultimodalModel(modelName) {
    const multimodalModels = [
      'llava', 'bakllava', 'moondream', 'llava-phi3', 'llava-llama3'
    ];
    return multimodalModels.some(name => 
      modelName.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * 텍스트 생성 (스트리밍)
   */
  async generateText(prompt, options = {}) {
    const {
      model = 'llama2',
      system = '',
      context = [],
      stream = true,
      temperature = 0.7,
      max_tokens = 2048,
      top_p = 0.9,
      top_k = 40,
      repeat_penalty = 1.1,
      onToken = null,
      onComplete = null,
      onError = null
    } = options;

    try {
      const requestBody = {
        model,
        prompt,
        system: system || undefined,
        context: context.length > 0 ? context : undefined,
        stream,
        options: {
          temperature,
          num_predict: max_tokens,
          top_p,
          top_k,
          repeat_penalty
        }
      };

      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama API 오류: HTTP ${response.status}`);
      }

      if (stream) {
        return await this.handleStreamResponse(response, onToken, onComplete, onError);
      } else {
        const data = await response.json();
        return {
          success: true,
          content: data.response,
          model: data.model,
          context: data.context,
          done: data.done,
          total_duration: data.total_duration,
          load_duration: data.load_duration,
          prompt_eval_count: data.prompt_eval_count,
          prompt_eval_duration: data.prompt_eval_duration,
          eval_count: data.eval_count,
          eval_duration: data.eval_duration
        };
      }
    } catch (error) {
      console.error('Ollama 텍스트 생성 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }

  /**
   * 스트리밍 응답 처리
   */
  async handleStreamResponse(response, onToken, onComplete, onError) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let lastContext = null;
    let stats = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.response) {
              fullContent += data.response;
              if (onToken) onToken(data.response);
            }

            if (data.context) {
              lastContext = data.context;
            }

            if (data.done) {
              stats = {
                total_duration: data.total_duration,
                load_duration: data.load_duration,
                prompt_eval_count: data.prompt_eval_count,
                prompt_eval_duration: data.prompt_eval_duration,
                eval_count: data.eval_count,
                eval_duration: data.eval_duration
              };
            }
          } catch (parseError) {
            console.warn('JSON 파싱 오류:', parseError.message);
          }
        }
      }

      const result = {
        success: true,
        content: fullContent,
        context: lastContext,
        ...stats
      };

      if (onComplete) onComplete(result);
      return result;

    } catch (error) {
      console.error('스트리밍 처리 오류:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        content: fullContent,
        error: error.message
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 멀티모달 생성 (이미지 포함)
   */
  async generateWithImage(prompt, imageData, options = {}) {
    const {
      model = 'llava',
      system = '',
      temperature = 0.7,
      max_tokens = 2048,
      stream = false,
      onToken = null,
      onComplete = null,
      onError = null
    } = options;

    try {
      // 이미지를 base64로 인코딩 (필요시)
      let base64Image = imageData;
      if (typeof imageData !== 'string') {
        // Buffer나 기타 형태의 이미지 데이터를 base64로 변환
        base64Image = Buffer.from(imageData).toString('base64');
      }

      const requestBody = {
        model,
        prompt,
        system: system || undefined,
        images: [base64Image],
        stream,
        options: {
          temperature,
          num_predict: max_tokens
        }
      };

      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama 멀티모달 API 오류: HTTP ${response.status}`);
      }

      if (stream) {
        return await this.handleStreamResponse(response, onToken, onComplete, onError);
      } else {
        const data = await response.json();
        return {
          success: true,
          content: data.response,
          model: data.model,
          done: data.done
        };
      }
    } catch (error) {
      console.error('Ollama 멀티모달 생성 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }

  /**
   * 채팅 형태로 대화 (대화 기록 유지)
   */
  async chat(messages, options = {}) {
    const {
      model = 'llama2',
      stream = true,
      temperature = 0.7,
      max_tokens = 2048,
      onToken = null,
      onComplete = null,
      onError = null
    } = options;

    try {
      const requestBody = {
        model,
        messages: messages.map(msg => ({
          role: msg.role, // 'user', 'assistant', 'system'
          content: msg.content,
          images: msg.images || undefined
        })),
        stream,
        options: {
          temperature,
          num_predict: max_tokens
        }
      };

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama Chat API 오류: HTTP ${response.status}`);
      }

      if (stream) {
        return await this.handleChatStreamResponse(response, onToken, onComplete, onError);
      } else {
        const data = await response.json();
        return {
          success: true,
          message: data.message,
          done: data.done,
          total_duration: data.total_duration,
          load_duration: data.load_duration,
          prompt_eval_count: data.prompt_eval_count,
          prompt_eval_duration: data.prompt_eval_duration,
          eval_count: data.eval_count,
          eval_duration: data.eval_duration
        };
      }
    } catch (error) {
      console.error('Ollama 채팅 실패:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        message: { role: 'assistant', content: '' },
        error: error.message
      };
    }
  }

  /**
   * 채팅 스트리밍 응답 처리
   */
  async handleChatStreamResponse(response, onToken, onComplete, onError) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let message = { role: 'assistant', content: '' };
    let stats = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.message?.content) {
              const token = data.message.content;
              fullContent += token;
              message.content = fullContent;
              if (onToken) onToken(token);
            }

            if (data.done) {
              stats = {
                total_duration: data.total_duration,
                load_duration: data.load_duration,
                prompt_eval_count: data.prompt_eval_count,
                prompt_eval_duration: data.prompt_eval_duration,
                eval_count: data.eval_count,
                eval_duration: data.eval_duration
              };
            }
          } catch (parseError) {
            console.warn('JSON 파싱 오류:', parseError.message);
          }
        }
      }

      const result = {
        success: true,
        message,
        ...stats
      };

      if (onComplete) onComplete(result);
      return result;

    } catch (error) {
      console.error('채팅 스트리밍 처리 오류:', error.message);
      if (onError) onError(error);
      return {
        success: false,
        message: { role: 'assistant', content: fullContent },
        error: error.message
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 모델 다운로드/풀
   */
  async pullModel(modelName, onProgress = null) {
    try {
      const response = await fetch(`${this.baseURL}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`모델 다운로드 실패: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (onProgress) onProgress(data);
            
            if (data.status === 'success') {
              return { success: true, message: '모델 다운로드 완료' };
            }
          } catch (parseError) {
            console.warn('JSON 파싱 오류:', parseError.message);
          }
        }
      }

      return { success: true, message: '모델 다운로드 완료' };
    } catch (error) {
      console.error('모델 다운로드 실패:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 모델 삭제
   */
  async deleteModel(modelName) {
    try {
      const response = await fetch(`${this.baseURL}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`모델 삭제 실패: HTTP ${response.status}`);
      }

      return { success: true, message: '모델 삭제 완료' };
    } catch (error) {
      console.error('모델 삭제 실패:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = OllamaService;