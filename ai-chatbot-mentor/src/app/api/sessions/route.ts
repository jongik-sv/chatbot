// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 로컬 서비스 사용
const ChatRepository = require('../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mode = searchParams.get('mode'); // 'chat', 'mentor', 'mbti', 'document'
    const search = searchParams.get('search'); // 검색어

    // 채팅 세션 목록 조회
    const sessions = await chatRepo.getSessions({
      userId,
      limit,
      offset,
      mode,
      search
    });

    // 각 세션의 최근 메시지와 메타데이터 추가
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const lastMessage = await chatRepo.getLastMessage(session.id);
        const messageCount = await chatRepo.getMessageCount(session.id);
        
        return {
          ...session,
          lastMessage: lastMessage ? {
            content: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
            createdAt: lastMessage.createdAt,
            role: lastMessage.role
          } : null,
          messageCount,
          updatedAt: lastMessage?.createdAt || session.createdAt
        };
      })
    );

    // 총 세션 수 조회
    const totalCount = await chatRepo.getSessionsCount({
      userId,
      mode,
      search
    });

    return NextResponse.json({
      success: true,
      sessions: sessionsWithDetails,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('세션 목록 조회 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '세션 목록을 조회할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, mode, modelUsed, mentorId, userId } = await request.json();

    // 새 채팅 세션 생성
    const session = await chatRepo.createSession({
      userId: userId || 1,
      title: title || `새 대화 ${new Date().toLocaleString()}`,
      mode: mode || 'chat',
      modelUsed: modelUsed || 'gemini-2.5-flash',
      mentorId: mentorId || null
    });

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('세션 생성 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '새 세션을 생성할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = parseInt(searchParams.get('sessionId') || '0');
    const userId = parseInt(searchParams.get('userId') || '1');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId가 필요합니다.' },
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

    // 세션 및 관련 메시지 삭제
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