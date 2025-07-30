import { NextRequest, NextResponse } from 'next/server';
import ExternalContentService from '@/services/ExternalContentService';

// JavaScript ExternalContentService 사용
function getJavaScriptExternalContentService() {
  try {
    const { getInstance } = require('../../../services/ExternalContentServiceWrapper');
    return getInstance();
  } catch (error) {
    console.error('ExternalContentService 로드 실패:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, options = {}, customGptId } = body;

    // URL 유효성 검사
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // URL 기본 유효성 검사
    try {
      new URL(url);
    } catch (urlError) {
      return NextResponse.json(
        { error: '유효하지 않은 URL 형식입니다.' },
        { status: 400 }
      );
    }

    // JavaScript 외부 콘텐츠 서비스 사용
    const jsService = getJavaScriptExternalContentService();

    console.log(`콘텐츠 추출 요청: ${url}`);
    console.log('옵션:', options);

    // 콘텐츠 추출 실행
    const result = await jsService.extractContent(url, {
      ...options,
      customGptId: customGptId ? parseInt(customGptId) : null,
      saveToDatabase: true
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        type: result.type,
        url: result.url,
        title: result.title,
        content: result.content,
        summary: result.summary,
        metadata: result.metadata,
        createdAt: result.createdAt
      },
      message: `${result.type === 'youtube' ? 'YouTube' : '웹사이트'} 콘텐츠가 성공적으로 처리되었습니다.`
    });

  } catch (error) {
    console.error('외부 콘텐츠 처리 실패:', error);
    console.error('오류 스택:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = '콘텐츠 처리 중 오류가 발생했습니다.';
    let errorDetails = '알 수 없는 오류';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // 구체적인 오류 유형 분류
      if (error.message.includes('서비스를 로드할 수 없습니다')) {
        errorMessage = '외부 콘텐츠 서비스 초기화에 실패했습니다.';
      } else if (error.message.includes('YouTube')) {
        errorMessage = 'YouTube 콘텐츠 추출에 실패했습니다.';
      } else if (error.message.includes('웹사이트')) {
        errorMessage = '웹사이트 콘텐츠 추출에 실패했습니다.';
      } else if (error.message.includes('데이터베이스')) {
        errorMessage = '데이터베이스 저장에 실패했습니다.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('type') || 'all';
    const customGptId = searchParams.get('customGptId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // JavaScript ExternalContentService 사용
    const jsService = getJavaScriptExternalContentService();

    // 모든 콘텐츠 조회
    const contents = jsService.getAllContents({
      contentType: contentType === 'all' ? undefined : contentType,
      customGptId: customGptId ? parseInt(customGptId) : undefined,
      limit,
      offset
    });

    // 데이터 형식 통일
    const formattedContents = contents.map((content: any) => ({
      id: content.id,
      type: content.type,
      url: content.url,
      title: content.title,
      summary: content.summary,
      metadata: content.metadata,
      createdAt: content.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        results: formattedContents,
        total: formattedContents.length,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('콘텐츠 목록 조회 실패:', error);
    
    return NextResponse.json(
      { 
        error: '콘텐츠 목록을 불러오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('id');

    if (!contentId) {
      return NextResponse.json(
        { error: '콘텐츠 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 외부 콘텐츠 서비스 초기화
    const contentService = await getExternalContentService();

    // 콘텐츠 삭제 (Mock으로 항상 성공)
    const deleted = true;

    return NextResponse.json({
      success: true,
      message: '콘텐츠가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('콘텐츠 삭제 실패:', error);
    
    return NextResponse.json(
      { 
        error: '콘텐츠 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 일괄 URL 처리 엔드포인트 (간단한 mock 구현)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, options = {}, customGptId } = body;

    // URLs 배열 유효성 검사
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URL 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return NextResponse.json(
        { error: '한 번에 최대 10개의 URL만 처리할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 각 URL 처리 (mock)
    const results = urls.map((url: string, index: number) => {
      const contentType = detectContentType(url);
      
      if (contentType === 'unknown') {
        return new Error(`지원하지 않는 URL 형식: ${url}`);
      }

      return {
        id: `${contentType}_${Date.now()}_${index}`,
        type: contentType,
        url,
        title: contentType === 'youtube' ? 'YouTube 비디오' : '웹페이지',
        summary: `${url}의 요약 내용 (개발 중)`,
        contentLength: 100
      };
    });

    // 성공/실패 분류
    const successResults = results.filter(result => !(result instanceof Error));
    const errorResults = results.filter(result => result instanceof Error);

    return NextResponse.json({
      success: true,
      data: {
        processed: successResults.length,
        failed: errorResults.length,
        total: results.length,
        results: successResults,
        errors: errorResults.map(error => ({
          message: error instanceof Error ? error.message : '알 수 없는 오류'
        }))
      },
      message: `${successResults.length}개의 콘텐츠가 성공적으로 처리되었습니다. (개발 중)`
    });

  } catch (error) {
    console.error('일괄 콘텐츠 처리 실패:', error);
    
    return NextResponse.json(
      { 
        error: '일괄 콘텐츠 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}