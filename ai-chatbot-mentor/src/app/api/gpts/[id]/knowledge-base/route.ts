// app/api/gpts/[id]/knowledge-base/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CustomGPTService } from '../../../../../services/CustomGPTService';
import { DocumentProcessingService } from '../../../../../services/DocumentProcessingService';
import { EmbeddingService } from '../../../../../services/EmbeddingService';
import { DocumentRepository } from '../../../../../lib/repositories/DocumentRepository';
import { z } from 'zod';

// 지식 베이스 생성 요청 스키마
const CreateKnowledgeBaseSchema = z.object({
  name: z.string().min(1, '지식 베이스 이름은 필수입니다'),
  description: z.string().optional(),
  embeddingModel: z.string().optional().default('tfidf'),
  createdBy: z.number().min(1, '사용자 ID는 필수입니다')
});

// 문서 추가 요청 스키마
const AddDocumentSchema = z.object({
  documentId: z.number().min(1, '문서 ID는 필수입니다'),
  knowledgeBaseId: z.string().min(1, '지식 베이스 ID는 필수입니다')
});

// GPT의 지식 베이스 목록 조회 (GET /api/gpts/[id]/knowledge-base)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    
    const customGPTService = new CustomGPTService();
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
    
    // GPT에 연결된 지식 베이스들 조회
    const knowledgeBases = [];
    for (const kbId of gpt.knowledgeBaseIds) {
      const kb = customGPTService.getKnowledgeBase(kbId);
      if (kb) {
        // 지식 베이스의 문서들도 함께 조회
        const documentRepository = new DocumentRepository();
        const documents = [];
        
        for (const docId of kb.documentIds) {
          const doc = documentRepository.getDocumentById(parseInt(docId));
          if (doc) {
            documents.push(doc);
          }
        }
        
        knowledgeBases.push({
          ...kb,
          documents
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        gptId,
        gptName: gpt.name,
        knowledgeBases
      }
    });
    
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '지식 베이스 목록 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// GPT에 지식 베이스 생성 (POST /api/gpts/[id]/knowledge-base)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gptId } = params;
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = CreateKnowledgeBaseSchema.parse(body);
    
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
    
    // 지식 베이스 생성
    const kbId = customGPTService.createKnowledgeBase({
      name: validatedData.name,
      description: validatedData.description || '',
      documentIds: [],
      embeddingModel: validatedData.embeddingModel,
      createdBy: validatedData.createdBy
    });
    
    // GPT에 지식 베이스 연결
    const updatedKnowledgeBaseIds = [...gpt.knowledgeBaseIds, kbId];
    customGPTService.updateCustomGPT(gptId, {
      knowledgeBaseIds: updatedKnowledgeBaseIds
    });
    
    const createdKB = customGPTService.getKnowledgeBase(kbId);
    
    return NextResponse.json({
      success: true,
      data: createdKB,
      message: '지식 베이스가 성공적으로 생성되었습니다'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    
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
        error: '지식 베이스 생성 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}