// app/api/documents/[id]/route.ts
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
    const document = storageService.getDocumentById(documentId);

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 메타데이터 파싱
    const metadata = JSON.parse(document.metadata);

    const responseData = {
      id: document.id,
      filename: document.filename,
      fileType: document.fileType,
      content: document.content,
      metadata: {
        ...metadata,
        wordCount: document.wordCount,
        language: document.language,
        summary: document.summary,
        fileSize: document.fileSize
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('문서 조회 오류:', error);
    return NextResponse.json(
      { error: '문서를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const success = storageService.deleteDocument(documentId);

    if (!success) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없거나 삭제에 실패했습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '문서가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('문서 삭제 오류:', error);
    return NextResponse.json(
      { error: '문서를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}