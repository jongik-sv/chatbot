// app/api/rag/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/services/VectorSearchService';
import { PromptLoader } from '@/utils/promptLoader';

// LLM 서비스 import
import { LLMService } from '@/services/LLMService';

// JavaScript Repository 사용 (히스토리 API와 호환성을 위해)
const ChatRepository = require('../../../../lib/repositories/ChatRepository');

/**
 * 실제 스트림 응답 생성 - LLM으로부터 받은 토큰을 실시간으로 전송
 */
function createRealStreamResponse(
  llmService: any,
  messages: any[],
  options: any,
  finalResponseData: any
): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = '';
        
        // LLM 서비스에서 실제 스트리밍으로 응답 받기
        await llmService.chatStream(messages, {
          ...options,
          onToken: (token: string) => {
            // 실시간으로 받은 토큰을 즉시 전송
            const data = `data: ${JSON.stringify({ type: 'chunk', content: token })}\n\n`;
            controller.enqueue(encoder.encode(data));
            fullContent += token;
          },
          onComplete: (result: any) => {
            // 완료 정보 전송
            const completeResponse = {
              ...finalResponseData,
              response: fullContent
            };
            const completeData = `data: ${JSON.stringify({ type: 'complete', response: completeResponse })}\n\n`;
            controller.enqueue(encoder.encode(completeData));
            
            // 스트림 종료
            const doneData = `data: [DONE]\n\n`;
            controller.enqueue(encoder.encode(doneData));
            controller.close();
          },
          onError: (error: Error) => {
            // 에러 전송
            const errorData = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        });
      } catch (error) {
        // 초기 에러 처리
        const errorData = `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : '스트리밍 오류' })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      model = process.env.RAG_DEFAULT_MODEL || 'gemini-2.0-flash-exp',
      documentIds, 
      topK = parseInt(process.env.RAG_TOP_K || '5'), 
      threshold = parseFloat(process.env.RAG_THRESHOLD || '0.3'),
      sessionId,
      userId = 1,
      stream = false
    } = await request.json();

    // RAG 설정 값 유효성 검증
    if (topK <= 0 || topK > 50) {
      return NextResponse.json(
        { success: false, error: 'topK 값은 1-50 범위여야 합니다.' },
        { status: 400 }
      );
    }

    if (threshold < 0 || threshold > 1) {
      return NextResponse.json(
        { success: false, error: 'threshold 값은 0-1 범위여야 합니다.' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    // ChatRepository 인스턴스 생성
    const chatRepo = new ChatRepository();

    // 세션 관리
    let currentSession;
    
    if (sessionId) {
      // 기존 세션 사용
      currentSession = chatRepo.getSession(sessionId);
      if (!currentSession) {
        return NextResponse.json(
          { success: false, error: '세션을 찾을 수 없습니다.' },
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
        userId: userId,
        title: sessionTitle,
        mode: 'document',
        modelUsed: model,
        mentorId: null
      });
    }

    // 대화 컨텍스트 구성 (사용자 메시지 저장 전에 기존 히스토리 가져오기)
    const recentMessages = chatRepo.getMessages(currentSession.id, { limit: 10 });
    const conversationHistory = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 현재 사용자 메시지 추가
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // 사용자 메시지 저장
    const userMessage = chatRepo.createMessage({
      sessionId: currentSession.id,
      role: 'user',
      content: message,
      contentType: 'text',
      metadata: {
        documentIds: documentIds,
        ragQuery: true
      }
    });

    // 1. 관련 문서 검색
    console.log('RAG API - 검색 시작:', {
      message: message.substring(0, 100),
      documentIds,
      topK: topK,
      threshold: threshold,
      model: model,
      configSource: {
        topK: process.env.RAG_TOP_K ? 'env' : 'default',
        threshold: process.env.RAG_THRESHOLD ? 'env' : 'default',
        model: process.env.RAG_DEFAULT_MODEL ? 'env' : 'default'
      }
    });

    const searchResults = await vectorSearchService.searchSimilarChunks(message, {
      topK,
      threshold,
      documentIds,
      includeMetadata: true
    });

    console.log('RAG API - 검색 결과:', {
      resultsCount: searchResults.length,
      topSimilarities: searchResults.slice(0, 3).map(r => ({
        similarity: r.similarity,
        docTitle: r.documentTitle,
        chunkPreview: r.chunkText.substring(0, 50) + '...'
      }))
    });

    if (searchResults.length === 0) {
      const noResultsResponse = "죄송합니다. 업로드된 문서에서 관련 정보를 찾을 수 없습니다. 다른 질문을 시도해보시거나 더 많은 문서를 업로드해주세요.";
      
      // 검색 결과가 없어도 AI 응답 저장
      const assistantMessage = chatRepo.createMessage({
        sessionId: currentSession.id,
        role: 'assistant',
        content: noResultsResponse,
        contentType: 'text',
        metadata: {
          model: model,
          provider: 'rag',
          ragQuery: true,
          noResults: true,
          searchResults: 0
        }
      });

      // 세션 마지막 활동 시간 업데이트
      chatRepo.updateSessionTimestamp(currentSession.id);

      return NextResponse.json({
        success: true,
        response: noResultsResponse,
        sessionId: currentSession.id,
        messageId: assistantMessage.id,
        sources: [],
        searchResults: []
      });
    }

    // 2. 컨텍스트 구성 (문서명과 페이지 정보 포함)
    const contextParts = searchResults.map((result, index) => {
      const documentName = result.documentTitle || '문서';
      const pageInfo = result.chunkIndex ? `${result.chunkIndex + 1}페이지` : '페이지 미상';
      return `[${documentName}, ${pageInfo}]\n${result.chunkText}`;
    });
    
    const context = contextParts.join('\n\n');

    // 3. 대화 히스토리와 문서 컨텍스트를 결합한 프롬프트 생성
    const systemPrompt = await PromptLoader.loadRAGPrompt(context);

    // 4. LLM으로 답변 생성 (대화 히스토리 포함)
    console.log('=== RAG API 디버깅 정보 ===');
    console.log('시스템 프롬프트 길이:', systemPrompt.length);
    console.log('시스템 프롬프트 일부:', systemPrompt.substring(0, 500) + '...');
    console.log('대화 히스토리:', conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content.substring(0, 100) + '...'
    })));
    console.log('사용 모델:', model);
    console.log('========================');

    const llmService = new LLMService();
    const response = await llmService.chat(conversationHistory, {
      model,
      temperature: 0.1, // 정확성을 위해 낮은 temperature 사용
      maxTokens: 20000, // 토큰 크기 대폭 증가로 더 상세한 답변 가능
      systemInstruction: systemPrompt
    });

    console.log('=== LLM 응답 디버깅 ===');
    console.log('응답 성공 여부:', response.success);
    console.log('응답 내용 길이:', response.content ? response.content.length : 0);
    console.log('응답 내용 일부:', response.content ? response.content.substring(0, 300) + '...' : 'No content');
    console.log('사용된 모델:', response.model);
    console.log('제공자:', response.provider);
    if (response.error) {
      console.log('오류:', response.error);
    }
    console.log('====================');

    // 5. 출처 정보 구성 (문서명과 페이지 정보 포함)
    const sources = searchResults.map((result, index) => {
      const documentName = result.documentTitle || '문서';
      const pageInfo = result.chunkIndex ? `${result.chunkIndex + 1}페이지` : '페이지 미상';
      return {
        index: index + 1,
        documentId: result.documentId,
        documentTitle: result.documentTitle,
        documentName: documentName,
        pageInfo: pageInfo,
        sourceReference: `${documentName}, ${pageInfo}`,
        chunkIndex: result.chunkIndex,
        similarity: Math.round(result.similarity * 1000) / 1000,
        excerpt: result.chunkText.substring(0, 150) + (result.chunkText.length > 150 ? '...' : '')
      };
    });

    const responseContent = response.content || (typeof response === 'string' ? response : JSON.stringify(response));

    // AI 응답 저장
    const assistantMessage = chatRepo.createMessage({
      sessionId: currentSession.id,
      role: 'assistant',
      content: responseContent,
      contentType: 'text',
      metadata: {
        model: model,
        provider: 'rag',
        ragQuery: true,
        sources: sources,
        searchResults: searchResults.length,
        contextLength: context.length
      }
    });

    // 세션 마지막 활동 시간 업데이트
    chatRepo.updateSessionTimestamp(currentSession.id);

    const apiResponse = {
      success: true,
      response: responseContent,
      sessionId: currentSession.id,
      messageId: assistantMessage.id,
      sources,
      searchResults: searchResults.map(r => ({
        documentTitle: r.documentTitle,
        similarity: r.similarity,
        chunkText: r.chunkText.substring(0, 100) + '...'
      })),
      ragMetadata: {
        model,
        topK,
        threshold,
        documentsSearched: documentIds?.length || 'all',
        contextLength: context.length,
        promptLength: systemPrompt.length
      }
    };

    // 스트림 요청인 경우 - 실제 스트리밍 사용
    if (stream) {
      return createRealStreamResponse(
        llmService,
        conversationHistory,
        {
          model,
          temperature: 0.1,
          maxTokens: 20000,
          systemInstruction: systemPrompt
        },
        {
          success: true,
          sessionId: currentSession.id,
          messageId: null, // 스트림에서는 나중에 설정
          sources,
          searchResults: searchResults.map(r => ({
            documentTitle: r.documentTitle,
            similarity: r.similarity,
            chunkText: r.chunkText.substring(0, 100) + '...'
          })),
          ragMetadata: {
            model,
            topK,
            threshold,
            documentsSearched: documentIds?.length || 'all',
            contextLength: context.length,
            promptLength: systemPrompt.length
          }
        }
      );
    }

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('RAG 채팅 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'RAG 기반 답변 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // RAG 시스템 상태 확인
    const stats = await vectorSearchService.getEmbeddingStats();
    
    // 현재 RAG 설정 값들
    const ragConfig = {
      topK: parseInt(process.env.RAG_TOP_K || '5'),
      threshold: parseFloat(process.env.RAG_THRESHOLD || '0.3'),
      defaultModel: process.env.RAG_DEFAULT_MODEL || 'gemini-2.0-flash-exp',
      configSource: {
        topK: process.env.RAG_TOP_K ? 'environment' : 'default',
        threshold: process.env.RAG_THRESHOLD ? 'environment' : 'default',
        model: process.env.RAG_DEFAULT_MODEL ? 'environment' : 'default'
      }
    };
    
    return NextResponse.json({
      success: true,
      ragSystem: {
        status: 'active',
        embeddingStats: stats,
        config: ragConfig,
        supportedModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        features: {
          documentSearch: true,
          contextualAnswers: true,
          sourceAttribution: true,
          multiDocumentSearch: true
        }
      }
    });

  } catch (error) {
    console.error('RAG 시스템 상태 확인 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'RAG 시스템 상태를 확인할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}