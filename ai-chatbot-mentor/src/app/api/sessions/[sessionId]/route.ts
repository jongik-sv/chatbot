import { NextRequest, NextResponse } from 'next/server';

// JavaScript Repository 사용
const ChatRepository = require('../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId);
    
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { success: false, error: '잘못된 세션 ID입니다.' },
        { status: 400 }
      );
    }

    const session = chatRepo.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const messages = chatRepo.getMessages(sessionId);
    
    return NextResponse.json({
      success: true,
      session,
      messages: messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    });

  } catch (error) {
    console.error('세션 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '세션 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId);
    
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { success: false, error: '잘못된 세션 ID입니다.' },
        { status: 400 }
      );
    }

    const updates = await request.json();
    
    // 세션 업데이트 데이터 구성
    const updateData: any = {};
    
    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    
    if (updates.modelUsed !== undefined) {
      updateData.modelUsed = updates.modelUsed;
    }
    
    if (updates.ragMetadata !== undefined) {
      updateData.ragMetadata = updates.ragMetadata;
    }

    const updatedSession = chatRepo.updateSession(sessionId, updateData);
    
    return NextResponse.json({
      success: true,
      session: updatedSession
    });

  } catch (error) {
    console.error('세션 업데이트 오류:', error);
    return NextResponse.json(
      { success: false, error: '세션 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId);
    
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { success: false, error: '잘못된 세션 ID입니다.' },
        { status: 400 }
      );
    }

    const result = chatRepo.deleteSession(sessionId);
    
    return NextResponse.json({
      success: true,
      deleted: result.changes > 0
    });

  } catch (error) {
    console.error('세션 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '세션 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}