import { NextRequest, NextResponse } from 'next/server';
import ExternalContentService from '@/services/ExternalContentService';

const externalContentService = ExternalContentService.getInstance();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      url, 
      options = {},
      customGptId 
    } = body;

    // URL 유효성 검사
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 처리 옵션 설정
    const processingOptions = {
      addToKnowledgeBase: options.addToKnowledgeBase !== false, // 기본값 true
      generateEmbedding: options.generateEmbedding !== false, // 기본값 true
      customGptId,
      summarize: options.summarize !== false, // 기본값 true
      extractKeywords: options.extractKeywords !== false, // 기본값 true
      scrapingOptions: {
        useJavaScript: options.useJavaScript || false,
        timeout: options.timeout || 30000,
        waitForSelector: options.waitForSelector,
        removeElements: options.removeElements || [
          'script', 'style', 'nav', 'header', 'footer', 
          '.advertisement', '.ads', '#ads', '.sidebar'
        ]
      }
    };

    // 콘텐츠 타입 감지
    const contentType = externalContentService.detectContentType(url);
    
    if (contentType === 'unknown') {
      return NextResponse.json(
        { error: '지원하지 않는 URL 형식입니다. YouTube URL 또는 웹사이트 URL을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 외부 콘텐츠 처리
    const result = await externalContentService.processExternalContent(url, processingOptions);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        type: result.type,
        url: result.url,
        title: result.title,
        content: result.content.substring(0, 1000) + (result.content.length > 1000 ? '...' : ''), // 미리보기용
        summary: result.summary,
        metadata: result.metadata,
        createdAt: result.createdAt,
        contentLength: result.content.length
      },
      message: `${contentType === 'youtube' ? 'YouTube 비디오' : '웹페이지'} 콘텐츠가 성공적으로 처리되었습니다.`
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

// 일괄 URL 처리 엔드포인트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      urls, 
      options = {},
      customGptId,
      concurrency = 2
    } = body;

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

    // 처리 옵션 설정
    const processingOptions = {
      addToKnowledgeBase: options.addToKnowledgeBase !== false,
      generateEmbedding: options.generateEmbedding !== false,
      customGptId,
      summarize: options.summarize !== false,
      extractKeywords: options.extractKeywords !== false,
      scrapingOptions: {
        useJavaScript: options.useJavaScript || false,
        timeout: options.timeout || 30000,
        waitForSelector: options.waitForSelector,
        removeElements: options.removeElements || [
          'script', 'style', 'nav', 'header', 'footer', 
          '.advertisement', '.ads', '#ads', '.sidebar'
        ]
      }
    };

    // 여러 URL 일괄 처리
    const results = await externalContentService.processMultipleUrls(
      urls, 
      processingOptions, 
      Math.min(concurrency, 3) // 최대 3개 동시 처리
    );

    // 성공/실패 분류
    const successResults = results.filter(result => !(result instanceof Error));
    const errorResults = results.filter(result => result instanceof Error);

    return NextResponse.json({
      success: true,
      data: {
        processed: successResults.length,
        failed: errorResults.length,
        total: results.length,
        results: successResults.map(result => ({
          id: (result as any).id,
          type: (result as any).type,
          url: (result as any).url,
          title: (result as any).title,
          summary: (result as any).summary,
          contentLength: (result as any).content?.length || 0
        })),
        errors: errorResults.map(error => ({
          message: error instanceof Error ? error.message : '알 수 없는 오류'
        }))
      },
      message: `${successResults.length}개의 콘텐츠가 성공적으로 처리되었습니다.`
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