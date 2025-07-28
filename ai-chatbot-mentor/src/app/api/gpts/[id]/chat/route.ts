// app/api/gpts/[id]/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GPTContextService } from '../../../../../services/GPTContextService';
import { LLMService } from '../../../../../services/LLMService';
import { z } from 'zod';

// GPT 채팅 요청 스키마
const GPTChatSchema = z.object({
  message: z.string().min(1, '메시지는 필수입니다'),
  userId: z.number().min(1, '사용자 ID는 필수입니다'),
  includeContext: z.boolean().optional().default(true),
  maxContextChunks: z.number().min(1).max(10).optional().default(5),
  contextThreshold: z.number().min(0).max(1).optional().default(0.5),
  sessionId: z.string().optional()
});

// GPT와 채팅 (POST /api/gpts/[id]/chat)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = GPTChatSchema.parse(body);
    
    const gptContextService = new GPTContextService();
    const llmService = new LLMService();
    
    // GPT 컨텍스트 기반 응답 생성
    const contextResult = await gptContextService.generateContextualResponse({
      gptId,
      message: validatedData.message,
      userId: validatedData.userId,
      includeContext: validatedData.includeContext,
      maxContextChunks: validatedData.maxContextChunks,
      contextThreshold: validatedData.contextThreshold
    });
    
    // 실제 LLM 호출을 위한 프롬프트 구성
    let finalPrompt = validatedData.message;
    
    if (contextResult.context && contextResult.context.relevantChunks.length > 0) {
      const contextInfo = contextResult.context.relevantChunks
        .map((chunk, index) => `[출처 ${index + 1}] ${chunk.content}`)
        .join('\n\n');
      
      finalPrompt = `다음 정보를 참고하여 답변해주세요:\n\n${contextInfo}\n\n질문: ${validatedData.message}\n\n답변 시 참고한 출처를 명시해주세요.`;
    }
    
    // 실제 LLM 서비스를 통한 응답 생성
    let llmResponse: string;
    try {
      // GPT 정보 조회하여 모델 결정
      const customGPTService = new (await import('../../../../../services/CustomGPTService')).CustomGPTService();
      const gpt = customGPTService.getCustomGPT(gptId);
      
      if (!gpt) {
        return NextResponse.json(
          { 
            success: false, 
            error: '커스텀 GPT를 찾을 수 없습니다' 
          },
          { status: 404 }
        );
      }
      
      // 시스템 프롬프트와 함께 최종 프롬프트 구성
      const systemPrompt = gpt.systemPrompt;
      const fullPrompt = `${systemPrompt}\n\n${finalPrompt}`;
      
      // 모델에 따른 LLM 호출
      if (gpt.model.includes('gemini')) {
        llmResponse = await llmService.callGemini(fullPrompt, {
          temperature: gpt.temperature,
          maxTokens: gpt.maxTokens
        });
      } else {
        // Ollama 모델 호출
        llmResponse = await llmService.callOllama(fullPrompt, gpt.model, {
          temperature: gpt.temperature,
          max_tokens: gpt.maxTokens
        });
      }
      
    } catch (llmError) {
      console.error('LLM 호출 오류:', llmError);
      llmResponse = '죄송합니다. 현재 AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      data: {
        response: llmResponse,
        gptId,
        model: contextResult.model,
        context: contextResult.context ? {
          chunksUsed: contextResult.context.relevantChunks.length,
          sources: contextResult.context.sources,
          relevantChunks: contextResult.context.relevantChunks.map(chunk => ({
            content: chunk.content.substring(0, 200) + '...', // 미리보기용으로 축약
            score: Math.round(chunk.score * 100) / 100,
            source: chunk.source
          }))
        } : null,
        tokensUsed: contextResult.tokensUsed,
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('GPT 채팅 오류:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'GPT 채팅 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}