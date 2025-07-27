// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChatSessionRepository } from '../../../lib/repositories/ChatSessionRepository';
import { MessageRepository } from '../../../lib/repositories/MessageRepository';
import { LLMService } from '../../../services/LLMService';
import { ChatRequest, ChatResponse, Message } from '../../../types';
import { readFile } from 'fs/promises';
import path from 'path';

const chatSessionRepo = new ChatSessionRepository();
const messageRepo = new MessageRepository();
const llmService = new LLMService();

export async function POST(request: NextRequest) {
  try {
    // FormData인지 JSON인지 확인
    const contentType = request.headers.get('content-type') || '';
    let body: ChatRequest;
    const uploadedFiles: unknown[] = [];

    if (contentType.includes('multipart/form-data')) {
      // FormData 처리 (파일 업로드가 있는 경우)
      const formData = await request.formData();
      
      body = {
        message: formData.get('message') as string,
        model: formData.get('model') as string,
        mode: formData.get('mode') as string,
        sessionId: formData.get('sessionId') ? parseInt(formData.get('sessionId') as string) : undefined,
        files: []
      };

      // 업로드된 파일들 처리
      const files = formData.getAll('files') as File[];
      for (const file of files) {
        if (file.size > 0) {
          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: await file.arrayBuffer()
          });
        }
      }
    } else {
      // JSON 처리
      body = await request.json();
    }

    const { message, model, mode, sessionId } = body;

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
        userId: 1, // 기본 사용자 사용 (사용자 인증 구현 전까지)
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
      contentType: uploadedFiles.length > 0 ? 'multimodal' : 'text',
      metadata: uploadedFiles.length > 0 ? { 
        files: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
      } : undefined
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
      // 멀티모달 처리 (파일이 있는 경우)
      if (uploadedFiles.length > 0) {
        // 이미지 파일 찾기
        const imageFile = uploadedFiles.find(file => file.type.startsWith('image/'));
        
        if (imageFile) {
          // 이미지가 있는 경우 멀티모달 모델 사용
          const isMultimodalModel = llmService.isMultimodalSupported(model);
          const targetModel = isMultimodalModel ? model : 'gemini-1.5-flash';
          
          // 이미지 데이터를 base64로 변환
          const base64Image = Buffer.from(imageFile.data).toString('base64');
          
          llmResponse = await llmService.generateWithImage(message, base64Image, {
            model: targetModel,
            temperature: 0.7,
            maxTokens: 2048,
            mimeType: imageFile.type
          });
          
          // 모델이 변경된 경우 알림
          if (targetModel !== model) {
            llmResponse.content = `[자동으로 ${targetModel} 모델로 전환됨]\n\n${llmResponse.content}`;
          }
        } else {
          // 이미지가 아닌 파일들 (음성, 문서 등)
          const audioFile = uploadedFiles.find(file => file.type.startsWith('audio/'));
          
          if (audioFile) {
            // 음성 파일 처리 (향후 Speech-to-Text 구현)
            llmResponse = await llmService.chat(conversationHistory, {
              model,
              temperature: 0.7,
              maxTokens: 2048,
              systemInstruction: '사용자가 음성 파일을 업로드했습니다. 음성 처리 기능은 현재 개발 중입니다.'
            });
          } else {
            // 기타 파일들
            llmResponse = await llmService.chat(conversationHistory, {
              model,
              temperature: 0.7,
              maxTokens: 2048,
              systemInstruction: `사용자가 다음 파일들을 업로드했습니다: ${uploadedFiles.map(f => f.name).join(', ')}`
            });
          }
        }
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