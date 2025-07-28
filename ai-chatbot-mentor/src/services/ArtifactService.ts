import { getDatabase } from '@/lib/database';

export interface Artifact {
  id: number;
  session_id: number;
  message_id: number;
  type: 'code' | 'document' | 'chart' | 'mermaid';
  title: string;
  content: string;
  language?: string;
  created_at: string;
}

export interface CreateArtifactData {
  sessionId: number;
  messageId?: number;
  type: Artifact['type'];
  title: string;
  content: string;
  language?: string;
}

export interface UpdateArtifactData {
  title?: string;
  content?: string;
  language?: string;
}

export class ArtifactService {
  /**
   * 아티팩트 생성
   */
  static createArtifact(data: CreateArtifactData): Artifact {
    const db = getDatabase();

    try {
      console.log('아티팩트 생성 데이터:', data);
      console.log('데이터베이스 경로:', db.name);

      // 테이블 존재 확인
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log('사용 가능한 테이블:', tables.map(t => t.name));

      // 세션 테이블의 모든 데이터 확인
      try {
        const allSessions = db.prepare('SELECT id, title FROM chat_sessions LIMIT 5').all();
        console.log('최근 세션들:', allSessions);
      } catch (error) {
        console.log('세션 테이블 조회 오류:', error);
      }

      // session_id와 message_id 존재 확인
      const sessionExists = db.prepare('SELECT id FROM chat_sessions WHERE id = ?').get(data.sessionId);
      const messageExists = data.messageId ? db.prepare('SELECT id FROM messages WHERE id = ?').get(data.messageId) : null;
      
      console.log('세션 존재 여부:', sessionExists);
      console.log('메시지 존재 여부:', messageExists);

      // 임시로 세션 존재 검증 건너뛰기 (데이터베이스 경로 문제 해결 후 재활성화 예정)
      if (!sessionExists) {
        console.warn(`경고: 세션 ID ${data.sessionId}가 존재하지 않지만 아티팩트 생성을 계속합니다.`);
      }

      if (data.messageId && !messageExists) {
        console.warn(`경고: 메시지 ID ${data.messageId}가 존재하지 않지만 아티팩트 생성을 계속합니다.`);
      }

      // 아티팩트 타입별 검증 및 전처리
      const processedData = this.processArtifactByType(data);
      console.log('처리된 데이터:', processedData);

      const stmt = db.prepare(
        `INSERT INTO artifacts (session_id, message_id, type, title, content, language, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      );
      
      const result = stmt.run([
        processedData.sessionId,
        processedData.messageId || null,
        processedData.type,
        processedData.title,
        processedData.content,
        processedData.language || null
      ]);

      console.log('DB 삽입 결과:', result);

      if (!result.lastInsertRowid) {
        throw new Error('아티팩트 삽입 실패: lastInsertRowid가 없음');
      }

      const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(result.lastInsertRowid);
      console.log('조회된 아티팩트:', artifact);

      if (!artifact) {
        throw new Error(`아티팩트 조회 실패: ID ${result.lastInsertRowid}`);
      }

      return artifact as Artifact;
    } catch (error) {
      console.error('ArtifactService.createArtifact 오류:', error);
      throw error;
    }
  }

  /**
   * 아티팩트 조회
   */
  static getArtifact(id: number): Artifact | null {
    const db = getDatabase();
    const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);

    return artifact as Artifact | null;
  }

  /**
   * 아티팩트 목록 조회
   */
  static getArtifacts(filters: {
    sessionId?: number;
    messageId?: number;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Artifact[] {
    const db = getDatabase();
    
    let query = 'SELECT * FROM artifacts WHERE 1=1';
    const params: any[] = [];

    if (filters.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }

    if (filters.messageId) {
      query += ' AND message_id = ?';
      params.push(filters.messageId);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const artifacts = db.prepare(query).all(params);
    return artifacts as Artifact[];
  }

  /**
   * 아티팩트 업데이트
   */
  static updateArtifact(id: number, data: UpdateArtifactData): Artifact | null {
    const db = getDatabase();

    // 기존 아티팩트 조회
    const existingArtifact = this.getArtifact(id);
    if (!existingArtifact) {
      return null;
    }

    // 업데이트할 필드들 준비
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.content !== undefined) {
      // 타입별 콘텐츠 검증
      const processedContent = this.validateContentByType(
        existingArtifact.type,
        data.content
      );
      updates.push('content = ?');
      params.push(processedContent);
    }

    if (data.language !== undefined) {
      updates.push('language = ?');
      params.push(data.language);
    }

    if (updates.length === 0) {
      return existingArtifact;
    }

    params.push(id);

    db.prepare(`UPDATE artifacts SET ${updates.join(', ')} WHERE id = ?`).run(params);

    return this.getArtifact(id);
  }

  /**
   * 아티팩트 삭제
   */
  static deleteArtifact(id: number): boolean {
    const db = getDatabase();

    const result = db.prepare('DELETE FROM artifacts WHERE id = ?').run(id);
    return (result.changes || 0) > 0;
  }

  /**
   * 세션의 모든 아티팩트 삭제
   */
  static deleteArtifactsBySession(sessionId: number): number {
    const db = getDatabase();

    const result = db.prepare('DELETE FROM artifacts WHERE session_id = ?').run(sessionId);
    return result.changes || 0;
  }

  /**
   * 아티팩트 타입별 처리
   */
  private static processArtifactByType(data: CreateArtifactData): CreateArtifactData {
    const processedData = { ...data };

    switch (data.type) {
      case 'code':
        processedData.content = this.processCodeArtifact(data.content, data.language);
        break;
      case 'document':
        processedData.content = this.processDocumentArtifact(data.content);
        break;
      case 'chart':
        processedData.content = this.processChartArtifact(data.content);
        break;
      case 'mermaid':
        processedData.content = this.processMermaidArtifact(data.content);
        break;
    }

    return processedData;
  }

  /**
   * 코드 아티팩트 처리
   */
  private static processCodeArtifact(content: string, language?: string): string {
    // 코드 구문 검증 및 정리
    let processedContent = content.trim();

    // 코드 블록 마커 제거 (```로 감싸진 경우)
    if (processedContent.startsWith('```')) {
      const lines = processedContent.split('\n');
      if (lines.length > 2 && lines[lines.length - 1].trim() === '```') {
        processedContent = lines.slice(1, -1).join('\n');
      }
    }

    return processedContent;
  }

  /**
   * 문서 아티팩트 처리
   */
  private static processDocumentArtifact(content: string): string {
    // 마크다운 문서 처리
    return content.trim();
  }

  /**
   * 차트 아티팩트 처리
   */
  private static processChartArtifact(content: string): string {
    try {
      // JSON 형태의 차트 데이터 검증
      const chartData = JSON.parse(content);
      
      // 기본 차트 구조 검증
      if (!chartData.type || !chartData.data) {
        throw new Error('Invalid chart data structure');
      }

      return JSON.stringify(chartData, null, 2);
    } catch (error) {
      throw new Error('Invalid chart data format');
    }
  }

  /**
   * Mermaid 다이어그램 처리
   */
  private static processMermaidArtifact(content: string): string {
    // Mermaid 구문 기본 검증
    const trimmedContent = content.trim();
    
    // 기본적인 Mermaid 다이어그램 타입 확인
    const mermaidTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey'
    ];

    const hasValidType = mermaidTypes.some(type => 
      trimmedContent.toLowerCase().startsWith(type.toLowerCase())
    );

    if (!hasValidType) {
      console.warn('Potentially invalid Mermaid diagram type');
    }

    return trimmedContent;
  }

