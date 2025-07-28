// app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ChatRepository = require('../../../../../../repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id);
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
    const session = await chatRepo.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인
    if (session.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '세션에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    let result = { session };

    // 메시지 포함 요청시
    if (includeMessages) {
      const messages = await chatRepo.getMessages(sessionId);
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
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id);
    const { title, userId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 ID입니다.' },
        { status: 400 }
      );
    }

    // 세션 소유권 확인
    const session = await chatRepo.getSession(sessionId);
    if (!session || session.userId !== (userId || 1)) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 세션 제목 업데이트
    const updatedSession = await chatRepo.updateSession(sessionId, {
      title: title || session.title
    });

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
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 ID입니다.' },
        { status: 400 }
      );
    }

    // 세션 소유권 확인
    const session = await chatRepo.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 세션 삭제
    await chatRepo.deleteSession(sessionId);

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