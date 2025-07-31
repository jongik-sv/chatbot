// app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ChatRepository = require('../../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');
    const includeMessages = searchParams.get('includeMessages') === 'true';

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 ID입니다.' },
        { status: 400 }
      );
    }

    // 세션 정보 조회
    const session = chatRepo.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인
    if (session.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: '세션에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // RAG/문서 기반 세션인 경우 문서 정보 추출
    let documentInfo = null;
    if (session.mode === 'document' || session.mode === 'rag') {
      if (session.metadata) {
        try {
          const metadata = JSON.parse(session.metadata);
          if (metadata.ragMetadata) {
            documentInfo = {
              projectName: metadata.ragMetadata.projectName,
              documentTitles: metadata.ragMetadata.documentTitles || []
            };
          }
        } catch (error) {
          console.warn('메타데이터 파싱 오류:', error);
        }
      }
      
      // 메타데이터가 없는 경우 메시지에서 문서 정보 추출 시도
      if (!documentInfo) {
        documentInfo = chatRepo.extractDocumentInfoFromMessages(sessionId);
      }
    }

    let result = { 
      session: {
        ...session,
        documentInfo
      }
    };

    // 메시지 포함 요청시
    if (includeMessages) {
      const messages = chatRepo.getMessages(sessionId);
      result = { ...result, messages };
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('세션 조회 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '세션을 조회할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);
    const updates = await request.json();
    const { title, userId, ragMetadata } = updates;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 ID입니다.' },
        { status: 400 }
      );
    }

    // 세션 소유권 확인
    const session = chatRepo.getSession(sessionId);
    if (!session || session.user_id !== (userId || 1)) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 세션 업데이트 데이터 구성
    const updateData: any = {};
    
    if (title !== undefined) {
      updateData.title = title;
    }
    
    if (ragMetadata !== undefined) {
      updateData.ragMetadata = ragMetadata;
    }

    const updatedSession = chatRepo.updateSession(sessionId, updateData);

    return NextResponse.json({
      success: true,
      session: updatedSession
    });

  } catch (error) {
    console.error('세션 업데이트 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '세션을 업데이트할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 ID입니다.' },
        { status: 400 }
      );
    }

    // 세션 소유권 확인
    const session = chatRepo.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 세션 삭제
    chatRepo.deleteSession(sessionId);

    return NextResponse.json({
      success: true,
      message: '세션이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('세션 삭제 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '세션을 삭제할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}