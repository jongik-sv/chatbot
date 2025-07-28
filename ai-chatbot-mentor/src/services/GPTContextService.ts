// services/GPTContextService.ts
import { CustomGPTService } from './CustomGPTService';
import { EmbeddingService } from './EmbeddingService';
import { VectorSearchService } from './VectorSearchService';

export interface GPTContextResult {
  relevantChunks: Array<{
    content: string;
    score: number;
    source: string;
    documentId: string;
    chunkId: string;
  }>;
  contextPrompt: string;
  sources: Array<{
    documentId: string;
    filename: string;
    relevance: number;
  }>;
}

export interface GPTChatRequest {
  gptId: string;
  message: string;
  userId: number;
  includeContext?: boolean;
  maxContextChunks?: number;
  contextThreshold?: number;
}

export interface GPTChatResponse {
  response: string;
  context?: GPTContextResult;
  model: string;
  tokensUsed?: number;
  sources?: Array<{
    documentId: string;
    filename: string;
    relevance: number;
  }>;
}

export class GPTContextService {
  private customGPTService: CustomGPTService;
  private embeddingService: EmbeddingService;
  private vectorSearchService: VectorSearchService;

  constructor() {
    this.customGPTService = new CustomGPTService();
    this.embeddingService = EmbeddingService.getInstance();
    this.vectorSearchService = new VectorSearchService();
  }

