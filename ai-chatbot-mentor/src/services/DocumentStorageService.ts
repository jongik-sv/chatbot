// services/DocumentStorageService.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedDocument, DocumentChunk } from './DocumentProcessingService';

export interface StoredDocument {
  id: string;
  filename: string;
  fileType: string;
  filePath: string;
  content: string;
  metadata: string; // JSON string
  wordCount: number;
  language: string;
  summary: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  wordCount: number;
  sentences: number;
  createdAt: string;
}

export class DocumentStorageService {
  private db: Database.Database;
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

  constructor() {
    const dbPath = path.join(process.cwd(), '..', 'data', 'chatbot.db');
    this.db = new Database(dbPath);
    this.initializeTables();
    this.ensureUploadDirectory();
  }

  /**
   * 필요한 테이블 초기화
   */
  private initializeTables(): void {
    // documents 테이블이 이미 존재하는지 확인
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='documents'
    `).get();

    if (!tableExists) {
      // documents 테이블 생성
      this.db.exec(`
        CREATE TABLE documents (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata TEXT NOT NULL,
          word_count INTEGER DEFAULT 0,
          language TEXT DEFAULT 'unknown',
          summary TEXT,
          file_size INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // document_chunks 테이블 생성
      this.db.exec(`
        CREATE TABLE document_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          content TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          start_position INTEGER NOT NULL,
          end_position INTEGER NOT NULL,
          word_count INTEGER NOT NULL,
          sentences INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
        )
      `);

      // 인덱스 생성
      this.db.exec(`
        CREATE INDEX idx_documents_filename ON documents(filename);
        CREATE INDEX idx_documents_file_type ON documents(file_type);
        CREATE INDEX idx_documents_language ON documents(language);
        CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
        CREATE INDEX idx_document_chunks_chunk_index ON document_chunks(chunk_index);
      `);
    }
  }

