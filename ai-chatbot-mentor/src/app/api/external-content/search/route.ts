import { NextRequest, NextResponse } from 'next/server';
import ExternalContentService from '@/services/ExternalContentService';

// JavaScript ExternalContentService 사용
function getJavaScriptExternalContentService() {
  const { getInstance } = require('../../../../services/ExternalContentService');
  return getInstance();
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

    // JavaScript 외부 콘텐츠 서비스 사용
    const jsService = getJavaScriptExternalContentService();

    // 콘텐츠 검색
    const searchResult = jsService.searchContents(query.trim(), {
      contentType: contentType || 'all',
      limit: Math.min(limit, 50),
      offset: 0
    });

    const searchResults = searchResult.results;

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        contentType: contentType || 'all',
        results: searchResults.map((result: any) => ({
          id: result.id,
          type: result.type,
          url: result.url,
          title: result.title,
          summary: result.summary,
          metadata: result.metadata,
          createdAt: result.created_at
        })),
        total: searchResults.length
      },
      message: `${searchResults.length}개의 관련 콘텐츠를 찾았습니다.`
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

    // JavaScript 외부 콘텐츠 서비스 사용
    const jsService = getJavaScriptExternalContentService();

    // 콘텐츠 검색
    const searchResult = jsService.searchContents(query.trim(), {
      contentType: contentType || 'all',
      limit: Math.min(limit, 50),
      offset: 0
    });

    const searchResults = searchResult.results;

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        contentType: contentType || 'all',
        customGptId: customGptId || null,
        results: searchResults.map((result: any) => ({
          id: result.id,
          type: result.type,
          url: result.url,
          title: result.title,
          content: includeFullContent ? result.content : undefined,
          summary: result.summary,
          metadata: result.metadata,
          createdAt: result.created_at
        })),
        total: searchResults.length
      },
      message: `${searchResults.length}개의 관련 콘텐츠를 찾았습니다.`
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