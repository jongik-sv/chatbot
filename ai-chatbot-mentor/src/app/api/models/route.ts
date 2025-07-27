// app/api/models/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LLMService } from '../../../services/LLMService';

const llmService = new LLMService();

export async function GET(request: NextRequest) {
  try {
    // 사용 가능한 모든 모델 조회
    const models = await llmService.getAvailableModels();
    
    // 서비스 상태도 함께 조회
    const status = await llmService.checkStatus();
    
    return NextResponse.json({
      success: true,
      models,
      status,
      count: models.length
    });

  } catch (error) {
    console.error('모델 목록 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        models: [],
        error: '모델 목록을 조회할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}