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
    const { url } = body;

    // URL 유효성 검사
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 콘텐츠 타입 감지
    const contentType = detectContentType(url);
    
    // URL 패턴 분석
    const urlAnalysis = analyzeUrl(url);

    return NextResponse.json({
      success: true,
      data: {
        url,
        contentType,
        isSupported: contentType !== 'unknown',
        analysis: urlAnalysis
      },
      message: contentType !== 'unknown' 
        ? `지원되는 ${contentType === 'youtube' ? 'YouTube' : '웹사이트'} URL입니다.`
        : '지원하지 않는 URL 형식입니다.'
    });

  } catch (error) {
    console.error('URL 분석 실패:', error);
    
    return NextResponse.json(
      { 
        error: 'URL 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    // URL 유효성 검사
    if (!url) {
      return NextResponse.json(
        { error: 'URL 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 콘텐츠 타입 감지
    const contentType = detectContentType(url);
    
    // URL 패턴 분석
    const urlAnalysis = analyzeUrl(url);

    return NextResponse.json({
      success: true,
      data: {
        url,
        contentType,
        isSupported: contentType !== 'unknown',
        analysis: urlAnalysis
      },
      message: contentType !== 'unknown' 
        ? `지원되는 ${contentType === 'youtube' ? 'YouTube' : '웹사이트'} URL입니다.`
        : '지원하지 않는 URL 형식입니다.'
    });

  } catch (error) {
    console.error('URL 분석 실패:', error);
    
    return NextResponse.json(
      { 
        error: 'URL 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * URL 상세 분석 함수
 */
function analyzeUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;
    
    const analysis = {
      protocol: urlObj.protocol,
      hostname,
      pathname,
      domain: hostname.replace(/^www\./, ''),
      isSecure: urlObj.protocol === 'https:',
      hasWww: hostname.startsWith('www.'),
      pathSegments: pathname.split('/').filter(segment => segment.length > 0),
      queryParams: Object.fromEntries(urlObj.searchParams),
      fragment: urlObj.hash
    };

    // YouTube 특별 분석
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      analysis.youtubeInfo = analyzeYouTubeUrl(urlObj);
    }

    // 일반적인 웹사이트 분석
    analysis.siteType = detectSiteType(hostname, pathname);
    analysis.estimatedComplexity = estimateScrapingComplexity(hostname);

    return analysis;
  } catch (error) {
    return {
      error: 'URL 파싱 실패',
      isValid: false
    };
  }
}

/**
 * YouTube URL 상세 분석
 */
function analyzeYouTubeUrl(urlObj: URL) {
  const hostname = urlObj.hostname.toLowerCase();
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  if (hostname.includes('youtu.be')) {
    // youtu.be/VIDEO_ID 형식
    const videoId = pathname.substring(1);
    return {
      format: 'short_url',
      videoId,
      timestamp: searchParams.get('t')
    };
  } else if (hostname.includes('youtube.com')) {
    if (pathname.includes('/watch')) {
      // youtube.com/watch?v=VIDEO_ID 형식
      return {
        format: 'watch_url',
        videoId: searchParams.get('v'),
        playlist: searchParams.get('list'),
        timestamp: searchParams.get('t')
      };
    } else if (pathname.includes('/embed/')) {
      // youtube.com/embed/VIDEO_ID 형식
      const videoId = pathname.split('/embed/')[1]?.split('?')[0];
      return {
        format: 'embed_url',
        videoId
      };
    }
  }

  return { format: 'unknown' };
}

/**
 * 사이트 유형 감지
 */
function detectSiteType(hostname: string, pathname: string) {
  // 뉴스 사이트
  const newsSites = [
    'naver.com', 'daum.net', 'chosun.com', 'joongang.co.kr', 
    'dong-a.com', 'hani.co.kr', 'khan.co.kr', 'ytn.co.kr',
    'bbc.com', 'cnn.com', 'reuters.com', 'ap.org'
  ];
  
  // 블로그 플랫폼
  const blogPlatforms = [
    'blog.naver.com', 'blog.daum.net', 'tistory.com', 
    'medium.com', 'wordpress.com', 'blogger.com'
  ];
  
  // 기술 문서/위키
  const docSites = [
    'github.com', 'stackoverflow.com', 'wikipedia.org',
    'docs.', 'developer.', 'api.', 'confluence.'
  ];

  if (newsSites.some(site => hostname.includes(site))) {
    return 'news';
  } else if (blogPlatforms.some(platform => hostname.includes(platform))) {
    return 'blog';
  } else if (docSites.some(doc => hostname.includes(doc))) {
    return 'documentation';
  } else if (pathname.includes('/article/') || pathname.includes('/post/')) {
    return 'article';
  } else {
    return 'general';
  }
}

/**
 * 스크래핑 복잡도 추정
 */
function estimateScrapingComplexity(hostname: string) {
  // JavaScript가 많이 필요한 사이트들
  const complexSites = [
    'twitter.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'pinterest.com'
  ];
  
  // 일반적으로 간단한 사이트들
  const simpleSites = [
    'wikipedia.org', 'github.com', 'stackoverflow.com'
  ];

  if (complexSites.some(site => hostname.includes(site))) {
    return 'high'; // JavaScript 렌더링 필요
  } else if (simpleSites.some(site => hostname.includes(site))) {
    return 'low'; // 정적 HTML
  } else {
    return 'medium'; // 중간 복잡도
  }
}