// lib/api.ts
import { ChatRequest, ChatResponse, LLMModel } from '../types';

const API_BASE_URL = '/api';

export class ApiClient {
  /**
   * 채팅 메시지 전송
   */
  static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
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
}