  /**
   * GPT별 지식 베이스에서 관련 컨텍스트 검색
   */
  async searchKnowledgeBase(
    gptId: string,
    query: string,
    options: {
      maxChunks?: number;
      threshold?: number;
      knowledgeBaseId?: string;
    } = {}
  ): Promise<GPTContextResult> {
    const { maxChunks = 5, threshold = 0.5, knowledgeBaseId } = options;

    try {
      // GPT 정보 조회
      const gpt = this.customGPTService.getCustomGPT(gptId);
      if (!gpt) {
        throw new Error('GPT를 찾을 수 없습니다');
      }

      // 검색할 지식 베이스 결정
      const knowledgeBaseIds = knowledgeBaseId 
        ? [knowledgeBaseId] 
        : gpt.knowledgeBaseIds;

      if (knowledgeBaseIds.length === 0) {
        return {
          relevantChunks: [],
          contextPrompt: '',
          sources: []
        };
      }

      // 쿼리 임베딩 생성
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // 모든 지식 베이스에서 관련 청크 검색
      const allRelevantChunks: Array<{
        content: string;
        score: number;
        source: string;
        documentId: string;
        chunkId: string;
        knowledgeBaseId: string;
      }> = [];

      for (const kbId of knowledgeBaseIds) {
        const knowledgeBase = this.customGPTService.getKnowledgeBase(kbId);
        if (!knowledgeBase) continue;

        // 지식 베이스의 모든 임베딩 조회
        const embeddings = this.customGPTService.getKnowledgeBaseEmbeddings(kbId);

        // 유사도 계산 및 필터링
        for (const embedding of embeddings) {
          const score = this.calculateCosineSimilarity(queryEmbedding, embedding.embedding);
          
          if (score >= threshold) {
            allRelevantChunks.push({
              content: embedding.content,
              score,
              source: knowledgeBase.name,
              documentId: embedding.documentId,
              chunkId: embedding.chunkId,
              knowledgeBaseId: kbId
            });
          }
        }
      }

      // 점수 기준으로 정렬하고 상위 N개 선택
      const topChunks = allRelevantChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxChunks);

      // 컨텍스트 프롬프트 생성
      const contextPrompt = this.buildContextPrompt(topChunks, query);

      // 소스 정보 집계
      const sourceMap = new Map<string, { filename: string; relevance: number; count: number }>();
      
      for (const chunk of topChunks) {
        const docId = chunk.documentId;
        if (sourceMap.has(docId)) {
          const existing = sourceMap.get(docId)!;
          existing.relevance = Math.max(existing.relevance, chunk.score);
          existing.count += 1;
        } else {
          // 실제 구현에서는 DocumentRepository에서 파일명을 가져와야 함
          sourceMap.set(docId, {
            filename: `Document ${docId}`, // 임시
            relevance: chunk.score,
            count: 1
          });
        }
      }

      const sources = Array.from(sourceMap.entries()).map(([docId, info]) => ({
        documentId: docId,
        filename: info.filename,
        relevance: info.relevance
      }));

      return {
        relevantChunks: topChunks.map(chunk => ({
          content: chunk.content,
          score: chunk.score,
          source: chunk.source,
          documentId: chunk.documentId,
          chunkId: chunk.chunkId
        })),
        contextPrompt,
        sources
      };

    } catch (error) {
      console.error('지식 베이스 검색 오류:', error);
      throw error;
    }
  }

  /**
   * GPT와 컨텍스트를 활용한 답변 생성
   */
  async generateContextualResponse(request: GPTChatRequest): Promise<GPTChatResponse> {
    try {
      // GPT 정보 조회
      const gpt = this.customGPTService.getCustomGPT(request.gptId);
      if (!gpt) {
        throw new Error('GPT를 찾을 수 없습니다');
      }

      let context: GPTContextResult | undefined;
      let finalPrompt = request.message;

      // 컨텍스트 포함 요청인 경우
      if (request.includeContext !== false && gpt.knowledgeBaseIds.length > 0) {
        context = await this.searchKnowledgeBase(request.gptId, request.message, {
          maxChunks: request.maxContextChunks || 5,
          threshold: request.contextThreshold || 0.5
        });

        // 컨텍스트가 있는 경우 프롬프트에 포함
        if (context.relevantChunks.length > 0) {
          finalPrompt = this.buildFinalPrompt(gpt.systemPrompt, context.contextPrompt, request.message);
        } else {
          finalPrompt = this.buildFinalPrompt(gpt.systemPrompt, '', request.message);
        }
      } else {
        finalPrompt = this.buildFinalPrompt(gpt.systemPrompt, '', request.message);
      }

      // 실제 LLM 호출 (여기서는 모의 응답)
      const response = await this.callLLM(finalPrompt, gpt);

      return {
        response,
        context,
        model: gpt.model,
        sources: context?.sources
      };

    } catch (error) {
      console.error('컨텍스트 기반 응답 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 컨텍스트 프롬프트 구성
   */
  private buildContextPrompt(
    chunks: Array<{
      content: string;
      score: number;
      source: string;
      documentId: string;
      chunkId: string;
    }>,
    query: string
  ): string {
    if (chunks.length === 0) {
      return '';
    }

    const contextSections = chunks.map((chunk, index) => 
      `[출처 ${index + 1}: ${chunk.source}]\n${chunk.content}`
    ).join('\n\n');

    return `다음은 사용자의 질문과 관련된 문서 내용입니다:\n\n${contextSections}\n\n위 정보를 참고하여 답변해주세요.`;
  }

  /**
   * 최종 프롬프트 구성
   */
  private buildFinalPrompt(systemPrompt: string, contextPrompt: string, userMessage: string): string {
    let prompt = systemPrompt;

    if (contextPrompt) {
      prompt += '\n\n' + contextPrompt;
    }

    prompt += '\n\n사용자 질문: ' + userMessage;

    if (contextPrompt) {
      prompt += '\n\n답변 시 참고한 출처를 명시해주세요.';
    }

    return prompt;
  }

  /**
   * LLM 호출 (실제 구현에서는 LLMService를 사용)
   */
  private async callLLM(prompt: string, gpt: any): Promise<string> {
    // 실제 구현에서는 LLMService를 통해 해당 모델 호출
    // 여기서는 모의 응답 반환
    return `[${gpt.model}을 통한 응답] ${prompt.slice(0, 100)}...에 대한 답변입니다.`;
  }

  /**
   * 코사인 유사도 계산
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
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
   * 지식 베이스 통계 조회
   */
  async getKnowledgeBaseStats(gptId: string): Promise<{
    totalKnowledgeBases: number;
    totalDocuments: number;
    totalChunks: number;
    averageChunkSize: number;
  }> {
    try {
      const gpt = this.customGPTService.getCustomGPT(gptId);
      if (!gpt) {
        throw new Error('GPT를 찾을 수 없습니다');
      }

      let totalDocuments = 0;
      let totalChunks = 0;
      let totalChunkSize = 0;

      for (const kbId of gpt.knowledgeBaseIds) {
        const kb = this.customGPTService.getKnowledgeBase(kbId);
        if (kb) {
          totalDocuments += kb.documentIds.length;
          
          const embeddings = this.customGPTService.getKnowledgeBaseEmbeddings(kbId);
          totalChunks += embeddings.length;
          totalChunkSize += embeddings.reduce((sum, emb) => sum + emb.content.length, 0);
        }
      }

      return {
        totalKnowledgeBases: gpt.knowledgeBaseIds.length,
        totalDocuments,
        totalChunks,
        averageChunkSize: totalChunks > 0 ? Math.round(totalChunkSize / totalChunks) : 0
      };

    } catch (error) {
      console.error('지식 베이스 통계 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 서비스 정리
   */
  dispose(): void {
    this.customGPTService.close();
  }
}