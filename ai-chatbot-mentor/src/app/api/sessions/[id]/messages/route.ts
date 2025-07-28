// app/api/sessions/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ChatRepository = require('../../../../../lib/repositories/ChatRepository');

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const before = searchParams.get('before'); // 특정 메시지 ID 이전 메시지들
    const search = searchParams.get('search'); // 메시지 내용 검색

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 ID입니다.' },
        { status: 400 }
      );
    }

    // 세션 존재 및 권한 확인
    const session = chatRepo.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 메시지 조회
    const messages = chatRepo.getMessages(sessionId, {
      limit,
      offset,
      before,
      search
    });

    // 총 메시지 수
    const totalCount = chatRepo.getMessageCount(sessionId, { search });

    return NextResponse.json({
      success: true,
      messages,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('메시지 목록 조회 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '메시지를 조회할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}