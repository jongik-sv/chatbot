// services/EmbeddingService.ts
import { pipeline, env } from '@xenova/transformers';
import sqlite3 from 'sqlite3';
import path from 'path';
import { chunkTextByTokens, estimateTokenCount, type TextChunk } from '@/lib/text-chunking';

// 브라우저에서 로컬 모델 사용 설정
env.allowLocalModels = false;
env.allowRemoteModels = true;

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  chunkIndex: number;
}

export interface DocumentChunk {
  text: string;
  index: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingData {
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private embeddingPipeline: any = null;
  private isInitialized = false;
  private db: sqlite3.Database;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH 
      ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
      : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
    this.db = new sqlite3.Database(dbPath);
  }

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * 임베딩 파이프라인 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing embedding pipeline...');
      
      // 다국어 지원 임베딩 모델 사용 (한국어 포함)
      // paraphrase-multilingual-MiniLM-L12-v2는 50개 이상 언어 지원
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
      );
      
      this.isInitialized = true;
      console.log('Embedding pipeline initialized successfully');
    } catch (error) {
      console.error('Failed to initialize embedding pipeline:', error);
      throw error;
    }
  }

  /**
   * 텍스트를 벡터로 변환 (별칭 메서드)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.embedText(text);
  }

  /**
   * 임베딩을 데이터베이스에 저장
   */
  async storeEmbedding(data: EmbeddingData): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO embeddings (
          document_id, chunk_index, chunk_text, embedding, metadata
        ) VALUES (?, ?, ?, ?, ?)
      `);

      // Float32Array로 변환하여 BLOB으로 저장
      const embeddingBuffer = Buffer.from(new Float32Array(data.embedding).buffer);

      stmt.run([
        data.documentId,
        data.chunkIndex,
        data.chunkText,
        embeddingBuffer,
        JSON.stringify(data.metadata || {})
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      stmt.finalize();
    });
  }

  /**
   * 텍스트를 벡터로 변환
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 텍스트 전처리
      const cleanText = this.preprocessText(text);
      
      // 임베딩 생성
      const output = await this.embeddingPipeline(cleanText, {
        pooling: 'mean',
        normalize: true
      });

      // Tensor를 배열로 변환
      const embedding = Array.from(output.data);
      
      return embedding;
    } catch (error) {
      console.error('Failed to embed text:', error);
      throw error;
    }
  }

  /**
   * 문서를 청크로 분할 (문자 기반)
   */
  chunkDocumentByCharacter(text: string, chunkSize: number = 1000, overlap: number = 50): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // 현재 청크에 문장 추가
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (testChunk.length <= chunkSize) {
        currentChunk = testChunk;
      } else {
        // 현재 청크가 완성되면 저장
        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            metadata: {
              chunkType: 'character',
              sentenceStart: Math.max(0, i - this.countSentencesInText(currentChunk)),
              sentenceEnd: i - 1
            }
          });
        }
        
        // 새 청크 시작 (overlap 고려)
        if (overlap > 0 && chunks.length > 0) {
          const overlapText = this.getOverlapText(chunks[chunks.length - 1].text, overlap);
          currentChunk = overlapText + ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    // 마지막 청크 추가
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          chunkType: 'character',
          sentenceStart: sentences.length - this.countSentencesInText(currentChunk),
          sentenceEnd: sentences.length - 1
        }
      });
    }
    
    return chunks;
  }

  /**
   * 문서를 페이지 단위로 청크 분할
   */
  chunkDocumentByPage(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // 페이지 구분자들을 찾아서 분할
    const pagePatterns = [
      /\f/g,                           // Form Feed (페이지 구분자)
      /Page\s+\d+/gi,                  // "Page 1", "페이지 1" 등
      /페이지\s*\d+/gi,                // "페이지 1", "페이지1" 등
      /^-+\s*페이지\s*-+$/gim,         // "--- 페이지 ---" 형태
      /^=+\s*Page\s*=+$/gim,          // "=== Page ===" 형태
      /^\d+\s*\/\s*\d+$/gm,           // "1/10" 형태의 페이지 번호
    ];
    
    let pages: string[] = [];
    let remainingText = text;
    
    // 각 패턴으로 페이지 분할 시도
    for (const pattern of pagePatterns) {
      const resetPattern = new RegExp(pattern.source, pattern.flags);
      if (resetPattern.test(remainingText)) {
        pages = remainingText.split(resetPattern).filter(page => page.trim().length > 100); // 너무 작은 페이지 제외
        console.log(`페이지 패턴 발견: ${pattern}, ${pages.length}개 페이지로 분할`);
        break;
      }
    }
    
    // 패턴이 없으면 대략적인 페이지 크기로 분할 (일반적으로 2000-3000자 정도)
    if (pages.length <= 1) {
      const averagePageSize = 2500; // 평균 페이지 크기 (더 작게 조정)
      const textLength = text.length;
      const estimatedPages = Math.ceil(textLength / averagePageSize);
      
      console.log(`페이지 구분자가 없어서 추정 분할: ${estimatedPages}개 페이지 (전체 ${textLength}자)`);
      
      pages = [];
      for (let i = 0; i < estimatedPages; i++) {
        const start = i * averagePageSize;
        const end = Math.min((i + 1) * averagePageSize, textLength);
        let pageText = text.slice(start, end);
        
        // 문장이 중간에 잘리지 않도록 조정
        if (end < textLength && !pageText.match(/[.!?]\s*$/)) {
          const nextSentenceEnd = text.slice(end).search(/[.!?]\s/);
          if (nextSentenceEnd > 0 && nextSentenceEnd < 200) { // 200자 이내에서만 조정
            pageText += text.slice(end, end + nextSentenceEnd + 1);
          }
        }
        
        pages.push(pageText);
        console.log(`페이지 ${i + 1}: ${pageText.length}자`);
      }
    }
    
    // 각 페이지를 청크로 변환
    pages.forEach((page, index) => {
      const cleanPage = page.trim();
      if (cleanPage.length > 0) {
        chunks.push({
          text: cleanPage,
          index: index,
          metadata: {
            chunkType: 'page',
            pageNumber: index + 1,
            totalPages: pages.length,
            characterCount: cleanPage.length,
            wordCount: cleanPage.split(/\s+/).length
          }
        });
      }
    });
    
    console.log(`총 ${chunks.length}개의 페이지 청크 생성 완료`);
    return chunks;
  }

  /**
   * 문서를 토큰 기반으로 청크 분할 (NEW - 기본 권장)
   */
  chunkDocumentByTokens(text: string, maxTokens: number = 500, overlapTokens: number = 50): DocumentChunk[] {
    const chunks = chunkTextByTokens(text, {
      maxTokens,
      overlapTokens,
      preserveSentences: true
    });
    
    return chunks.map(chunk => ({
      text: chunk.text,
      index: chunk.chunkIndex,
      metadata: {
        chunkType: 'token-based',
        tokenCount: chunk.tokenCount,
        characterCount: chunk.text.length,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        maxTokens,
        overlapTokens
      }
    }));
  }

  /**
   * 환경변수에서 청킹 설정 읽기
   */
  private getChunkingConfig() {
    const chunkSize = parseInt(process.env.EMBEDDING_CHUNK_SIZE || '500');
    const overlapSize = parseInt(process.env.EMBEDDING_OVERLAP_SIZE || '50');
    const chunkMode = (process.env.EMBEDDING_CHUNK_MODE || 'token') as 'character' | 'page' | 'token';
    
    return {
      chunkSize,
      overlapSize,
      chunkMode
    };
  }

  /**
   * 문서를 청크로 분할 (통합 메서드)
   */
  chunkDocument(
    text: string, 
    mode?: 'character' | 'page' | 'token', 
    chunkSize?: number, 
    overlap?: number
  ): DocumentChunk[] {
    const config = this.getChunkingConfig();
    const finalMode = mode || config.chunkMode;
    const finalChunkSize = chunkSize || config.chunkSize;
    const finalOverlap = overlap || config.overlapSize;
    
    console.log(`청킹 모드: ${finalMode}, 크기: ${finalChunkSize}, 오버랩: ${finalOverlap}`);
    
    switch (finalMode) {
      case 'token':
        return this.chunkDocumentByTokens(text, finalChunkSize, finalOverlap);
      case 'page':
        return this.chunkDocumentByPage(text);
      case 'character':
        return this.chunkDocumentByCharacter(text, finalChunkSize, finalOverlap);
      default:
        return this.chunkDocumentByTokens(text, finalChunkSize, finalOverlap);
    }
  }

  /**
   * 문서 전체를 청크로 분할하고 벡터화
   */
  async embedDocument(
    text: string, 
    mode?: 'character' | 'page' | 'token', 
    chunkSize?: number,
    overlap?: number
  ): Promise<EmbeddingResult[]> {
    const config = this.getChunkingConfig();
    const finalMode = mode || config.chunkMode;
    const finalChunkSize = chunkSize || config.chunkSize;
    const finalOverlap = overlap || config.overlapSize;
    
    const chunks = this.chunkDocument(text, finalMode, finalChunkSize, finalOverlap);
    const results: EmbeddingResult[] = [];
    
    console.log(`Processing ${chunks.length} ${finalMode} chunks for embedding...`);
    
    for (const chunk of chunks) {
      try {
        const embedding = await this.embedText(chunk.text);
        results.push({
          embedding,
          text: chunk.text,
          chunkIndex: chunk.index
        });
        
        // 진행률 표시 (모드별 간격 조정)
        const progressInterval = finalMode === 'page' ? 1 : (finalMode === 'token' ? 5 : 10);
        if ((chunk.index + 1) % progressInterval === 0 || chunk.index === chunks.length - 1) {
          if (finalMode === 'page') {
            console.log(`Embedded page ${chunk.index + 1}/${chunks.length} (${chunk.metadata?.characterCount || 0} chars)`);
          } else if (finalMode === 'token') {
            console.log(`Embedded ${chunk.index + 1}/${chunks.length} token chunks (${chunk.metadata?.tokenCount || 0} tokens)`);
          } else {
            console.log(`Embedded ${chunk.index + 1}/${chunks.length} chunks`);
          }
        }
      } catch (error) {
        console.error(`Failed to embed ${finalMode} chunk ${chunk.index}:`, error);
        // 실패한 청크는 건너뛰고 계속 진행
      }
    }
    
    console.log(`Embedding completed: ${results.length}/${chunks.length} ${finalMode} chunks processed`);
    return results;
  }

  /**
   * 쿼리 텍스트와 문서 청크들 간의 유사도 계산
   */
  async findSimilarChunks(
    queryText: string, 
    documentEmbeddings: Array<{ embedding: number[]; text: string; chunkIndex: number }>,
    topK: number = 5,
    threshold: number = 0.5
  ): Promise<Array<{ text: string; score: number; chunkIndex: number }>> {
    const queryEmbedding = await this.embedText(queryText);
    
    const similarities = documentEmbeddings.map((doc) => ({
      text: doc.text,
      chunkIndex: doc.chunkIndex,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));
    
    // 점수 기준으로 정렬하고 상위 K개 선택
    return similarities
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * 코사인 유사도 계산
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
   * 텍스트 전처리
   */
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')  // 여러 공백을 하나로
      // 한국어, 영어, 숫자, 기본 문장부호만 유지 (한국어 유니코드 범위 포함)
      .replace(/[^\w\s\.\,\!\?\-\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/g, '')
      .slice(0, 512);  // 모델 입력 길이 제한
  }

  /**
   * 문장 단위로 분할
   */
  private splitIntoSentences(text: string): string[] {
    return text
      // 한국어와 영어 문장 끝 패턴 모두 고려
      .split(/[.!?。！？]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * 텍스트 내 문장 개수 세기
   */
  private countSentencesInText(text: string): number {
    return this.splitIntoSentences(text).length;
  }

  /**
   * Overlap을 위한 텍스트 추출
   */
  private getOverlapText(text: string, overlapLength: number): string {
    const words = text.split(' ');
    return words.slice(-overlapLength).join(' ');
  }

  /**
   * 파이프라인 정리
   */
  dispose(): void {
    this.embeddingPipeline = null;
    this.isInitialized = false;
  }
}

export const embeddingService = EmbeddingService.getInstance();
export default EmbeddingService;