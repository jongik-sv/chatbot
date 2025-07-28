// lib/repositories/DocumentRepository.ts
import { BaseRepository } from '../database';

export interface Document {
  id: number;
  user_id?: number;
  mentor_id?: number;
  filename: string;
  file_type?: string;
  file_path?: string;
  file_size?: number;
  content?: string;
  metadata?: string;
  created_at: string;
}

export interface DocumentListOptions {
  userId?: number;
  mentorId?: number;
  limit?: number;
  offset?: number;
}

export class DocumentRepository extends BaseRepository {
  
  /**
   * 문서 목록 조회
   */
  listDocuments(options: DocumentListOptions = {}): Document[] {
    const { userId, mentorId, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT 
        id, 
        user_id, 
        mentor_id, 
        filename, 
        file_type, 
        file_path, 
        content, 
        metadata, 
        created_at,
        COALESCE(file_size, 0) as file_size
      FROM documents 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    if (mentorId) {
      query += ` AND mentor_id = ?`;
      params.push(mentorId);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    try {
      return this.all(query, params) as Document[];
    } catch (error) {
      console.error('문서 목록 조회 오류:', error);
      throw new Error(`문서 목록 조회에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 문서 ID로 조회
   */
  getDocumentById(id: number): Document | null {
    try {
      const query = `
        SELECT 
          id, 
          user_id, 
          mentor_id, 
          filename, 
          file_type, 
          file_path, 
          content, 
          metadata, 
          created_at,
          COALESCE(file_size, 0) as file_size
        FROM documents 
        WHERE id = ?
      `;
      
      return this.get(query, [id]) as Document | null;
    } catch (error) {
      console.error('문서 조회 오류:', error);
      throw new Error(`문서 조회에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 문서 생성
   */
  createDocument(document: Omit<Document, 'id' | 'created_at'>): number {
    try {
      const query = `
        INSERT INTO documents (user_id, mentor_id, filename, file_type, file_path, file_size, content, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = this.run(query, [
        document.user_id || null,
        document.mentor_id || null,
        document.filename,
        document.file_type || null,
        document.file_path || null,
        document.file_size || 0,
        document.content || null,
        document.metadata || '{}'
      ]);
      
      return (result as any).lastInsertRowid;
    } catch (error) {
      console.error('문서 생성 오류:', error);
      throw new Error(`문서 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 문서 삭제
   */
  deleteDocument(id: number, userId?: number): boolean {
    try {
      let query = `DELETE FROM documents WHERE id = ?`;
      const params = [id];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const result = this.run(query, params);
      return (result as any).changes > 0;
    } catch (error) {
      console.error('문서 삭제 오류:', error);
      throw new Error(`문서 삭제에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 문서 검색
   */
  searchDocuments(searchTerm: string, options: DocumentListOptions = {}): Document[] {
    const { userId, mentorId, limit = 20, offset = 0 } = options;
    
    let query = `
      SELECT 
        id, 
        user_id, 
        mentor_id, 
        filename, 
        file_type, 
        file_path, 
        content, 
        metadata, 
        created_at,
        COALESCE(file_size, 0) as file_size
      FROM documents 
      WHERE (filename LIKE ? OR content LIKE ?)
    `;
    
    const params: any[] = [`%${searchTerm}%`, `%${searchTerm}%`];
    
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    if (mentorId) {
      query += ` AND mentor_id = ?`;
      params.push(mentorId);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    try {
      return this.all(query, params) as Document[];
    } catch (error) {
      console.error('문서 검색 오류:', error);
      throw new Error(`문서 검색에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 문서 통계
   */
  getDocumentStats(userId?: number): {
    totalDocuments: number;
    totalSize: number;
    documentsByType: { [key: string]: number };
  } {
    try {
      let totalQuery = `
        SELECT 
          COUNT(*) as count, 
          COALESCE(SUM(file_size), 0) as totalSize 
        FROM documents
      `;
      const totalParams: any[] = [];
      
      if (userId) {
        totalQuery += ` WHERE user_id = ?`;
        totalParams.push(userId);
      }
      
      const totalResult = this.get(totalQuery, totalParams) as any;
      
      let typeQuery = `
        SELECT file_type, COUNT(*) as count 
        FROM documents 
      `;
      const typeParams: any[] = [];
      
      if (userId) {
        typeQuery += ` WHERE user_id = ?`;
        typeParams.push(userId);
      }
      
      typeQuery += ` GROUP BY file_type`;
      
      const typeResults = this.all(typeQuery, typeParams) as any[];
      
      const documentsByType: { [key: string]: number } = {};
      typeResults.forEach(result => {
        documentsByType[result.file_type || 'unknown'] = result.count;
      });
      
      return {
        totalDocuments: totalResult?.count || 0,
        totalSize: totalResult?.totalSize || 0,
        documentsByType
      };
    } catch (error) {
      console.error('문서 통계 조회 오류:', error);
      return {
        totalDocuments: 0,
        totalSize: 0,
        documentsByType: {}
      };
    }
  }
}

export const documentRepository = new DocumentRepository();