// app/api/rag/index/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/services/VectorSearchService';
import { DocumentStorageService } from '@/services/DocumentStorageService';

const documentService = new DocumentStorageService();

export async function POST(request: NextRequest) {
  try {
    const { documentId, chunkSize = 500 } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: '문서 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서 조회
    const document = documentService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 문서 내용 임베딩 처리 및 저장
    await vectorSearchService.processAndStoreDocument(
      documentId, 
      document.content, 
      chunkSize
    );

    // 처리 결과 통계
    const stats = await vectorSearchService.getEmbeddingStats();

    return NextResponse.json({
      success: true,
      message: `문서 ${document.filename}의 인덱싱이 완료되었습니다.`,
      documentId,
      documentTitle: document.filename,
      stats
    });

  } catch (error) {
    console.error('문서 인덱싱 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '문서 인덱싱 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (documentId) {
      // 특정 문서의 임베딩 정보 조회
      const embeddings = await vectorSearchService.getDocumentEmbeddings(parseInt(documentId));
      const document = documentService.getDocumentById(parseInt(documentId));

      return NextResponse.json({
        success: true,
        document: {
          id: document?.id,
          filename: document?.filename,
          embeddingsCount: embeddings.length,
          embeddings: embeddings.map(e => ({
            chunkIndex: e.chunkIndex,
            chunkText: e.chunkText.substring(0, 100) + '...',
            metadata: e.metadata
          }))
        }
      });
    } else {
      // 전체 임베딩 통계 조회
      const stats = await vectorSearchService.getEmbeddingStats();
      
      return NextResponse.json({
        success: true,
        stats
      });
    }

  } catch (error) {
    console.error('임베딩 정보 조회 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '임베딩 정보를 조회할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: '문서 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서의 임베딩 삭제
    await vectorSearchService.deleteDocumentEmbeddings(parseInt(documentId));

    return NextResponse.json({
      success: true,
      message: `문서 ${documentId}의 임베딩이 삭제되었습니다.`
    });

  } catch (error) {
    console.error('임베딩 삭제 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '임베딩을 삭제할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}