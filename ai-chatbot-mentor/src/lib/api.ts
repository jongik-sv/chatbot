// lib/api.ts
import { ChatRequest, ChatResponse, LLMModel, Mentor } from '../types';

const API_BASE_URL = '/api';

export class ApiClient {
  /**
   * 채팅 메시지 전송 (스트림)
   */
  static async sendMessageStream(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: ChatResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // 파일이 있는 경우 일반 전송 사용 (스트림 미지원)
      if (request.files && request.files.length > 0) {
        const response = await this.sendMessageWithFiles(request);
        onComplete(response);
        return;
      }

      // 문서 기반 대화인 경우 RAG 엔드포인트 사용
      const endpoint = (request.mode === 'document' || request.mode === 'rag' || (request.documentIds && request.documentIds.length > 0)) ? '/rag/chat' : '/chat';

      // 요청 데이터 구조화
      const requestData = {
        message: request.message,
        model: request.model,
        mode: request.mode || 'chat',
        stream: true, // 스트림 요청
        ...(request.sessionId && { sessionId: request.sessionId }),
        ...(request.mentorId && { mentorId: request.mentorId }),
        ...(request.documentIds && request.documentIds.length > 0 && { documentIds: request.documentIds })
      };

      console.log('API 스트림 요청 데이터:', requestData);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '메시지 전송에 실패했습니다.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('스트림을 읽을 수 없습니다.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let completeResponse: ChatResponse | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                if (completeResponse) {
                  onComplete(completeResponse);
                }
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'chunk') {
                  onChunk(parsed.content);
                } else if (parsed.type === 'complete') {
                  completeResponse = parsed.response;
                }
              } catch (e) {
                console.warn('스트림 파싱 오류:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (completeResponse) {
        onComplete(completeResponse);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.'));
    }
  }

  /**
   * 채팅 메시지 전송 (기존 방식)
   */
  static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // 파일이 있는 경우 FormData 사용, 없으면 JSON 사용
    if (request.files && request.files.length > 0) {
      return this.sendMessageWithFiles(request);
    }

    // 문서 기반 대화인 경우 RAG 엔드포인트 사용
    const endpoint = (request.mode === 'document' || request.mode === 'rag' || (request.documentIds && request.documentIds.length > 0)) ? '/rag/chat' : '/chat';

    // 요청 데이터 구조화
    const requestData = {
      message: request.message,
      model: request.model,
      mode: request.mode || 'chat',
      ...(request.sessionId && { sessionId: request.sessionId }),
      ...(request.mentorId && { mentorId: request.mentorId }),
      ...(request.documentIds && request.documentIds.length > 0 && { documentIds: request.documentIds })
    };

    console.log('API 요청 데이터:', requestData); // 디버깅용

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '메시지 전송에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 파일이 포함된 채팅 메시지 전송
   */
  static async sendMessageWithFiles(request: ChatRequest): Promise<ChatResponse> {
    const formData = new FormData();
    
    // 기본 필드 추가
    formData.append('message', request.message);
    formData.append('model', request.model);
    formData.append('mode', request.mode || 'chat');
    
    if (request.sessionId) {
      formData.append('sessionId', request.sessionId.toString());
    }

    if (request.mentorId) {
      formData.append('mentorId', request.mentorId.toString());
    }

    // 문서 ID들 추가
    if (request.documentIds && request.documentIds.length > 0) {
      formData.append('documentIds', JSON.stringify(request.documentIds));
    }

    // 파일들 추가
    if (request.files) {
      for (const file of request.files) {
        formData.append('files', file);
      }
    }

    // 문서 기반 대화인 경우 RAG 엔드포인트 사용
    const endpoint = (request.mode === 'document' || request.mode === 'rag' || (request.documentIds && request.documentIds.length > 0)) ? '/rag/chat' : '/chat';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData, // Content-Type 헤더는 자동으로 설정됨
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '파일 메시지 전송에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 파일 업로드
   */
  static async uploadFiles(files: File[]): Promise<{
    success: boolean;
    files: any[];
    message: string;
  }> {
    const formData = new FormData();
    
    for (const file of files) {
      formData.append('files', file);
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '파일 업로드에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 사용 가능한 모델 목록 조회
   */
  static async getAvailableModels(): Promise<{
    success: boolean;
    models: LLMModel[];
    status: any;
    count: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/models`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '모델 목록 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 세션 정보 조회
   */
  static async getSession(sessionId: number): Promise<{
    session: any;
    messages: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/chat?sessionId=${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 사용자의 모든 세션 조회
   */
  static async getUserSessions(userId: number): Promise<{
    sessions: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/chat?userId=${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 목록 조회에 실패했습니다.');
    }

    return response.json();
  }

  // ===== 대화 히스토리 관리 API =====

  /**
   * 채팅 세션 목록 조회
   */
  static async getChatSessions(params: {
    userId: number;
    limit?: number;
    offset?: number;
    mode?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    sessions: any[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const searchParams = new URLSearchParams({
      userId: params.userId.toString(),
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.offset && { offset: params.offset.toString() }),
      ...(params.mode && { mode: params.mode }),
      ...(params.search && { search: params.search })
    });

    const response = await fetch(`${API_BASE_URL}/sessions?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 목록 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 새 채팅 세션 생성
   */
  static async createChatSession(data: {
    title?: string;
    mode?: string;
    modelUsed?: string;
    mentorId?: number;
    userId?: number;
  }): Promise<{
    success: boolean;
    session: any;
  }> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 생성에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 특정 세션 상세 조회
   */
  static async getChatSessionDetail(sessionId: number, userId: number, includeMessages = true): Promise<{
    success: boolean;
    session: any;
    messages?: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}?userId=${userId}&includeMessages=${includeMessages}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 세션 제목 수정
   */
  static async updateChatSession(sessionId: number, data: {
    title: string;
    userId: number;
  }): Promise<{
    success: boolean;
    session: any;
  }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 수정에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 세션 삭제
   */
  static async deleteChatSession(sessionId: number, userId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}?userId=${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '세션 삭제에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 세션의 메시지 목록 조회
   */
  static async getChatMessages(sessionId: number, params: {
    userId: number;
    limit?: number;
    offset?: number;
    before?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    messages: any[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const searchParams = new URLSearchParams({
      userId: params.userId.toString(),
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.offset && { offset: params.offset.toString() }),
      ...(params.before && { before: params.before }),
      ...(params.search && { search: params.search })
    });

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '메시지 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 대화 내용 검색
   */
  static async searchConversations(userId: number, searchTerm: string, params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    success: boolean;
    results: any[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const searchParams = new URLSearchParams({
      userId: userId.toString(),
      search: searchTerm,
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.offset && { offset: params.offset.toString() })
    });

    const response = await fetch(`${API_BASE_URL}/sessions/search?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '검색에 실패했습니다.');
    }

    return response.json();
  }

  // ===== 멘토 관련 API =====

  /**
   * 멘토 목록 조회
   */
  static async getMentors(params?: {
    userId?: number;
    publicOnly?: boolean;
    search?: string;
  }): Promise<{
    success: boolean;
    data: Mentor[];
  }> {
    const searchParams = new URLSearchParams();
    
    if (params?.userId) {
      searchParams.append('userId', params.userId.toString());
    }
    
    if (params?.publicOnly) {
      searchParams.append('publicOnly', 'true');
    }
    
    if (params?.search) {
      searchParams.append('search', params.search);
    }

    const response = await fetch(`${API_BASE_URL}/mentors?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '멘토 목록 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 멘토 조회
   */
  static async getMentor(id: number, userId?: number): Promise<{
    success: boolean;
    data: Mentor;
  }> {
    const searchParams = new URLSearchParams();
    
    if (userId) {
      searchParams.append('userId', userId.toString());
    }

    const response = await fetch(`${API_BASE_URL}/mentors/${id}?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '멘토 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 멘토 생성
   */
  static async createMentor(mentorData: {
    name: string;
    description: string;
    personality: {
      traits: string[];
      communicationStyle: string;
      teachingApproach: string;
      responseStyle: string;
    };
    expertise: string[];
    mbtiType?: string;
    systemPrompt: string;
    isPublic?: boolean;
    userId?: number;
  }): Promise<{
    success: boolean;
    data: Mentor;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/mentors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mentorData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '멘토 생성에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 멘토 업데이트
   */
  static async updateMentor(id: number, mentorData: {
    name?: string;
    description?: string;
    personality?: {
      traits: string[];
      communicationStyle: string;
      teachingApproach: string;
      responseStyle: string;
    };
    expertise?: string[];
    mbtiType?: string;
    systemPrompt?: string;
    isPublic?: boolean;
    userId: number;
  }): Promise<{
    success: boolean;
    data: Mentor;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/mentors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mentorData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '멘토 업데이트에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 멘토 삭제
   */
  static async deleteMentor(id: number, userId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/mentors/${id}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '멘토 삭제에 실패했습니다.');
    }

    return response.json();
  }

  // ===== Gemini 모델 관련 API =====

  /**
   * 실시간 Gemini 모델 리스트 조회
   */
  static async getGeminiModels(options?: {
    forceRefresh?: boolean;
    includeDetails?: boolean;
  }): Promise<{
    success: boolean;
    models: LLMModel[];
    cached: boolean;
    cacheStatus: any;
    apiStatus?: any;
    timestamp: string;
    error?: string;
  }> {
    const searchParams = new URLSearchParams();
    
    if (options?.forceRefresh) {
      searchParams.append('refresh', 'true');
    }
    
    if (options?.includeDetails) {
      searchParams.append('details', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/models/gemini?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Gemini 모델 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 특정 Gemini 모델 상세 정보 조회
   */
  static async getGeminiModelDetails(modelId: string): Promise<{
    success: boolean;
    model: LLMModel;
    timestamp: string;
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/models/gemini/${modelId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '모델 상세 정보 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * Gemini 모델 캐시 초기화
   */
  static async clearGeminiModelCache(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/models/gemini`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '캐시 초기화에 실패했습니다.');
    }

    return response.json();
  }
}