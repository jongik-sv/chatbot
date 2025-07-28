// app/api/rag/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/services/VectorSearchService';

// LLM 서비스 import
import { LLMService } from '@/services/LLMService';

// JavaScript Repository 사용 (히스토리 API와 호환성을 위해)
const ChatRepository = require('../../../../lib/repositories/ChatRepository');

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      model = 'gemini-2.0-flash-exp',
      documentIds, 
      topK = 3, 
      threshold = 0.5,
      sessionId,
      userId = 1 
    } = await request.json();

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
    const searchResults = await vectorSearchService.searchSimilarChunks(message, {
      topK,
      threshold,
      documentIds,
      includeMetadata: true
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

    // 2. 컨텍스트 구성
    const contextParts = searchResults.map((result, index) => 
      `[출처 ${index + 1}: ${result.documentTitle || '문서'}]\n${result.chunkText}`
    );
    
    const context = contextParts.join('\n\n');

    // 3. RAG 프롬프트 생성
    const ragPrompt = `다음은 사용자가 업로드한 문서에서 검색된 관련 정보입니다:

${context}

위 정보를 바탕으로 다음 질문에 답해주세요. 답변할 때는 반드시:
1. 제공된 문서의 내용만을 기반으로 답변하세요
2. 문서에 없는 내용은 추측하지 마세요
3. 가능한 경우 어떤 출처에서 정보를 가져왔는지 언급하세요
4. 문서에서 충분한 정보를 찾을 수 없다면 그렇게 명시하세요

질문: ${message}

답변:`;

    // 4. LLM으로 답변 생성
    const llmService = new LLMService();
    const response = await llmService.chat([{ role: 'user', content: ragPrompt }], {
      model,
      temperature: 0.1, // 정확성을 위해 낮은 temperature 사용
      maxTokens: 1000
    });

    // 5. 출처 정보 구성
    const sources = searchResults.map((result, index) => ({
      index: index + 1,
      documentId: result.documentId,
      documentTitle: result.documentTitle,
      chunkIndex: result.chunkIndex,
      similarity: Math.round(result.similarity * 1000) / 1000,
      excerpt: result.chunkText.substring(0, 150) + (result.chunkText.length > 150 ? '...' : '')
    }));

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

    return NextResponse.json({
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
        promptLength: ragPrompt.length
      }
    });

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
    
    return NextResponse.json({
      success: true,
      ragSystem: {
        status: 'active',
        embeddingStats: stats,
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