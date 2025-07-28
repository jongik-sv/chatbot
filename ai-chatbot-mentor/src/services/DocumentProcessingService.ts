// services/DocumentProcessingService.ts
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedDocument {
  id: string;
  filename: string;
  fileType: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  summary?: string;
  fileSize: number;
  createdAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  startPosition: number;
  endPosition: number;
  wordCount: number;
  sentences: number;
}

export class DocumentProcessingService {
  private static readonly CHUNK_SIZE = 1000; // 단어 기준
  private static readonly CHUNK_OVERLAP = 200; // 겹치는 단어 수

  /**
   * 파일을 처리하여 텍스트 추출 및 청킹 수행
   */
  static async processDocument(filePath: string, originalFilename: string): Promise<ProcessedDocument> {
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const fileStats = fs.statSync(filePath);
    
    let content = '';
    let metadata: Partial<DocumentMetadata> = {
      fileSize: fileStats.size,
      createdAt: new Date()
    };

    try {
      switch (fileExtension) {
        case '.pdf':
          const pdfResult = await this.processPDF(filePath);
          content = pdfResult.content;
          metadata = { ...metadata, ...pdfResult.metadata };
          break;
        
        case '.docx':
          const docxResult = await this.processDOCX(filePath);
          content = docxResult.content;
          metadata = { ...metadata, ...docxResult.metadata };
          break;
        
        case '.txt':
          const txtResult = await this.processTXT(filePath);
          content = txtResult.content;
          metadata = { ...metadata, ...txtResult.metadata };
          break;
        
        default:
          throw new Error(`지원하지 않는 파일 형식입니다: ${fileExtension}`);
      }

      // 단어 수 계산
      const wordCount = this.countWords(content);
      metadata.wordCount = wordCount;

      // 언어 감지 (간단한 한국어/영어 구분)
      metadata.language = this.detectLanguage(content);

      // 요약 생성 (첫 200단어)
      metadata.summary = this.generateSummary(content);

      // 문서 청킹
      const chunks = this.chunkDocument(content);

      const processedDoc: ProcessedDocument = {
        id: uuidv4(),
        filename: originalFilename,
        fileType: fileExtension,
        content,
        metadata: metadata as DocumentMetadata,
        chunks: chunks.map((chunk, index) => ({
          id: uuidv4(),
          documentId: '', // 실제 저장 시 설정
          content: chunk.content,
          chunkIndex: index,
          metadata: chunk.metadata
        }))
      };

      return processedDoc;
    } catch (error) {
      console.error('문서 처리 중 오류:', error);
      throw new Error(`문서 처리 실패: ${error.message}`);
    }
  }

  /**
   * PDF 파일 처리
   */
  private static async processPDF(filePath: string): Promise<{ content: string; metadata: Partial<DocumentMetadata> }> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      return {
        content: pdfData.text.trim(),
        metadata: {
          pageCount: pdfData.numpages
        }
      };
    } catch (error) {
      throw new Error(`PDF 처리 오류: ${error.message}`);
    }
  }

  /**
   * DOCX 파일 처리
   */
  private static async processDOCX(filePath: string): Promise<{ content: string; metadata: Partial<DocumentMetadata> }> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (result.messages.length > 0) {
        console.warn('DOCX 처리 경고:', result.messages);
      }
      
      return {
        content: result.value.trim(),
        metadata: {}
      };
    } catch (error) {
      throw new Error(`DOCX 처리 오류: ${error.message}`);
    }
  }

  /**
   * TXT 파일 처리
   */
  private static async processTXT(filePath: string): Promise<{ content: string; metadata: Partial<DocumentMetadata> }> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      return {
        content: content.trim(),
        metadata: {}
      };
    } catch (error) {
      throw new Error(`TXT 처리 오류: ${error.message}`);
    }
  }

  /**
   * 문서를 청크로 분할 (인스턴스 메서드 추가)
   */
  async chunkDocument(content: string, options?: { maxChunkSize?: number; overlap?: number }): Promise<string[]> {
    const maxChunkSize = options?.maxChunkSize || DocumentProcessingService.CHUNK_SIZE;
    const overlap = options?.overlap || DocumentProcessingService.CHUNK_OVERLAP;
    
    const words = content.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += maxChunkSize - overlap) {
      const endIndex = Math.min(i + maxChunkSize, words.length);
      const chunkWords = words.slice(i, endIndex);
      const chunkContent = chunkWords.join(' ');
      
      chunks.push(chunkContent);
      
      // 마지막 청크인 경우 반복 종료
      if (endIndex >= words.length) break;
    }
    
    return chunks;
  }

  /**
   * 문서를 청크로 분할 (정적 메서드)
   */
  private static chunkDocument(content: string): Array<{ content: string; metadata: ChunkMetadata }> {
    const words = content.split(/\s+/);
    const chunks: Array<{ content: string; metadata: ChunkMetadata }> = [];
    
    for (let i = 0; i < words.length; i += this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
      const endIndex = Math.min(i + this.CHUNK_SIZE, words.length);
      const chunkWords = words.slice(i, endIndex);
      const chunkContent = chunkWords.join(' ');
      
      // 문장 수 계산
      const sentences = chunkContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      
      chunks.push({
        content: chunkContent,
        metadata: {
          startPosition: i,
          endPosition: endIndex,
          wordCount: chunkWords.length,
          sentences
        }
      });
      
      // 마지막 청크인 경우 반복 종료
      if (endIndex >= words.length) break;
    }
    
    return chunks;
  }

  /**
   * 단어 수 계산
   */
  private static countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 언어 감지 (간단한 한국어/영어 구분)
   */
  private static detectLanguage(text: string): string {
    const koreanChars = (text.match(/[\u3131-\u3163\uac00-\ud7a3]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 'unknown';
    
    const koreanRatio = koreanChars / totalChars;
    return koreanRatio > 0.1 ? 'ko' : 'en';
  }

  /**
   * 요약 생성 (첫 200단어)
   */
  private static generateSummary(text: string, maxWords: number = 200): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    
    const summary = words.slice(0, maxWords).join(' ');
    return summary + '...';
  }

  /**
   * 지원되는 파일 형식 확인
   */
  static isSupportedFileType(filename: string): boolean {
    const supportedExtensions = ['.pdf', '.docx', '.txt'];
    const extension = path.extname(filename).toLowerCase();
    return supportedExtensions.includes(extension);
  }

  /**
   * 파일 크기 검증
   */
  static validateFileSize(fileSize: number, maxSize: number = 50 * 1024 * 1024): boolean {
    return fileSize <= maxSize; // 기본 50MB 제한
  }

  /**
   * 파일명 보안 검증
   */
  static validateFilename(filename: string): boolean {
    // 위험한 문자 및 경로 트래버설 방지
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    const pathTraversal = /\.\./;
    
    return !dangerousChars.test(filename) && !pathTraversal.test(filename) && filename.length > 0 && filename.length <= 255;
  }
}