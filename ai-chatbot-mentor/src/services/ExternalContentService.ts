import YouTubeContentService from './YouTubeContentService';
import WebScrapingService from './WebScrapingService';
import DocumentStorageService from './DocumentStorageService';
import EmbeddingService from './EmbeddingService';
import { vectorSearchService } from './VectorSearchService';

interface ExternalContentResult {
  id: string;
  type: 'youtube' | 'website';
  url: string;
  title: string;
  content: string;
  summary: string;
  metadata: any;
  createdAt: Date;
  embeddingId?: string;
}

interface ContentProcessingOptions {
  addToKnowledgeBase?: boolean;
  generateEmbedding?: boolean;
  projectId?: number;
  customGptId?: string;
  summarize?: boolean;
  extractKeywords?: boolean;
  scrapingOptions?: {
    useJavaScript?: boolean;
    timeout?: number;
    waitForSelector?: string;
    removeElements?: string[];
  };
}

export class ExternalContentService {
  private static instance: ExternalContentService;
  private youtubeService: YouTubeContentService;
  private webScrapingService: WebScrapingService;
  private documentStorageService: DocumentStorageService;
  private embeddingService: EmbeddingService;

  private constructor() {
    try {
      // YouTubeContentService 초기화 (getInstance가 있는 경우)
      this.youtubeService = YouTubeContentService.getInstance ? 
        YouTubeContentService.getInstance() : new YouTubeContentService();
      
      // WebScrapingService 초기화 (getInstance가 있는 경우)
      this.webScrapingService = WebScrapingService.getInstance ? 
        WebScrapingService.getInstance() : new WebScrapingService();
      
      // DocumentStorageService 초기화 (일반 constructor 사용)
      this.documentStorageService = new DocumentStorageService();
      
      // EmbeddingService 초기화 (getInstance가 있는 경우)
      try {
        this.embeddingService = EmbeddingService.getInstance ? 
          EmbeddingService.getInstance() : new EmbeddingService();
        console.log('EmbeddingService 초기화 성공');
      } catch (embeddingError) {
        console.warn('EmbeddingService 초기화 실패, Mock 서비스 사용:', embeddingError.message);
        this.embeddingService = this.createMockEmbeddingService();
      }
    } catch (error) {
      console.error('ExternalContentService 의존성 초기화 실패:', error);
      // Mock 서비스들로 대체
      this.youtubeService = this.createMockYouTubeService();
      this.webScrapingService = this.createMockWebScrapingService();
      this.documentStorageService = this.createMockDocumentStorageService();
      this.embeddingService = this.createMockEmbeddingService();
    }
  }

  public static getInstance(): ExternalContentService {
    if (!ExternalContentService.instance) {
      ExternalContentService.instance = new ExternalContentService();
    }
    return ExternalContentService.instance;
  }

  /**
   * Mock 서비스들 생성
   */
  private createMockYouTubeService(): any {
    return {
      isValidYouTubeUrl: (url: string) => url.includes('youtube.com') || url.includes('youtu.be'),
      processYouTubeContent: async (url: string) => ({
        videoInfo: {
          videoId: 'mock_video_id',
          title: 'Mock YouTube Video',
          channelName: 'Mock Channel',
          thumbnailUrl: 'https://example.com/thumbnail.jpg'
        },
        transcript: 'Mock YouTube transcript content',
        summary: 'Mock YouTube summary',
        transcriptItems: [],
        keywords: ['mock', 'youtube']
      })
    };
  }

  private createMockWebScrapingService(): any {
    return {
      isValidUrl: (url: string) => {
        try {
          new URL(url);
          return true;
        } catch { return false; }
      },
      scrapeWebsite: async (url: string, options: any = {}) => ({
        title: 'Mock Website Title',
        content: 'Mock website content',
        excerpt: 'Mock website excerpt',
        author: 'Mock Author',
        publishedDate: new Date().toISOString(),
        wordCount: 100,
        language: 'ko',
        tags: ['mock'],
        images: [],
        links: []
      }),
      closeBrowser: async () => {}
    };
  }

