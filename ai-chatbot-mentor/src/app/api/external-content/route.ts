import { NextRequest, NextResponse } from 'next/server';

/**
 * URL 유형 감지 함수
 */
function detectContentType(url: string): 'youtube' | 'website' | 'unknown' {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // YouTube URL 확인
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    
    // 일반 웹사이트 URL 확인 (http/https 프로토콜)
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return 'website';
    }
    
    return 'unknown';
  } catch (error) {
    return 'unknown';
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

    // URL 타입 감지
    const contentType = detectContentType(url);
    
    if (contentType === 'unknown') {
      return NextResponse.json(
        { error: '지원하지 않는 URL 형식입니다.' },
        { status: 400 }
      );
    }

    // 임시 mock 응답 (실제 서비스 구현 전까지)
    const mockResult = {
      id: `${contentType}_${Date.now()}`,
      type: contentType,
      url,
      title: contentType === 'youtube' ? 'YouTube 비디오' : '웹페이지',
      content: `${url}에서 추출된 콘텐츠입니다. (현재 개발 중)`,
      summary: `${url}의 요약 내용입니다. (현재 개발 중)`,
      metadata: {
        processed: new Date().toISOString(),
        options,
        customGptId
      },
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
      message: `${contentType === 'youtube' ? 'YouTube' : '웹사이트'} 콘텐츠가 처리되었습니다. (개발 중)`
    });

  } catch (error) {
    console.error('외부 콘텐츠 처리 실패:', error);
    
    return NextResponse.json(
      { 
        error: '콘텐츠 처리 중 오류가 발생했습니다.',
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