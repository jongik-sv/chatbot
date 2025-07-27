// app/api/documents/[id]/chunks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DocumentStorageService } from '@/services/DocumentStorageService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { error: '문서 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const storageService = new DocumentStorageService();
    
    // 문서 존재 확인
    const document = storageService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 청크 조회
    const chunks = storageService.getDocumentChunks(documentId);

    const responseData = {
      documentId,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        metadata: {
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          wordCount: chunk.wordCount,
          sentences: chunk.sentences
        },
        createdAt: chunk.createdAt
      })),
      totalChunks: chunks.length
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('문서 청크 조회 오류:', error);
    return NextResponse.json(
      { error: '문서 청크를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}