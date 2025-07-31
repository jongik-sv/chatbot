// services/VectorSearchService.ts
import { BaseRepository } from '@/lib/database';
import { embeddingService, EmbeddingResult } from './EmbeddingService';

export interface StoredEmbedding {
  id: number;
  documentId: number;
  chunkText: string;
  embedding: number[];
  chunkIndex: number;
  metadata: Record<string, any>;
}

export interface SearchResult {
  documentId: number;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  metadata: Record<string, any>;
  documentTitle?: string;
  documentPath?: string;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  documentIds?: number[];
  includeMetadata?: boolean;
}

export class VectorSearchService extends BaseRepository {
  private static instance: VectorSearchService;

  private constructor() {
    super();
  }

  static getInstance(): VectorSearchService {
    if (!VectorSearchService.instance) {
      VectorSearchService.instance = new VectorSearchService();
    }
    return VectorSearchService.instance;
  }

  /**
   * 문서의 임베딩을 데이터베이스에 저장
   */
  async storeDocumentEmbeddings(documentId: number, embeddings: EmbeddingResult[]): Promise<void> {
    const stmt = this.prepare(`
      INSERT INTO embeddings (document_id, chunk_text, embedding, chunk_index, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      this.db.transaction(() => {
        for (const embedding of embeddings) {
          const embeddingBlob = Buffer.from(new Float32Array(embedding.embedding).buffer);
          const metadata = JSON.stringify({
            textLength: embedding.text.length,
            createdAt: new Date().toISOString()
          });

          stmt.run(
            documentId,
            embedding.text,
            embeddingBlob,
            embedding.chunkIndex,
            metadata
          );
        }
      })();

      console.log(`Stored ${embeddings.length} embeddings for document ${documentId}`);
    } catch (error) {
      console.error('Failed to store embeddings:', error);
      throw error;
    } finally {
    }
  }

  /**
   * 문서 전체를 처리하여 임베딩 생성 및 저장
   */
  async processAndStoreDocument(
    documentId: number, 
    documentText: string, 
    mode?: 'character' | 'page' | 'token',
    chunkSize?: number,
    overlap?: number
  ): Promise<void> {
    try {
      const finalMode = mode || (process.env.EMBEDDING_CHUNK_MODE as 'character' | 'page' | 'token') || 'token';
      const finalChunkSize = chunkSize || parseInt(process.env.EMBEDDING_CHUNK_SIZE || '500');
      const finalOverlap = overlap || parseInt(process.env.EMBEDDING_OVERLAP_SIZE || '50');
      
      console.log(`Processing document ${documentId} for embeddings using ${finalMode} mode (chunkSize: ${finalChunkSize}, overlap: ${finalOverlap})...`);
      
      // 문서를 청크로 분할하고 임베딩 생성 (환경변수 기본값 사용)
      const embeddings = await embeddingService.embedDocument(documentText, finalMode, finalChunkSize, finalOverlap);
      
      // 기존 임베딩 삭제 (재처리 시)
      await this.deleteDocumentEmbeddings(documentId);
      
      // 새 임베딩 저장
      await this.storeDocumentEmbeddings(documentId, embeddings);
      
      console.log(`Document ${documentId} processing completed with ${embeddings.length} ${finalMode} chunks`);
    } catch (error) {
      console.error(`Failed to process document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * 유사도 검색 수행
   */
  async searchSimilarChunks(queryText: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      topK = 5,
      threshold = 0.5,
      documentIds,
      includeMetadata = true
    } = options;

    try {
      // 쿼리 텍스트를 벡터로 변환
      const queryEmbedding = await embeddingService.embedText(queryText);

      // 모든 임베딩 조회 (필터링 조건 적용)
      let sql = `
        SELECT e.*, d.filename, d.file_path 
        FROM embeddings e
        LEFT JOIN documents d ON e.document_id = d.id
      `;
      
      const params: any[] = [];
      
      if (documentIds && documentIds.length > 0) {
        sql += ` WHERE e.document_id IN (${documentIds.map(() => '?').join(',')})`;
        params.push(...documentIds);
      }

      const stmt = this.prepare(sql);
      const rows = stmt.all(...params) as any[];

      console.log('VectorSearchService - 검색 쿼리:', sql);
      console.log('VectorSearchService - 파라미터:', params);
      console.log('VectorSearchService - DB 행 수:', rows.length);

      // 각 임베딩과 유사도 계산
      const similarities: SearchResult[] = [];
      const allSimilarities: number[] = [];
      
      for (const row of rows) {
        try {
          // 임베딩 데이터 파싱 - BLOB 또는 JSON 형식 처리
          let embedding: number[];
          
          if (Buffer.isBuffer(row.embedding)) {
            // BLOB로 저장된 경우 (Float32Array) - 우선 처리
            const embeddingBuffer = Buffer.from(row.embedding);
            const embeddingArray = new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.length / 4);
            embedding = Array.from(embeddingArray);
          } else if (typeof row.embedding === 'string') {
            // JSON 문자열로 저장된 경우 (레거시)
            embedding = JSON.parse(row.embedding);
          } else {
            // 기타 형식 처리
            console.warn(`Unknown embedding format for row ${row.id}:`, typeof row.embedding);
            continue;
          }

          if (queryEmbedding.length !== embedding.length) {
            console.warn(`Dimension mismatch for row ${row.id}: Query=${queryEmbedding.length}, Stored=${embedding.length}`);
            continue;
          }

          // 유사도 계산
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);
          allSimilarities.push(similarity);

          if (similarity >= threshold) {
            similarities.push({
              documentId: row.document_id,
              chunkText: row.chunk_text,
              chunkIndex: row.chunk_index,
              similarity,
              metadata: includeMetadata ? JSON.parse(row.metadata || '{}') : {},
              documentTitle: row.filename,
              documentPath: row.file_path
            });
          }
        } catch (error) {
          console.warn(`Failed to process embedding for row ${row.id}:`, error);
          continue;
        }
      }

      console.log('VectorSearchService - 유사도 통계:', {
        전체_계산된_유사도: allSimilarities.length,
        최고_유사도: Math.max(...allSimilarities),
        최저_유사도: Math.min(...allSimilarities),
        평균_유사도: allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length,
        threshold: threshold,
        threshold_이상_결과: similarities.length
      });

      // 유사도 순으로 정렬하고 상위 K개 반환
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

    } catch (error) {
      console.error('Failed to search similar chunks:', error);
      throw error;
    }
  }

  /**
   * 특정 문서의 임베딩 조회
   */
  async getDocumentEmbeddings(documentId: number): Promise<StoredEmbedding[]> {
    const stmt = this.prepare(`
      SELECT * FROM embeddings 
      WHERE document_id = ? 
      ORDER BY chunk_index
    `);

    const rows = stmt.all(documentId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      documentId: row.document_id,
      chunkText: row.chunk_text,
      embedding: this.blobToFloatArray(row.embedding),
      chunkIndex: row.chunk_index,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * 문서의 임베딩 삭제
   */
  async deleteDocumentEmbeddings(documentId: number): Promise<void> {
    const stmt = this.prepare(`DELETE FROM embeddings WHERE document_id = ?`);
    
    try {
      const result = stmt.run(documentId);
      console.log(`Deleted ${result.changes} embeddings for document ${documentId}`);
    } catch (error) {
      console.error(`Failed to delete embeddings for document ${documentId}:`, error);
      throw error;
    } finally {
    }
  }

  /**
   * 임베딩 통계 조회
   */
  async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    documentsWithEmbeddings: number;
    avgChunksPerDocument: number;
  }> {
    const totalStmt = this.prepare(`SELECT COUNT(*) as count FROM embeddings`);
    const docsStmt = this.prepare(`SELECT COUNT(DISTINCT document_id) as count FROM embeddings`);
    
    const totalResult = totalStmt.get() as { count: number };
    const docsResult = docsStmt.get() as { count: number };
    
    const totalEmbeddings = totalResult.count;
    const documentsWithEmbeddings = docsResult.count;
    const avgChunksPerDocument = documentsWithEmbeddings > 0 ? totalEmbeddings / documentsWithEmbeddings : 0;

    return {
      totalEmbeddings,
      documentsWithEmbeddings,
      avgChunksPerDocument: Math.round(avgChunksPerDocument * 100) / 100
    };
  }

  /**
   * 코사인 유사도 계산 (EmbeddingService와 동일)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * BLOB을 Float32Array로 변환
   */
  private blobToFloatArray(blob: Buffer): number[] {
    const buffer = Buffer.from(blob);
    const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
    return Array.from(floatArray);
  }

  /**
   * 인덱스 최적화 (대용량 데이터 처리시 성능 향상)
   */
  async optimizeIndexes(): Promise<void> {
    try {
      // 임베딩 검색 최적화를 위한 인덱스
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_document_chunk 
        ON embeddings(document_id, chunk_index);
      `);
      
      console.log('Vector search indexes optimized');
    } catch (error) {
      console.error('Failed to optimize indexes:', error);
      throw error;
    }
  }
}

export const vectorSearchService = VectorSearchService.getInstance();