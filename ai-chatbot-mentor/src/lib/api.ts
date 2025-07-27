// lib/api.ts
import { ChatRequest, ChatResponse, LLMModel, Mentor } from '../types';

const API_BASE_URL = '/api';

export class ApiClient {
  /**
   * 채팅 메시지 전송
   */
  static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // 파일이 있는 경우 FormData 사용, 없으면 JSON 사용
    if (request.files && request.files.length > 0) {
      return this.sendMessageWithFiles(request);
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
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

    // 파일들 추가
    if (request.files) {
      for (const file of request.files) {
        formData.append('files', file);
      }
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
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
}