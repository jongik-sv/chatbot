// app/api/sessions/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ChatRepository = require('../../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');
    const searchTerm = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!searchTerm || searchTerm.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '검색어를 입력해주세요.' 
        },
        { status: 400 }
      );
    }

    if (searchTerm.trim().length < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: '검색어는 2글자 이상 입력해주세요.' 
        },
        { status: 400 }
      );
    }

    // 대화 내용 검색
    const searchResults = await chatRepo.searchConversations(userId, searchTerm.trim(), {
      limit,
      offset
    });

    // 검색 결과 총 개수 (간단한 구현을 위해 현재 결과 개수 사용)
    const totalCount = searchResults.length;

    // 검색 결과를 세션별로 그룹핑하고 추가 정보 제공
    const enhancedResults = await Promise.all(
      searchResults.map(async (result) => {
        // 해당 세션의 총 메시지 수
        const messageCount = await chatRepo.getMessageCount(result.id);
        
        // 세션의 첫 번째와 마지막 메시지 시간
        const messages = await chatRepo.getMessages(result.id, { limit: 1, offset: 0 });
        const lastMessage = await chatRepo.getLastMessage(result.id);

        return {
          sessionId: result.id,
          title: result.title,
          mode: result.mode,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          messageCount,
          matchedContent: result.matched_content,
          matchedRole: result.matched_role,
          matchedAt: result.message_created_at,
          firstMessageAt: messages[0]?.createdAt,
          lastMessageAt: lastMessage?.createdAt
        };
      })
    );

    return NextResponse.json({
      success: true,
      results: enhancedResults,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      searchTerm,
      resultCount: enhancedResults.length
    });

  } catch (error) {
    console.error('검색 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}