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
  static async createArtifact(data: CreateArtifactData): Promise<Artifact> {
    const db = await getDatabase();

    // 아티팩트 타입별 검증 및 전처리
    const processedData = await this.processArtifactByType(data);

    const result = await db.run(
      `INSERT INTO artifacts (session_id, message_id, type, title, content, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        processedData.sessionId,
        processedData.messageId || null,
        processedData.type,
        processedData.title,
        processedData.content,
        processedData.language || null
      ]
    );

    const artifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [result.lastID]
    );

    return artifact as Artifact;
  }

  /**
   * 아티팩트 조회
   */
  static async getArtifact(id: number): Promise<Artifact | null> {
    const db = await getDatabase();
    const artifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [id]
    );

    return artifact as Artifact | null;
  }

  /**
   * 아티팩트 목록 조회
   */
  static async getArtifacts(filters: {
    sessionId?: number;
    messageId?: number;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Artifact[]> {
    const db = await getDatabase();
    
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

    const artifacts = await db.all(query, params);
    return artifacts as Artifact[];
  }

  /**
   * 아티팩트 업데이트
   */
  static async updateArtifact(id: number, data: UpdateArtifactData): Promise<Artifact | null> {
    const db = await getDatabase();

    // 기존 아티팩트 조회
    const existingArtifact = await this.getArtifact(id);
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
      const processedContent = await this.validateContentByType(
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

    await db.run(
      `UPDATE artifacts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return await this.getArtifact(id);
  }

  /**
   * 아티팩트 삭제
   */
  static async deleteArtifact(id: number): Promise<boolean> {
    const db = await getDatabase();

    const result = await db.run('DELETE FROM artifacts WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }

  /**
   * 세션의 모든 아티팩트 삭제
   */
  static async deleteArtifactsBySession(sessionId: number): Promise<number> {
    const db = await getDatabase();

    const result = await db.run('DELETE FROM artifacts WHERE session_id = ?', [sessionId]);
    return result.changes || 0;
  }

  /**
   * 아티팩트 타입별 처리
   */
  private static async processArtifactByType(data: CreateArtifactData): Promise<CreateArtifactData> {
    const processedData = { ...data };

    switch (data.type) {
      case 'code':
        processedData.content = await this.processCodeArtifact(data.content, data.language);
        break;
      case 'document':
        processedData.content = await this.processDocumentArtifact(data.content);
        break;
      case 'chart':
        processedData.content = await this.processChartArtifact(data.content);
        break;
      case 'mermaid':
        processedData.content = await this.processMermaidArtifact(data.content);
        break;
    }

    return processedData;
  }

  /**
   * 코드 아티팩트 처리
   */
  private static async processCodeArtifact(content: string, language?: string): Promise<string> {
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
  private static async processDocumentArtifact(content: string): Promise<string> {
    // 마크다운 문서 처리
    return content.trim();
  }

  /**
   * 차트 아티팩트 처리
   */
  private static async processChartArtifact(content: string): Promise<string> {
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
  private static async processMermaidArtifact(content: string): Promise<string> {
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
  private static async validateContentByType(type: Artifact['type'], content: string): Promise<string> {
    switch (type) {
      case 'code':
        return await this.processCodeArtifact(content);
      case 'document':
        return await this.processDocumentArtifact(content);
      case 'chart':
        return await this.processChartArtifact(content);
      case 'mermaid':
        return await this.processMermaidArtifact(content);
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