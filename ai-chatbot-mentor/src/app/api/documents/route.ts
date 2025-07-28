import { NextRequest, NextResponse } from 'next/server';
import { documentRepository } from '@/lib/repositories/DocumentRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mentorId = searchParams.get('mentorId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const documents = documentRepository.listDocuments({
      userId: userId ? parseInt(userId) : undefined,
      mentorId: mentorId ? parseInt(mentorId) : undefined,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('문서 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '문서 목록 조회에 실패했습니다.' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: '문서 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const deleted = documentRepository.deleteDocument(
      parseInt(documentId),
      userId ? parseInt(userId) : undefined
    );

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
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
      { 
        success: false, 
        error: error instanceof Error ? error.message : '문서 삭제에 실패했습니다.' 
      },
      { status: 500 }
    );
  }
}