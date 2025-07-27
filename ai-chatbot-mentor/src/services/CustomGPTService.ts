// services/CustomGPTService.ts
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface CustomGPT {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  knowledgeBaseIds: string[];
  isPublic: boolean;
  createdBy: number; // user ID
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  embeddingModel: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentEmbedding {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  chunkId: string;
  content: string;
  embedding: number[];
  metadata: string; // JSON string
  createdAt: string;
}

export class CustomGPTService {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), '..', 'data', 'chatbot.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  /**
   * 커스텀 GPT 및 지식 베이스 테이블 초기화
   */
  private initializeTables(): void {
    // custom_gpts 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS custom_gpts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2048,
        model TEXT DEFAULT 'gemini-1.5-flash',
        knowledge_base_ids TEXT DEFAULT '[]',
        is_public BOOLEAN DEFAULT 0,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // knowledge_bases 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_bases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        document_ids TEXT DEFAULT '[]',
        embedding_model TEXT DEFAULT 'tfidf',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // document_embeddings 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_embeddings (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        knowledge_base_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
        FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases (id) ON DELETE CASCADE
      )
    `);

    // 인덱스 생성
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_custom_gpts_created_by ON custom_gpts(created_by);
      CREATE INDEX IF NOT EXISTS idx_custom_gpts_is_public ON custom_gpts(is_public);
      CREATE INDEX IF NOT EXISTS idx_knowledge_bases_created_by ON knowledge_bases(created_by);
      CREATE INDEX IF NOT EXISTS idx_document_embeddings_knowledge_base_id ON document_embeddings(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);
    `);
  }

  /**
   * 커스텀 GPT 생성
   */
  createCustomGPT(data: Omit<CustomGPT, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO custom_gpts (
        id, name, description, system_prompt, temperature, max_tokens, 
        model, knowledge_base_ids, is_public, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description || '',
      data.systemPrompt,
      data.temperature,
      data.maxTokens,
      data.model,
      JSON.stringify(data.knowledgeBaseIds),
      data.isPublic ? 1 : 0,
      data.createdBy,
      now,
      now
    );

    return id;
  }

  /**
   * 커스텀 GPT 조회
   */
  getCustomGPT(id: string): CustomGPT | null {
    const stmt = this.db.prepare(`
      SELECT * FROM custom_gpts WHERE id = ?
    `);
    
    const result = stmt.get(id) as any;
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description || '',
      systemPrompt: result.system_prompt,
      temperature: result.temperature,
      maxTokens: result.max_tokens,
      model: result.model,
      knowledgeBaseIds: JSON.parse(result.knowledge_base_ids || '[]'),
      isPublic: Boolean(result.is_public),
      createdBy: result.created_by,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  /**
   * 사용자별 커스텀 GPT 목록 조회
   */
  getUserCustomGPTs(userId: number, includePublic: boolean = true): CustomGPT[] {
    let query = `
      SELECT * FROM custom_gpts 
      WHERE created_by = ?
    `;
    const params = [userId];

    if (includePublic) {
      query += ` OR is_public = 1`;
    }

    query += ` ORDER BY updated_at DESC`;

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];

    return results.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description || '',
      systemPrompt: result.system_prompt,
      temperature: result.temperature,
      maxTokens: result.max_tokens,
      model: result.model,
      knowledgeBaseIds: JSON.parse(result.knowledge_base_ids || '[]'),
      isPublic: Boolean(result.is_public),
      createdBy: result.created_by,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }));
  }

  /**
   * 커스텀 GPT 업데이트
   */
  updateCustomGPT(id: string, data: Partial<Omit<CustomGPT, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>): boolean {
    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updateFields.push('description = ?');
      values.push(data.description);
    }
    if (data.systemPrompt !== undefined) {
      updateFields.push('system_prompt = ?');
      values.push(data.systemPrompt);
    }
    if (data.temperature !== undefined) {
      updateFields.push('temperature = ?');
      values.push(data.temperature);
    }
    if (data.maxTokens !== undefined) {
      updateFields.push('max_tokens = ?');
      values.push(data.maxTokens);
    }
    if (data.model !== undefined) {
      updateFields.push('model = ?');
      values.push(data.model);
    }
    if (data.knowledgeBaseIds !== undefined) {
      updateFields.push('knowledge_base_ids = ?');
      values.push(JSON.stringify(data.knowledgeBaseIds));
    }
    if (data.isPublic !== undefined) {
      updateFields.push('is_public = ?');
      values.push(data.isPublic ? 1 : 0);
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE custom_gpts 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * 커스텀 GPT 삭제
   */
  deleteCustomGPT(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM custom_gpts WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 지식 베이스 생성
   */
  createKnowledgeBase(data: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO knowledge_bases (
        id, name, description, document_ids, embedding_model, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description || '',
      JSON.stringify(data.documentIds),
      data.embeddingModel,
      data.createdBy,
      now,
      now
    );

    return id;
  }

  /**
   * 지식 베이스 조회
   */
  getKnowledgeBase(id: string): KnowledgeBase | null {
    const stmt = this.db.prepare(`
      SELECT * FROM knowledge_bases WHERE id = ?
    `);
    
    const result = stmt.get(id) as any;
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description || '',
      documentIds: JSON.parse(result.document_ids || '[]'),
      embeddingModel: result.embedding_model,
      createdBy: result.created_by,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  /**
   * 사용자별 지식 베이스 목록 조회
   */
  getUserKnowledgeBases(userId: number): KnowledgeBase[] {
    const stmt = this.db.prepare(`
      SELECT * FROM knowledge_bases 
      WHERE created_by = ? 
      ORDER BY updated_at DESC
    `);
    
    const results = stmt.all(userId) as any[];

    return results.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description || '',
      documentIds: JSON.parse(result.document_ids || '[]'),
      embeddingModel: result.embedding_model,
      createdBy: result.created_by,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }));
  }

  /**
   * 지식 베이스에 문서 추가
   */
  addDocumentToKnowledgeBase(knowledgeBaseId: string, documentId: string): boolean {
    const kb = this.getKnowledgeBase(knowledgeBaseId);
    if (!kb) return false;

    if (!kb.documentIds.includes(documentId)) {
      kb.documentIds.push(documentId);
      return this.updateKnowledgeBase(knowledgeBaseId, { documentIds: kb.documentIds });
    }

    return true;
  }

  /**
   * 지식 베이스에서 문서 제거
   */
  removeDocumentFromKnowledgeBase(knowledgeBaseId: string, documentId: string): boolean {
    const kb = this.getKnowledgeBase(knowledgeBaseId);
    if (!kb) return false;

    const index = kb.documentIds.indexOf(documentId);
    if (index > -1) {
      kb.documentIds.splice(index, 1);
      return this.updateKnowledgeBase(knowledgeBaseId, { documentIds: kb.documentIds });
    }

    return true;
  }

  /**
   * 지식 베이스 업데이트
   */
  updateKnowledgeBase(id: string, data: Partial<Omit<KnowledgeBase, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>): boolean {
    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updateFields.push('description = ?');
      values.push(data.description);
    }
    if (data.documentIds !== undefined) {
      updateFields.push('document_ids = ?');
      values.push(JSON.stringify(data.documentIds));
    }
    if (data.embeddingModel !== undefined) {
      updateFields.push('embedding_model = ?');
      values.push(data.embeddingModel);
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE knowledge_bases 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * 지식 베이스 삭제
   */
  deleteKnowledgeBase(id: string): boolean {
    const transaction = this.db.transaction(() => {
      // 관련 임베딩 삭제
      const deleteEmbeddings = this.db.prepare(`DELETE FROM document_embeddings WHERE knowledge_base_id = ?`);
      deleteEmbeddings.run(id);

      // 지식 베이스 삭제
      const deleteKB = this.db.prepare(`DELETE FROM knowledge_bases WHERE id = ?`);
      return deleteKB.run(id);
    });

    const result = transaction();
    return result.changes > 0;
  }

  /**
   * 문서 임베딩 저장
   */
  saveDocumentEmbedding(data: Omit<DocumentEmbedding, 'id' | 'createdAt'>): string {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO document_embeddings (
        id, document_id, knowledge_base_id, chunk_id, content, embedding, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.documentId,
      data.knowledgeBaseId,
      data.chunkId,
      data.content,
      JSON.stringify(data.embedding),
      data.metadata,
      now
    );

    return id;
  }

  /**
   * 지식 베이스의 임베딩 조회
   */
  getKnowledgeBaseEmbeddings(knowledgeBaseId: string): DocumentEmbedding[] {
    const stmt = this.db.prepare(`
      SELECT * FROM document_embeddings 
      WHERE knowledge_base_id = ? 
      ORDER BY created_at ASC
    `);
    
    const results = stmt.all(knowledgeBaseId) as any[];

    return results.map(result => ({
      id: result.id,
      documentId: result.document_id,
      knowledgeBaseId: result.knowledge_base_id,
      chunkId: result.chunk_id,
      content: result.content,
      embedding: JSON.parse(result.embedding),
      metadata: result.metadata,
      createdAt: result.created_at
    }));
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    this.db.close();
  }
}