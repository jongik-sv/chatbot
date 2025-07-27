// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChatSessionRepository } from '../../../lib/repositories/ChatSessionRepository';
import { MessageRepository } from '../../../lib/repositories/MessageRepository';
import { LLMService } from '../../../services/LLMService';
import { ChatRequest, ChatResponse, Message } from '../../../types';

const chatSessionRepo = new ChatSessionRepository();
const messageRepo = new MessageRepository();
const llmService = new LLMService();

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, model, mode, sessionId, files } = body;

    // 입력 검증
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: '메시지가 비어있습니다.' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: '모델이 선택되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 세션 관리
    let currentSession;
    
    if (sessionId) {
      // 기존 세션 사용
      currentSession = chatSessionRepo.getById(sessionId);
      if (!currentSession) {
        return NextResponse.json(
          { error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 세션의 모델이 변경된 경우 업데이트
      if (currentSession.modelUsed !== model) {
        currentSession = chatSessionRepo.update(sessionId, { modelUsed: model });
      }
    } else {
      // 새 세션 생성
      const sessionTitle = message.length > 50 
        ? message.substring(0, 50) + '...' 
        : message;
        
      currentSession = chatSessionRepo.create({
        userId: 1, // TODO: 실제 사용자 인증 구현 후 수정
        title: sessionTitle,
        mode: mode || 'chat',
        modelUsed: model,
        mentorId: undefined
      });
    }

    // 사용자 메시지 저장
    const userMessage = messageRepo.create({
      sessionId: currentSession.id,
      role: 'user',
      content: message,
      contentType: files && files.length > 0 ? 'image' : 'text',
      metadata: files && files.length > 0 ? { files: files.map(f => f.name) } : undefined
    });

    // 대화 컨텍스트 구성 (최근 메시지들)
    const recentMessages = messageRepo.getRecentMessages(currentSession.id, 10);
    const conversationHistory = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 현재 사용자 메시지 추가
    conversationHistory.push({
      role: 'user',
      content: message
    });

    let llmResponse;

    try {
      // 멀티모달 처리 (이미지가 있는 경우)
      if (files && files.length > 0) {
        // TODO: 실제 파일 처리 로직 구현
        // 현재는 텍스트만 처리
        llmResponse = await llmService.chat(conversationHistory, {
          model,
          temperature: 0.7,
          maxTokens: 2048
        });
      } else {
        // 일반 텍스트 채팅
        llmResponse = await llmService.chat(conversationHistory, {
          model,
          temperature: 0.7,
          maxTokens: 2048
        });
      }

      if (!llmResponse.success) {
        throw new Error(llmResponse.error || 'LLM 응답 생성 실패');
      }

      // AI 응답 저장
      const assistantMessage = messageRepo.create({
        sessionId: currentSession.id,
        role: 'assistant',
        content: llmResponse.content,
        contentType: 'text',
        metadata: {
          model: llmResponse.model,
          provider: llmResponse.provider,
          usage: llmResponse.usage
        }
      });

      // 세션 마지막 활동 시간 업데이트
      chatSessionRepo.updateLastActivity(currentSession.id);

      // 응답 구성
      const response: ChatResponse = {
        content: llmResponse.content,
        sessionId: currentSession.id,
        messageId: assistantMessage.id,
        artifacts: [], // TODO: 아티팩트 처리 구현
        sources: [] // TODO: RAG 소스 처리 구현
      };

      return NextResponse.json(response);

    } catch (llmError) {
      console.error('LLM 처리 오류:', llmError);
      
      // 오류 메시지 저장
      const errorMessage = messageRepo.create({
        sessionId: currentSession.id,
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
        contentType: 'text',
        metadata: {
          error: llmError instanceof Error ? llmError.message : '알 수 없는 오류',
          model,
          timestamp: new Date().toISOString()
        }
      });

      const response: ChatResponse = {
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
        sessionId: currentSession.id,
        messageId: errorMessage.id,
        artifacts: [],
        sources: []
      };

      return NextResponse.json(response, { status: 500 });
    }

  } catch (error) {
    console.error('채팅 API 오류:', error);
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 세션 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (sessionId) {
      // 특정 세션의 메시지들 조회
      const session = chatSessionRepo.getById(parseInt(sessionId));
      if (!session) {
        return NextResponse.json(
          { error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const messages = messageRepo.getBySessionId(session.id);
      
      return NextResponse.json({
        session,
        messages
      });
    } else if (userId) {
      // 사용자의 모든 세션 조회
      const sessions = chatSessionRepo.getByUserId(parseInt(userId));
      
      return NextResponse.json({
        sessions
      });
    } else {
      return NextResponse.json(
        { error: 'sessionId 또는 userId가 필요합니다.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('세션 조회 오류:', error);
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}