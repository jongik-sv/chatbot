// app/api/models/gemini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GeminiModelService } from '../../../../services/GeminiModelService';

const geminiModelService = new GeminiModelService();

// Gemini 모델 리스트 조회 (GET /api/models/gemini)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const includeDetails = searchParams.get('details') === 'true';

    const result = await geminiModelService.getGeminiModels(forceRefresh);

    // 캐시 상태 정보 추가
    const cacheStatus = geminiModelService.getCacheStatus();

    const response = {
      success: result.success,
      models: result.models,
      cached: result.cached,
      cacheStatus,
      timestamp: new Date().toISOString(),
      error: result.error
    };

    // 상세 정보가 요청된 경우 API 상태도 포함
    if (includeDetails) {
      const apiStatus = await geminiModelService.checkAPIStatus();
      response.apiStatus = apiStatus;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Gemini 모델 조회 API 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        models: [],
        cached: false,
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 캐시 초기화 (DELETE /api/models/gemini)
export async function DELETE(request: NextRequest) {
  try {
    geminiModelService.clearCache();
    
    return NextResponse.json({
      success: true,
      message: 'Gemini 모델 캐시가 초기화되었습니다.'
    });

  } catch (error) {
    console.error('캐시 초기화 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '캐시 초기화에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}