  private createMockDocumentStorageService(): any {
    return {
      storeDocument: async (docInfo: any, content: string) => `mock_doc_${Date.now()}`
    };
  }

  private createMockEmbeddingService(): any {
    return {
      generateEmbedding: async (text: string) => {
        // 텍스트 기반 간단한 해시 임베딩 생성 (개발/테스트용)
        const hash = this.simpleHash(text);
        const embedding = new Array(384).fill(0).map((_, i) => {
          return Math.sin(hash + i) * 0.5; // -0.5 ~ 0.5 범위의 값
        });
        console.log(`Mock 임베딩 생성: ${text.substring(0, 50)}... -> ${embedding.length}차원`);
        return embedding;
      },
      initialize: async () => {
        console.log('Mock EmbeddingService 초기화 완료');
      },
      storeEmbedding: async (embeddingData: any) => `mock_embedding_${Date.now()}`,
      searchSimilarChunks: async (query: string, limit: number = 10) => []
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer로 변환
    }
    return Math.abs(hash);
  }

  /**
   * URL 유형 감지
   */
  public detectContentType(url: string): 'youtube' | 'website' | 'unknown' {
    if (this.youtubeService.isValidYouTubeUrl(url)) {
      return 'youtube';
    } else if (this.webScrapingService.isValidUrl(url)) {
      return 'website';
    }
    return 'unknown';
  }

  /**
   * YouTube 콘텐츠 처리
   */
  private async processYouTubeContent(
    url: string, 
    options: ContentProcessingOptions
  ): Promise<ExternalContentResult> {
    try {
      const youtubeContent = await this.youtubeService.processYouTubeContent(url);
      
      const result: ExternalContentResult = {
        id: `youtube_${youtubeContent.videoInfo.videoId}_${Date.now()}`,
        type: 'youtube',
        url,
        title: youtubeContent.videoInfo.title || 'YouTube 비디오',
        content: youtubeContent.transcript,
        summary: youtubeContent.summary || '',
        metadata: {
          videoId: youtubeContent.videoInfo.videoId,
          channelName: youtubeContent.videoInfo.channelName,
          thumbnailUrl: youtubeContent.videoInfo.thumbnailUrl,
          transcriptItems: youtubeContent.transcriptItems,
          keywords: youtubeContent.keywords
        },
        createdAt: new Date()
      };

      // 지식 베이스에 추가
      if (options.addToKnowledgeBase && youtubeContent.transcript) {
        await this.addToKnowledgeBase(result, options.customGptId, options.projectId);
      }

      return result;
    } catch (error) {
      console.error('YouTube 콘텐츠 처리 실패:', error);
      
      // 더 자세한 오류 정보 제공
      if (error.message && error.message.includes('유효하지 않은 YouTube URL')) {
        throw new Error('유효하지 않은 YouTube URL입니다. 올바른 YouTube 비디오 링크를 입력해주세요.');
      } else {
        throw new Error(`YouTube 콘텐츠 처리 중 오류가 발생했습니다: ${error.message || error}`);
      }
    }
  }

