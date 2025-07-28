// app/api/gpts/[id]/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GPTContextService } from '../../../../../services/GPTContextService';
import { z } from 'zod';

// 지식 베이스 검색 요청 스키마
const SearchKnowledgeBaseSchema = z.object({
  query: z.string().min(1, '검색 쿼리는 필수입니다'),
  maxChunks: z.number().min(1).max(20).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.3),
  knowledgeBaseId: z.string().optional()
});

// GPT 지식 베이스 검색 (POST /api/gpts/[id]/search)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = SearchKnowledgeBaseSchema.parse(body);
    
    const gptContextService = new GPTContextService();
    
    // 지식 베이스 검색 수행
    const searchResult = await gptContextService.searchKnowledgeBase(
      gptId,
      validatedData.query,
      {
        maxChunks: validatedData.maxChunks,
        threshold: validatedData.threshold,
        knowledgeBaseId: validatedData.knowledgeBaseId
      }
    );
    
    // 검색 결과 포맷팅
    const formattedResult = {
      query: validatedData.query,
      totalChunks: searchResult.relevantChunks.length,
      chunks: searchResult.relevantChunks.map((chunk, index) => ({
        id: chunk.chunkId,
        content: chunk.content,
        score: Math.round(chunk.score * 1000) / 1000, // 소수점 3자리로 반올림
        source: chunk.source,
        documentId: chunk.documentId,
        rank: index + 1
      })),
      sources: searchResult.sources.map(source => ({
        documentId: source.documentId,
        filename: source.filename,
        relevance: Math.round(source.relevance * 1000) / 1000
      })),
      contextPrompt: searchResult.contextPrompt,
      searchParams: {
        maxChunks: validatedData.maxChunks,
        threshold: validatedData.threshold,
        knowledgeBaseId: validatedData.knowledgeBaseId
      },
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: formattedResult
    });
    
  } catch (error) {
    console.error('지식 베이스 검색 오류:', error);
    
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
        error: '지식 베이스 검색 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// GPT 지식 베이스 통계 조회 (GET /api/gpts/[id]/search)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    
    const gptContextService = new GPTContextService();
    
    // 지식 베이스 통계 조회
    const stats = await gptContextService.getKnowledgeBaseStats(gptId);
    
    return NextResponse.json({
      success: true,
      data: {
        gptId,
        stats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('지식 베이스 통계 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '지식 베이스 통계 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}