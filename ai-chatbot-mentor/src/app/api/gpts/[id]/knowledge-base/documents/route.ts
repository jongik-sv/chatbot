// app/api/gpts/[id]/knowledge-base/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CustomGPTService } from '../../../../../../services/CustomGPTService';
import { DocumentProcessingService } from '../../../../../../services/DocumentProcessingService';
import { EmbeddingService } from '../../../../../../services/EmbeddingService';
import { DocumentRepository } from '../../../../../../lib/repositories/DocumentRepository';
import { z } from 'zod';

// 문서 추가 요청 스키마
const AddDocumentSchema = z.object({
  documentId: z.number().min(1, '문서 ID는 필수입니다'),
  knowledgeBaseId: z.string().min(1, '지식 베이스 ID는 필수입니다')
});

// 문서 제거 요청 스키마
const RemoveDocumentSchema = z.object({
  documentId: z.number().min(1, '문서 ID는 필수입니다'),
  knowledgeBaseId: z.string().min(1, '지식 베이스 ID는 필수입니다')
});

// 지식 베이스에 문서 추가 (POST /api/gpts/[id]/knowledge-base/documents)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = AddDocumentSchema.parse(body);
    
    const customGPTService = new CustomGPTService();
    const documentRepository = new DocumentRepository();
    const documentProcessingService = new DocumentProcessingService();
    const embeddingService = new EmbeddingService();
    
    // GPT 존재 확인
    const gpt = customGPTService.getCustomGPT(gptId);
    if (!gpt) {
      return NextResponse.json(
        { 
          success: false, 
          error: '커스텀 GPT를 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    // 지식 베이스 존재 확인
    const knowledgeBase = customGPTService.getKnowledgeBase(validatedData.knowledgeBaseId);
    if (!knowledgeBase) {
      return NextResponse.json(
        { 
          success: false, 
          error: '지식 베이스를 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    // 문서 존재 확인
    const document = documentRepository.getDocumentById(validatedData.documentId);
    if (!document) {
      return NextResponse.json(
        { 
          success: false, 
          error: '문서를 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    // 지식 베이스에 문서 추가
    const success = customGPTService.addDocumentToKnowledgeBase(
      validatedData.knowledgeBaseId, 
      validatedData.documentId.toString()
    );
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: '문서를 지식 베이스에 추가하는데 실패했습니다' 
        },
        { status: 500 }
      );
    }
    
    // 문서 내용 처리 및 벡터화
    try {
      if (document.content) {
        // 문서를 청크로 분할
        const chunks = await documentProcessingService.chunkDocument(
          document.content,
          { maxChunkSize: 1000, overlap: 200 }
        );
        
        // 각 청크를 벡터화하여 저장
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await embeddingService.generateEmbedding(chunk);
          
          customGPTService.saveDocumentEmbedding({
            documentId: validatedData.documentId.toString(),
            knowledgeBaseId: validatedData.knowledgeBaseId,
            chunkId: `${validatedData.documentId}_${i}`,
            content: chunk,
            embedding,
            metadata: JSON.stringify({
              chunkIndex: i,
              totalChunks: chunks.length,
              documentName: document.filename
            })
          });
        }
      }
    } catch (embeddingError) {
      console.error('문서 벡터화 오류:', embeddingError);
      // 벡터화 실패해도 문서 추가는 성공으로 처리
    }
    
    return NextResponse.json({
      success: true,
      data: {
        documentId: validatedData.documentId,
        knowledgeBaseId: validatedData.knowledgeBaseId,
        document
      },
      message: '문서가 지식 베이스에 성공적으로 추가되었습니다'
    });
    
  } catch (error) {
    console.error('Error adding document to knowledge base:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '문서 추가 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// 지식 베이스에서 문서 제거 (DELETE /api/gpts/[id]/knowledge-base/documents)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = RemoveDocumentSchema.parse(body);
    
    const customGPTService = new CustomGPTService();
    
    // GPT 존재 확인
    const gpt = customGPTService.getCustomGPT(gptId);
    if (!gpt) {
      return NextResponse.json(
        { 
          success: false, 
          error: '커스텀 GPT를 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    // 지식 베이스 존재 확인
    const knowledgeBase = customGPTService.getKnowledgeBase(validatedData.knowledgeBaseId);
    if (!knowledgeBase) {
      return NextResponse.json(
        { 
          success: false, 
          error: '지식 베이스를 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    // 지식 베이스에서 문서 제거
    const success = customGPTService.removeDocumentFromKnowledgeBase(
      validatedData.knowledgeBaseId, 
      validatedData.documentId.toString()
    );
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: '문서를 지식 베이스에서 제거하는데 실패했습니다' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '문서가 지식 베이스에서 성공적으로 제거되었습니다'
    });
    
  } catch (error) {
    console.error('Error removing document from knowledge base:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '문서 제거 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}