import { NextRequest, NextResponse } from 'next/server';

// ExternalContentService 동적 import
async function getExternalContentService() {
  try {
    const { getInstance } = require('../../../../../../services/ExternalContentService');
    return getInstance();
  } catch (error) {
    console.error('ExternalContentService 로드 실패:', error);
    throw new Error('외부 콘텐츠 서비스를 로드할 수 없습니다.');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const contentType = searchParams.get('type') as 'youtube' | 'website' | null;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 쿼리 유효성 검사
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: '검색 쿼리가 필요합니다.' },
        { status: 400 }
      );
    }

    if (limit > 50) {
      return NextResponse.json(
        { error: '검색 결과는 최대 50개까지 가능합니다.' },
        { status: 400 }
      );
    }

    // 외부 콘텐츠 서비스 초기화
    const contentService = await getExternalContentService();

    // 콘텐츠 검색
    const searchResults = contentService.searchContents(query.trim(), {
      contentType: contentType || undefined,
      limit: Math.min(limit, 50)
    });

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        contentType: contentType || 'all',
        results: searchResults.results.map(result => ({
          id: result.id,
          type: result.type,
          url: result.url,
          title: result.title,
          summary: result.summary,
          metadata: {
            ...result.metadata,
            // 민감한 정보 제거
            transcriptItems: undefined
          },
          createdAt: result.created_at
        })),
        total: searchResults.total
      },
      message: `${searchResults.results.length}개의 관련 콘텐츠를 찾았습니다.`
    });

  } catch (error) {
    console.error('콘텐츠 검색 실패:', error);
    
    return NextResponse.json(
      { 
        error: '콘텐츠 검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query,
      contentType,
      limit = 10,
      customGptId,
      includeFullContent = false
    } = body;

    // 쿼리 유효성 검사
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: '검색 쿼리가 필요합니다.' },
        { status: 400 }
      );
    }

    if (limit > 50) {
      return NextResponse.json(
        { error: '검색 결과는 최대 50개까지 가능합니다.' },
        { status: 400 }
      );
    }

    // 외부 콘텐츠 서비스 초기화
    const contentService = await getExternalContentService();

    // 콘텐츠 검색
    const searchResults = contentService.searchContents(query.trim(), {
      contentType: contentType || undefined,
      customGptId: customGptId ? parseInt(customGptId) : undefined,
      limit: Math.min(limit, 50)
    });

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        contentType: contentType || 'all',
        customGptId: customGptId || null,
        results: searchResults.results.map(result => ({
          id: result.id,
          type: result.type,
          url: result.url,
          title: result.title,
          content: includeFullContent ? result.content : undefined,
          summary: result.summary,
          metadata: {
            ...result.metadata,
            // 전체 자막 데이터는 필요시에만 포함
            transcriptItems: includeFullContent ? result.metadata?.transcriptItems : undefined
          },
          createdAt: result.created_at
        })),
        total: searchResults.total
      },
      message: `${searchResults.results.length}개의 관련 콘텐츠를 찾았습니다.`
    });

  } catch (error) {
    console.error('고급 콘텐츠 검색 실패:', error);
    
    return NextResponse.json(
      { 
        error: '콘텐츠 검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}