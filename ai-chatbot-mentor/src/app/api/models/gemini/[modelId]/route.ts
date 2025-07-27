// app/api/models/gemini/[modelId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GeminiModelService } from '../../../../../services/GeminiModelService';

const geminiModelService = new GeminiModelService();

// 특정 Gemini 모델 상세 정보 조회 (GET /api/models/gemini/[modelId])
export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const modelId = params.modelId;
    
    if (!modelId) {
      return NextResponse.json(
        { success: false, error: '모델 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // models/ 접두사가 없으면 추가
    const fullModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    
    const result = await geminiModelService.getModelDetails(fullModelId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '모델 정보를 가져올 수 없습니다.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      model: result.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gemini 모델 상세 정보 조회 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}