  /**
   * 웹사이트 콘텐츠 처리
   */
  private async processWebsiteContent(
    url: string, 
    options: ContentProcessingOptions
  ): Promise<ExternalContentResult> {
    try {
      const scrapedContent = await this.webScrapingService.scrapeWebsite(
        url, 
        options.scrapingOptions || {}
      );
      
      const result: ExternalContentResult = {
        id: `website_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'website',
        url,
        title: scrapedContent.title,
        content: scrapedContent.content,
        summary: scrapedContent.excerpt,
        metadata: {
          author: scrapedContent.author,
          publishedDate: scrapedContent.publishedDate,
          wordCount: scrapedContent.wordCount,
          language: scrapedContent.language,
          tags: scrapedContent.tags,
          images: scrapedContent.images,
          links: scrapedContent.links
        },
        createdAt: new Date()
      };

      // 지식 베이스에 추가
      if (options.addToKnowledgeBase && scrapedContent.content) {
        await this.addToKnowledgeBase(result, options.customGptId, options.projectId);
      }

      return result;
    } catch (error) {
      console.error('웹사이트 콘텐츠 처리 실패:', error);
      throw new Error(`웹사이트 콘텐츠 처리 실패: ${error}`);
    }
  }

  /**
   * 지식 베이스에 콘텐츠 추가
   */
  private async addToKnowledgeBase(
    content: ExternalContentResult, 
    customGptId?: string,
    projectId: number = 1
  ): Promise<void> {
    try {
      // SQLite 데이터베이스에 직접 저장
      const Database = require('better-sqlite3');
      const path = require('path');
      
      const dbPath = process.env.DATABASE_PATH 
        ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
        : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
      const db = new Database(dbPath);
      
      // 외부 콘텐츠 메타데이터 구성
      const metadata = {
        isExternalContent: true,
        sourceUrl: content.url,
        sourceType: content.type,
        title: content.title,
        originalTitle: content.title,
        summary: content.summary,
        createdAt: content.createdAt.toISOString(),
        ...content.metadata
      };
      
      // documents 테이블에 저장
      const insertQuery = `
        INSERT INTO documents (
          user_id, project_id, filename, file_type, file_path, 
          content, file_size, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = db.prepare(insertQuery).run(
        1, // user_id
        projectId,
        content.title, // filename으로 제목 사용
        'text/plain',
        '', // file_path는 빈 값 (외부 콘텐츠이므로)
        content.content,
        content.content.length,
        JSON.stringify(metadata),
        new Date().toISOString()
      );
      
      const documentId = result.lastInsertRowid as number;
      
      db.close();
      
      // VectorSearchService를 사용하여 임베딩 생성 및 저장
      if (content.content.length > 100) {
        try {
          await vectorSearchService.processAndStoreDocument(
            documentId,
            content.content,
            'token',  // 토큰 기반 청킹
            500,      // 500 토큰 크기
            50        // 50 토큰 오버랩
          );
          console.log(`외부 콘텐츠 ${documentId}의 임베딩 생성 완료`);
        } catch (embeddingError) {
          console.error(`외부 콘텐츠 ${documentId} 임베딩 생성 실패:`, embeddingError);
          // 임베딩 생성 실패해도 문서 저장은 성공으로 처리
        }
      }
      
      console.log(`외부 콘텐츠 저장 완료: ${content.title} (ID: ${documentId})`);
      
    } catch (error) {
      console.error('지식 베이스 추가 실패:', error);
      // 지식 베이스 추가 실패는 전체 처리를 중단하지 않음
    }
  }


  /**
   * JavaScript 서비스와 호환성을 위한 메서드들
   */
  public async extractContent(url: string, options: any = {}): Promise<ExternalContentResult> {
    const processOptions: ContentProcessingOptions = {
      addToKnowledgeBase: options.saveToDatabase || false,
      customGptId: options.customGptId?.toString() || undefined,
      ...options
    };
    
    return this.processExternalContent(url, processOptions);
  }

  public getAllContents(options: any = {}): ExternalContentResult[] {
    try {
      // SQLite 데이터베이스에서 외부 콘텐츠 조회
      const Database = require('better-sqlite3');
      const path = require('path');
      
      const dbPath = process.env.DATABASE_PATH 
        ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
        : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
      const db = new Database(dbPath);
      
      // documents 테이블에서 외부 콘텐츠 조회 (isExternalContent가 true인 경우)
      let query = `
        SELECT id, filename, content, metadata, created_at, project_id
        FROM documents 
        WHERE metadata IS NOT NULL 
        AND (json_extract(metadata, '$.isExternalContent') = 1 
             OR json_extract(metadata, '$.sourceUrl') IS NOT NULL)
      `;
      
      const queryParams = [];
      
      // 프로젝트 필터링 추가
      if (options.projectIds && Array.isArray(options.projectIds)) {
        const placeholders = options.projectIds.map(() => '?').join(',');
        query += ` AND project_id IN (${placeholders})`;
        queryParams.push(...options.projectIds);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(options.limit || 50, options.offset || 0);
      
      const rows = db.prepare(query).all(...queryParams);
      
      const results: ExternalContentResult[] = rows.map((row: any) => {
        let metadata = {};
        try {
          metadata = JSON.parse(row.metadata || '{}');
        } catch (e) {
          console.warn('Invalid metadata JSON:', row.metadata);
        }
        
        // 타입 및 URL 정보 가져오기
        const sourceUrl = metadata.sourceUrl || '';
        const sourceType = metadata.sourceType || 'website';
        const title = metadata.title || metadata.originalName || row.filename || '제목 없음';
        
        // YouTube URL이거나 sourceType이 youtube인 경우
        const isYoutube = sourceType === 'youtube' || 
                         sourceUrl.includes('youtube.com') || 
                         sourceUrl.includes('youtu.be');
        
        return {
          id: `ext-${row.id}`,
          type: isYoutube ? 'youtube' : 'website',
          url: sourceUrl,
          title: title,
          content: row.content || '',
          summary: metadata.summary || (row.content ? row.content.substring(0, 200) + '...' : ''),
          metadata: metadata,
          createdAt: new Date(row.created_at),
          project_id: row.project_id
        };
      });
      
      db.close();
      return results;
      
    } catch (error) {
      console.error('getAllContents 오류:', error);
      return [];
    }
  }

  public searchContents(query: string, options: any = {}): { results: ExternalContentResult[] } {
    // Mock implementation - JavaScript 서비스와 호환성을 위해
    return { results: [] };
  }

  public deleteContent(contentId: string): boolean {
    // Mock implementation - JavaScript 서비스와 호환성을 위해
    return true;
  }

  /**
   * 외부 콘텐츠 통합 처리 메인 메서드
   */
  public async processExternalContent(
    url: string, 
    options: ContentProcessingOptions = {}
  ): Promise<ExternalContentResult> {
    const contentType = this.detectContentType(url);
    
    if (contentType === 'unknown') {
      throw new Error('지원하지 않는 URL 형식입니다.');
    }

    // 기본 옵션 설정
    const defaultOptions: ContentProcessingOptions = {
      addToKnowledgeBase: true,
      generateEmbedding: true,
      summarize: true,
      extractKeywords: true,
      ...options
    };

    switch (contentType) {
      case 'youtube':
        return await this.processYouTubeContent(url, defaultOptions);
      case 'website':
        return await this.processWebsiteContent(url, defaultOptions);
      default:
        throw new Error('알 수 없는 콘텐츠 유형입니다.');
    }
  }

  /**
   * 여러 URL 일괄 처리
   */
  public async processMultipleUrls(
    urls: string[], 
    options: ContentProcessingOptions = {},
    concurrency: number = 2
  ): Promise<(ExternalContentResult | Error)[]> {
    const results: (ExternalContentResult | Error)[] = [];
    
    // 동시 실행 제한으로 서버 부하 방지
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => 
        this.processExternalContent(url, options).catch(error => {
          console.error(`URL 처리 실패 ${url}:`, error);
          return error;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 처리된 콘텐츠 검색
   */
  public async searchProcessedContent(
    query: string, 
    contentType?: 'youtube' | 'website',
    limit: number = 10
  ): Promise<ExternalContentResult[]> {
    // 임베딩 서비스를 통한 유사도 검색
    try {
      const searchResults = await this.embeddingService.searchSimilarChunks(query, limit);
      
      // 결과를 ExternalContentResult 형식으로 변환
      const results: ExternalContentResult[] = searchResults
        .filter(result => !contentType || result.metadata?.sourceType === contentType)
        .map(result => ({
          id: result.metadata?.sourceUrl || `search_${Date.now()}`,
          type: result.metadata?.sourceType || 'website',
          url: result.metadata?.sourceUrl || '',
          title: result.metadata?.title || '제목 없음',
          content: result.chunkText,
          summary: result.chunkText.substring(0, 200) + '...',
          metadata: result.metadata,
          createdAt: new Date()
        }));

      return results;
    } catch (error) {
      console.error('콘텐츠 검색 실패:', error);
      return [];
    }
  }

  /**
   * 리소스 정리
   */
  public async cleanup(): Promise<void> {
    try {
      await this.webScrapingService.closeBrowser();
    } catch (error) {
      console.error('리소스 정리 실패:', error);
    }
  }
}

export default ExternalContentService;