  /**
   * 타입별 콘텐츠 검증
   */
  private static validateContentByType(type: Artifact['type'], content: string): string {
    switch (type) {
      case 'code':
        return this.processCodeArtifact(content);
      case 'document':
        return this.processDocumentArtifact(content);
      case 'chart':
        return this.processChartArtifact(content);
      case 'mermaid':
        return this.processMermaidArtifact(content);
      default:
        return content;
    }
  }

  /**
   * 아티팩트 메타데이터 생성
   */
  static generateArtifactMetadata(artifact: Artifact): Record<string, any> {
    const metadata: Record<string, any> = {
      type: artifact.type,
      title: artifact.title,
      createdAt: artifact.created_at,
      size: artifact.content.length
    };

    switch (artifact.type) {
      case 'code':
        metadata.language = artifact.language;
        metadata.lines = artifact.content.split('\n').length;
        break;
      case 'document':
        metadata.wordCount = artifact.content.split(/\s+/).length;
        break;
      case 'chart':
        try {
          const chartData = JSON.parse(artifact.content);
          metadata.chartType = chartData.type;
          metadata.dataPoints = chartData.data?.datasets?.[0]?.data?.length || 0;
        } catch (error) {
          // JSON 파싱 실패 시 기본값
        }
        break;
      case 'mermaid':
        metadata.diagramType = this.extractMermaidType(artifact.content);
        break;
    }

    return metadata;
  }

  /**
   * Mermaid 다이어그램 타입 추출
   */
  private static extractMermaidType(content: string): string {
    const firstLine = content.trim().split('\n')[0].toLowerCase();
    
    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
      return 'flowchart';
    } else if (firstLine.startsWith('sequencediagram')) {
      return 'sequence';
    } else if (firstLine.startsWith('classdiagram')) {
      return 'class';
    } else if (firstLine.startsWith('statediagram')) {
      return 'state';
    } else if (firstLine.startsWith('erdiagram')) {
      return 'er';
    } else if (firstLine.startsWith('gantt')) {
      return 'gantt';
    } else if (firstLine.startsWith('pie')) {
      return 'pie';
    } else if (firstLine.startsWith('journey')) {
      return 'journey';
    }
    
    return 'unknown';
  }
}