import fs from 'fs';
import path from 'path';

/**
 * 프롬프트 로더 유틸리티
 * 마크다운 프롬프트 파일을 읽고 처리하는 기능을 제공합니다.
 */
export class PromptLoader {
  private static promptsDir = path.join(process.cwd(), 'src', 'prompts');
  private static cache = new Map<string, string>();

  /**
   * 프롬프트 파일을 읽어옵니다
   * @param promptName 프롬프트 파일명 (확장자 제외)
   * @param variables 프롬프트 내 변수를 치환할 객체
   * @returns 처리된 프롬프트 텍스트
   */
  static async loadPrompt(promptName: string, variables: Record<string, string> = {}): Promise<string> {
    try {
      // 캐시 확인
      const cacheKey = `${promptName}-${JSON.stringify(variables)}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      // 파일 경로 구성
      const filePath = path.join(this.promptsDir, `${promptName}.md`);
      
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        throw new Error(`프롬프트 파일을 찾을 수 없습니다: ${promptName}.md`);
      }

      // 파일 읽기
      let content = fs.readFileSync(filePath, 'utf-8');

      // 변수 치환
      content = this.replaceVariables(content, variables);

      // 캐시에 저장 (개발 환경에서는 캐시 비활성화)
      if (process.env.NODE_ENV === 'production') {
        this.cache.set(cacheKey, content);
      }

      return content;
    } catch (error) {
      console.error(`프롬프트 로드 실패 (${promptName}):`, error);
      throw error;
    }
  }

  /**
   * RAG 문서 기반 채팅 프롬프트를 로드합니다
   * @param documentContext 검색된 문서 컨텍스트
   * @returns 처리된 RAG 프롬프트
   */
  static async loadRAGPrompt(documentContext: string): Promise<string> {
    return this.loadPrompt('rag-document-chat', {
      DOCUMENT_CONTEXT: documentContext
    });
  }

  /**
   * 일반 채팅 프롬프트를 로드합니다
   * @returns 일반 채팅 프롬프트
   */
  static async loadGeneralChatPrompt(): Promise<string> {
    return this.loadPrompt('general-chat');
  }

  /**
   * 프롬프트 내 변수를 치환합니다
   * @param content 원본 프롬프트 내용
   * @param variables 치환할 변수들
   * @returns 변수가 치환된 프롬프트
   */
  private static replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      // {VARIABLE_NAME} 형태의 변수를 치환
      const pattern = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(pattern, value);
    }
    
    return result;
  }

  /**
   * 캐시를 초기화합니다 (개발 중 프롬프트 변경 시 사용)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * 사용 가능한 프롬프트 파일 목록을 반환합니다
   */
  static getAvailablePrompts(): string[] {
    try {
      if (!fs.existsSync(this.promptsDir)) {
        return [];
      }
      
      return fs.readdirSync(this.promptsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', ''));
    } catch (error) {
      console.error('프롬프트 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 프롬프트 파일의 메타데이터를 추출합니다
   * @param promptName 프롬프트 파일명
   * @returns 프롬프트 메타데이터
   */
  static async getPromptMetadata(promptName: string): Promise<{
    title?: string;
    description?: string;
    variables?: string[];
  }> {
    try {
      const content = await this.loadPrompt(promptName);
      const lines = content.split('\n');
      
      const metadata: any = {};
      
      // 첫 번째 # 헤더를 제목으로 사용
      const titleLine = lines.find(line => line.startsWith('# '));
      if (titleLine) {
        metadata.title = titleLine.replace('# ', '').trim();
      }
      
      // {VARIABLE} 패턴 추출
      const variableMatches = content.match(/\{([A-Z_]+)\}/g);
      if (variableMatches) {
        metadata.variables = [...new Set(variableMatches.map(match => 
          match.replace(/[{}]/g, '')
        ))];
      }
      
      return metadata;
    } catch (error) {
      console.error(`프롬프트 메타데이터 추출 실패 (${promptName}):`, error);
      return {};
    }
  }
}

export default PromptLoader;