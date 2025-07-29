// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
// JavaScript Repository 사용 (히스토리 API와 호환성을 위해)
const ChatRepository = require('../../../lib/repositories/ChatRepository');
const RuleIntegration = require('../../../lib/services/RuleIntegration');
import { LLMService } from '../../../services/LLMService';
import { MentorContextService } from '../../../services/MentorContextService';
import { vectorSearchService } from '../../../services/VectorSearchService';
import { ArtifactService } from '../../../services/ArtifactService';
import { parseArtifactsFromContent } from '../../../utils/artifactParser';
import { detectContinuation, shouldUpdateExistingArtifact, enhancePromptForContinuation } from '../../../utils/continuationHandler';
import { ChatRequest, ChatResponse, Message } from '../../../types';
import { readFile } from 'fs/promises';
import path from 'path';

const chatRepo = new ChatRepository();
const llmService = new LLMService();
const mentorContextService = new MentorContextService();
const ruleIntegration = new RuleIntegration();

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
        mentorId: formData.get('mentorId') ? parseInt(formData.get('mentorId') as string) : undefined,
        userId: formData.get('userId') ? parseInt(formData.get('userId') as string) : undefined,
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

    const { message, model, mode, sessionId, mentorId, userId } = body;

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
      currentSession = chatRepo.getSession(sessionId);
      if (!currentSession) {
        return NextResponse.json(
          { error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 세션의 모델이 변경된 경우 업데이트
      if (currentSession.model_used !== model) {
        currentSession = chatRepo.updateSession(sessionId, { 
          title: currentSession.title,
          modelUsed: model 
        });
      }
    } else {
      // 새 세션 생성
      const sessionTitle = message.length > 50 
        ? message.substring(0, 50) + '...' 
        : message;
        
      currentSession = chatRepo.createSession({
        userId: userId || 1, // 기본 사용자 사용 (사용자 인증 구현 전까지)
        title: sessionTitle,
        mode: mode || 'chat',
        modelUsed: model,
        mentorId: mentorId
      });
    }

    // 멘토 컨텍스트 처리
    let mentorContext = null;
    let systemInstruction = undefined;
    
    if (mentorId) {
      try {
        mentorContext = await mentorContextService.createMentorContext(
          mentorId,
          currentSession.id,
          message,
          userId
        );
        systemInstruction = mentorContext.systemPrompt;
      } catch (error) {
        console.error('멘토 컨텍스트 생성 오류:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : '멘토 컨텍스트 생성 실패' },
          { status: 400 }
        );
      }
    }

    // 대화 컨텍스트 구성 (사용자 메시지 저장 전에 기존 히스토리 가져오기)
    let conversationHistory;
    
    if (mentorContext) {
      // 멘토별 대화 히스토리 사용
      conversationHistory = [...mentorContext.conversationHistory];
    } else {
      // 일반 대화 히스토리 사용 - 최근 20개 메시지 가져오기
      const recentMessages = chatRepo.getMessages(currentSession.id, { limit: 20 });
      conversationHistory = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        id: msg.id
      }));
    }

    // 연속 답변 감지 및 처리
    const continuationResult = detectContinuation(message, conversationHistory);
    let processedMessage = message;
    let continuationContext = null;

    if (continuationResult.isContinuation && continuationResult.combinedContent) {
      // 이전 메시지와 연결된 컨텍스트 처리
      const artifactUpdateInfo = shouldUpdateExistingArtifact(
        continuationResult.combinedContent,
        message
      );
      
      // 연속 작성을 위한 프롬프트 향상
      processedMessage = enhancePromptForContinuation(
        message,
        continuationResult.combinedContent,
        artifactUpdateInfo.shouldUpdate
      );

      continuationContext = {
        previousMessageId: continuationResult.previousMessageId,
        shouldUpdateArtifact: artifactUpdateInfo.shouldUpdate,
        previousContent: continuationResult.combinedContent
      };

      console.log('연속 답변 감지됨:', {
        previousMessageId: continuationResult.previousMessageId,
        shouldUpdateArtifact: artifactUpdateInfo.shouldUpdate
      });
    }

    // 룰 적용하여 프롬프트 향상 (연속 답변 처리된 메시지 사용)
    const ruleApplicationResult = await ruleIntegration.applyRulesToPrompt(processedMessage, {
      userId: userId,
      sessionId: currentSession.id,
      mentorId: mentorId,
      // 멘토 모드인 경우 일반 룰 제외 (멘토별 룰 우선)
      excludeCategories: mentorId ? ['general'] : []
    });

    // 향상된 프롬프트 사용
    const enhancedMessage = ruleApplicationResult.enhancedPrompt;

    // 현재 사용자 메시지 추가 (향상된 메시지 사용)
    conversationHistory.push({
      role: 'user',
      content: enhancedMessage
    });

    // 사용자 메시지 저장
    const userMessage = chatRepo.createMessage({
      sessionId: currentSession.id,
      role: 'user',
      content: message,
      contentType: uploadedFiles.length > 0 ? 'multimodal' : 'text',
      metadata: uploadedFiles.length > 0 ? { 
        files: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
      } : undefined
    });

    let llmResponse;

    try {
      // 문서 모드는 별도 RAG API 사용을 권장
      if (mode === 'document' || mode === 'rag') {
        return NextResponse.json(
          { 
            error: '문서 기반 대화는 /api/rag/chat 엔드포인트를 사용해주세요.',
            suggestion: 'Use /api/rag/chat endpoint for document-based conversations'
          },
          { status: 400 }
        );
      }
      // 멀티모달 처리 (파일이 있는 경우)
      else if (uploadedFiles.length > 0) {
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
          maxTokens: 2048,
          systemInstruction
        });
      }

      if (!llmResponse.success) {
        throw new Error(llmResponse.error || 'LLM 응답 생성 실패');
      }

      // AI 응답 저장 먼저 (메시지 ID 확보)
      const assistantMessage = chatRepo.createMessage({
        sessionId: currentSession.id,
        role: 'assistant',
        content: llmResponse.content,
        contentType: 'text',
        metadata: {
          model: llmResponse.model,
          provider: llmResponse.provider,
          usage: llmResponse.usage,
          mentorId: mentorId,
          mentorName: mentorContext?.mentor.name,
          appliedRules: ruleApplicationResult.appliedRules,
          rulesSummary: ruleApplicationResult.rulesSummary
        }
      });

      // AI 응답에서 아티팩트 추출 및 생성/업데이트 처리
      let contentToProcess = llmResponse.content;
      
      // 연속 답변인 경우 이전 내용과 함께 처리
      if (continuationContext?.shouldUpdateArtifact && continuationContext?.previousContent) {
        contentToProcess = continuationContext.previousContent + '\n\n' + llmResponse.content;
        console.log('연속 답변으로 처리: 이전 내용과 결합하여 아티팩트 업데이트');
      }

      const parsedArtifacts = parseArtifactsFromContent(
        contentToProcess,
        currentSession.id,
        assistantMessage.id
      );

      console.log('파싱된 아티팩트:', parsedArtifacts.artifacts.length, '개', 
                  continuationContext?.shouldUpdateArtifact ? '(연속 답변 모드)' : '');

      const createdArtifacts = [];
      
      for (const artifactData of parsedArtifacts.artifacts) {
        try {
          console.log('아티팩트 처리 중:', artifactData.title, artifactData.type);
          
          // 연속 답변이고 기존 아티팩트를 업데이트해야 하는 경우
          if (continuationContext?.shouldUpdateArtifact && continuationContext?.previousMessageId) {
            // 이전 메시지의 아티팩트 찾기
            const previousArtifacts = await ArtifactService.getArtifactsByMessageId(continuationContext.previousMessageId);
            const existingArtifact = previousArtifacts.find(existing => 
              existing.type === artifactData.type && 
              (existing.title === artifactData.title || 
               existing.language === artifactData.language)
            );

            if (existingArtifact) {
              // 기존 아티팩트 업데이트
              console.log('기존 아티팩트 업데이트:', existingArtifact.id);
              const updatedArtifact = await ArtifactService.updateArtifact(existingArtifact.id, {
                content: artifactData.content,
                title: artifactData.title || existingArtifact.title,
                updated_at: new Date().toISOString()
              });
              createdArtifacts.push(updatedArtifact);
              continue;
            }
          }
          
          // 새 아티팩트 생성
          const artifact = ArtifactService.createArtifact(artifactData);
          createdArtifacts.push(artifact);
          console.log('아티팩트 생성 완료:', artifact.id);
        } catch (error) {
          console.error('아티팩트 처리 오류:', error);
        }
      }

      console.log('총 처리된 아티팩트:', createdArtifacts.length, '개');

      // 메시지 메타데이터에 아티팩트 정보 추가 (필요시)
      if (createdArtifacts.length > 0) {
        // 메타데이터 업데이트 로직은 ChatRepository 구조에 따라 달라질 수 있음
        // 현재는 응답에서 아티팩트를 전달하는 것으로 충분
      }

      // 멘토 응답 후처리
      if (mentorId) {
        await mentorContextService.processMentorResponse(
          mentorId,
          currentSession.id,
          assistantMessage.id,
          llmResponse.content
        );
      }

      // 세션 마지막 활동 시간 업데이트
      chatRepo.updateSessionTimestamp(currentSession.id);

      // 응답 구성
      const response: ChatResponse = {
        content: llmResponse.content,
        sessionId: currentSession.id,
        messageId: assistantMessage.id,
        artifacts: createdArtifacts,
        sources: [], // TODO: RAG 소스 처리 구현
        // 룰 적용 정보 추가
        ruleInfo: {
          appliedRules: ruleApplicationResult.appliedRules,
          rulesSummary: ruleApplicationResult.rulesSummary,
          originalMessage: message, // 원본 메시지
          enhancedMessage: enhancedMessage // 룰 적용 후 메시지
        },
        // 연속 답변 정보 추가
        continuationInfo: continuationContext ? {
          isContinuation: true,
          previousMessageId: continuationContext.previousMessageId,
          wasArtifactUpdated: continuationContext.shouldUpdateArtifact,
          artifactsProcessed: createdArtifacts.length
        } : undefined
      };

      return NextResponse.json(response);

    } catch (llmError) {
      console.error('LLM 처리 오류:', llmError);
      
      // 오류 메시지 저장
      const errorMessage = chatRepo.createMessage({
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
      const session = chatRepo.getSession(parseInt(sessionId));
      if (!session) {
        return NextResponse.json(
          { error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const messages = chatRepo.getMessages(session.id);
      
      return NextResponse.json({
        session,
        messages
      });
    } else if (userId) {
      // 사용자의 모든 세션 조회
      const sessions = chatRepo.getSessions({ userId: parseInt(userId), limit: 100 });
      
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