  /**
   * 업로드 디렉터리 생성
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(DocumentStorageService.UPLOAD_DIR)) {
      fs.mkdirSync(DocumentStorageService.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * 처리된 문서를 데이터베이스에 저장
   */
  async saveDocument(processedDoc: ProcessedDocument, originalFilePath: string): Promise<string> {
    const transaction = this.db.transaction((doc: ProcessedDocument, filePath: string) => {
      // 파일을 업로드 디렉터리로 이동
      const fileExtension = path.extname(doc.filename);
      const savedFilename = `${doc.id}${fileExtension}`;
      const savedFilePath = path.join(DocumentStorageService.UPLOAD_DIR, savedFilename);
      
      // 파일 복사
      fs.copyFileSync(filePath, savedFilePath);

      // 문서 정보 저장
      const insertDoc = this.db.prepare(`
        INSERT INTO documents (
          id, filename, file_type, file_path, content, metadata,
          word_count, language, summary, file_size, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      insertDoc.run(
        doc.id,
        doc.filename,
        doc.fileType,
        savedFilePath,
        doc.content,
        JSON.stringify(doc.metadata),
        doc.metadata.wordCount || 0,
        doc.metadata.language || 'unknown',
        doc.metadata.summary || '',
        doc.metadata.fileSize,
        now,
        now
      );

      // 청크 정보 저장
      const insertChunk = this.db.prepare(`
        INSERT INTO document_chunks (
          id, document_id, content, chunk_index,
          start_position, end_position, word_count, sentences, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const chunk of doc.chunks) {
        chunk.documentId = doc.id; // 문서 ID 설정
        insertChunk.run(
          chunk.id,
          chunk.documentId,
          chunk.content,
          chunk.chunkIndex,
          chunk.metadata.startPosition,
          chunk.metadata.endPosition,
          chunk.metadata.wordCount,
          chunk.metadata.sentences,
          now
        );
      }

      return doc.id;
    });

    try {
      return transaction(processedDoc, originalFilePath);
    } catch (error) {
      console.error('문서 저장 중 오류:', error);
      throw new Error(`문서 저장 실패: ${error.message}`);
    }
  }

  /**
   * 문서 ID로 문서 조회
   */
  getDocumentById(documentId: string): StoredDocument | null {
    const query = this.db.prepare(`
      SELECT * FROM documents WHERE id = ?
    `);
    
    const result = query.get(documentId) as any;
    if (!result) return null;

    return {
      id: result.id,
      filename: result.filename,
      fileType: result.file_type,
      filePath: result.file_path,
      content: result.content,
      metadata: result.metadata,
      wordCount: result.word_count,
      language: result.language,
      summary: result.summary,
      fileSize: result.file_size,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  /**
   * 문서 목록 조회 (페이지네이션 지원)
   */
  getDocuments(limit: number = 20, offset: number = 0, fileType?: string): StoredDocument[] {
    let query = `
      SELECT * FROM documents
    `;
    const params: any[] = [];

    if (fileType) {
      query += ` WHERE file_type = ?`;
      params.push(fileType);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];

    return results.map(result => ({
      id: result.id,
      filename: result.filename,
      fileType: result.file_type,
      filePath: result.file_path,
      content: result.content,
      metadata: result.metadata,
      wordCount: result.word_count,
      language: result.language,
      summary: result.summary,
      fileSize: result.file_size,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }));
  }

  /**
   * 문서의 청크들 조회
   */
  getDocumentChunks(documentId: string): StoredChunk[] {
    const query = this.db.prepare(`
      SELECT * FROM document_chunks 
      WHERE document_id = ? 
      ORDER BY chunk_index ASC
    `);
    
    const results = query.all(documentId) as any[];

    return results.map(result => ({
      id: result.id,
      documentId: result.document_id,
      content: result.content,
      chunkIndex: result.chunk_index,
      startPosition: result.start_position,
      endPosition: result.end_position,
      wordCount: result.word_count,
      sentences: result.sentences,
      createdAt: result.created_at
    }));
  }

  /**
   * 텍스트 검색 (문서 내용에서)
   */
  searchDocuments(searchTerm: string, limit: number = 10): StoredDocument[] {
    const query = this.db.prepare(`
      SELECT * FROM documents 
      WHERE content LIKE ? OR filename LIKE ? OR summary LIKE ?
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    const searchPattern = `%${searchTerm}%`;
    const results = query.all(searchPattern, searchPattern, searchPattern, limit) as any[];

    return results.map(result => ({
      id: result.id,
      filename: result.filename,
      fileType: result.file_type,
      filePath: result.file_path,
      content: result.content,
      metadata: result.metadata,
      wordCount: result.word_count,
      language: result.language,
      summary: result.summary,
      fileSize: result.file_size,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }));
  }

  /**
   * 청크에서 텍스트 검색
   */
  searchChunks(searchTerm: string, limit: number = 20): StoredChunk[] {
    const query = this.db.prepare(`
      SELECT * FROM document_chunks 
      WHERE content LIKE ?
      ORDER BY chunk_index ASC 
      LIMIT ?
    `);
    
    const searchPattern = `%${searchTerm}%`;
    const results = query.all(searchPattern, limit) as any[];

    return results.map(result => ({
      id: result.id,
      documentId: result.document_id,
      content: result.content,
      chunkIndex: result.chunk_index,
      startPosition: result.start_position,
      endPosition: result.end_position,
      wordCount: result.word_count,
      sentences: result.sentences,
      createdAt: result.created_at
    }));
  }

  /**
   * 문서 삭제 (파일도 함께 삭제)
   */
  deleteDocument(documentId: string): boolean {
    const transaction = this.db.transaction((id: string) => {
      // 문서 정보 조회
      const doc = this.getDocumentById(id);
      if (!doc) return false;

      // 청크 삭제
      const deleteChunks = this.db.prepare(`DELETE FROM document_chunks WHERE document_id = ?`);
      deleteChunks.run(id);

      // 문서 삭제
      const deleteDoc = this.db.prepare(`DELETE FROM documents WHERE id = ?`);
      const result = deleteDoc.run(id);

      // 파일 삭제
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }

      return result.changes > 0;
    });

    try {
      return transaction(documentId);
    } catch (error) {
      console.error('문서 삭제 중 오류:', error);
      return false;
    }
  }

  /**
   * 문서 통계 조회
   */
  getDocumentStats(): {
    totalDocuments: number;
    totalSize: number;
    documentsByType: { [key: string]: number };
    documentsByLanguage: { [key: string]: number };
  } {
    // file_size 컬럼이 있는지 확인
    const columnsQuery = this.db.prepare("PRAGMA table_info(documents)");
    const columns = columnsQuery.all() as any[];
    const hasFileSizeColumn = columns.some(col => col.name === 'file_size');
    
    let totalQuery;
    if (hasFileSizeColumn) {
      totalQuery = this.db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as totalSize FROM documents`);
    } else {
      totalQuery = this.db.prepare(`SELECT COUNT(*) as count, 0 as totalSize FROM documents`);
    }
    const totalResult = totalQuery.get() as any;

    const typeQuery = this.db.prepare(`SELECT file_type, COUNT(*) as count FROM documents GROUP BY file_type`);
    const typeResults = typeQuery.all() as any[];

    const langQuery = this.db.prepare(`SELECT language, COUNT(*) as count FROM documents GROUP BY language`);
    const langResults = langQuery.all() as any[];

    const documentsByType: { [key: string]: number } = {};
    typeResults.forEach(result => {
      documentsByType[result.file_type] = result.count;
    });

    const documentsByLanguage: { [key: string]: number } = {};
    langResults.forEach(result => {
      documentsByLanguage[result.language] = result.count;
    });

    return {
      totalDocuments: totalResult.count || 0,
      totalSize: totalResult.totalSize || 0,
      documentsByType,
      documentsByLanguage
    };
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    this.db.close();
  }
}