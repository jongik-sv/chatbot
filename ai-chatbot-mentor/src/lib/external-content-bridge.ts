// lib/external-content-bridge.ts
// Next.js에서 JavaScript ExternalContentService를 사용하기 위한 브릿지

interface ExternalContentResult {
  id: string;
  type: 'youtube' | 'website';
  url: string;
  title: string;
  content: string;
  summary: string;
  metadata: any;
  createdAt: string;
}

interface ExternalContentOptions {
  customGptId?: number | null;
  saveToDatabase?: boolean;
}

interface SearchOptions {
  contentType?: string;
  limit?: number;
  offset?: number;
}

interface ListOptions {
  contentType?: string;
  customGptId?: number;
  limit?: number;
  offset?: number;
}

/**
 * JavaScript ExternalContentService에 대한 TypeScript 브릿지
 * Next.js 서버 환경에서 안전하게 JavaScript 모듈을 로드합니다.
 */
class ExternalContentBridge {
  private jsService: any = null;

  private async getJavaScriptService(): Promise<any> {
    if (this.jsService) {
      return this.jsService;
    }

    try {
      // Next.js에서 동적 import 사용
      const path = await import('path');
      
      // 프로젝트 루트에서 서비스 경로 계산
      const servicePath = path.default.join(process.cwd(), '..', 'services', 'ExternalContentService.js');
      
      console.log('JavaScript 서비스 로드 시도:', servicePath);
      
      // Node.js의 require를 사용 (Next.js에서 허용)
      const serviceModule = require(servicePath);
      
      if (serviceModule.getInstance) {
        this.jsService = serviceModule.getInstance();
        console.log('JavaScript ExternalContentService 로드 성공');
        return this.jsService;
      } else {
        throw new Error('getInstance 메서드를 찾을 수 없습니다.');
      }
      
    } catch (error) {
      console.error('JavaScript ExternalContentService 로드 실패:', error);
      throw new Error(`JavaScript 서비스를 로드할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 외부 콘텐츠 추출
   */
  async extractContent(url: string, options: ExternalContentOptions = {}): Promise<ExternalContentResult> {
    const service = await this.getJavaScriptService();
    return service.extractContent(url, options);
  }

  /**
   * 콘텐츠 목록 조회
   */
  async getAllContents(options: ListOptions = {}): Promise<ExternalContentResult[]> {
    const service = await this.getJavaScriptService();
    return service.getAllContents(options);
  }

  /**
   * 콘텐츠 검색
   */
  async searchContents(query: string, options: SearchOptions = {}): Promise<{ results: ExternalContentResult[] }> {
    const service = await this.getJavaScriptService();
    return service.searchContents(query, options);
  }

  /**
   * 콘텐츠 삭제
   */
  async deleteContent(contentId: string): Promise<boolean> {
    const service = await this.getJavaScriptService();
    return service.deleteContent(contentId);
  }

  /**
   * 서비스 정리
   */
  async cleanup(): Promise<void> {
    if (this.jsService) {
      await this.jsService.cleanup();
      this.jsService = null;
    }
  }
}

// 싱글톤 인스턴스
let bridgeInstance: ExternalContentBridge | null = null;

export function getExternalContentBridge(): ExternalContentBridge {
  if (!bridgeInstance) {
    bridgeInstance = new ExternalContentBridge();
  }
  return bridgeInstance;
}

export default ExternalContentBridge;