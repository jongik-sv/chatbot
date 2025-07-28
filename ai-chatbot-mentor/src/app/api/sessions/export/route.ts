// app/api/sessions/export/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ChatRepository = require('../../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');
    const sessionId = searchParams.get('sessionId');
    const format = searchParams.get('format') || 'json'; // 'json' or 'text'
    const includeMetadata = searchParams.get('includeMetadata') === 'true';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    let exportData;
    let filename;

    if (sessionId) {
      // 특정 세션 내보내기
      const session = chatRepo.getSession(parseInt(sessionId));
      
      if (!session || session.user_id !== userId) {
        return NextResponse.json(
          { success: false, error: '세션을 찾을 수 없거나 권한이 없습니다.' },
          { status: 404 }
        );
      }

      const messages = chatRepo.getMessages(parseInt(sessionId));
      
      exportData = {
        session: {
          id: session.id,
          title: session.title,
          mode: session.mode,
          modelUsed: session.model_used,
          mentorName: session.mentor_name,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        },
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          contentType: msg.content_type,
          createdAt: msg.created_at,
          ...(includeMetadata && msg.metadata ? { metadata: JSON.parse(msg.metadata) } : {})
        })),
        exportedAt: new Date().toISOString(),
        exportType: 'single_session'
      };

      filename = `session_${sessionId}_${new Date().toISOString().split('T')[0]}`;
    } else {
      // 모든 세션 내보내기
      const sessions = chatRepo.getSessions({ userId, limit: 1000 });
      const allData = [];

      for (const session of sessions) {
        const messages = chatRepo.getMessages(session.id);
        
        allData.push({
          session: {
            id: session.id,
            title: session.title,
            mode: session.mode,
            modelUsed: session.model_used,
            mentorName: session.mentor_name,
            createdAt: session.created_at,
            updatedAt: session.updated_at
          },
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            contentType: msg.content_type,
            createdAt: msg.created_at,
            ...(includeMetadata && msg.metadata ? { metadata: JSON.parse(msg.metadata) } : {})
          }))
        });
      }

      exportData = {
        sessions: allData,
        totalSessions: sessions.length,
        exportedAt: new Date().toISOString(),
        exportType: 'all_sessions',
        userId
      };

      filename = `all_sessions_${new Date().toISOString().split('T')[0]}`;
    }

    if (format === 'text') {
      // 텍스트 형식으로 변환
      let textContent = '';
      
      if (sessionId) {
        textContent += `세션: ${exportData.session.title}\n`;
        textContent += `생성일: ${exportData.session.createdAt}\n`;
        textContent += `모드: ${exportData.session.mode}\n`;
        textContent += `모델: ${exportData.session.modelUsed}\n`;
        if (exportData.session.mentorName) {
          textContent += `멘토: ${exportData.session.mentorName}\n`;
        }
        textContent += '\n' + '='.repeat(50) + '\n\n';

        for (const message of exportData.messages) {
          textContent += `[${message.role.toUpperCase()}] ${message.createdAt}\n`;
          textContent += `${message.content}\n\n`;
        }
      } else {
        textContent += `전체 대화 히스토리 내보내기\n`;
        textContent += `내보내기 일시: ${exportData.exportedAt}\n`;
        textContent += `총 세션 수: ${exportData.totalSessions}\n\n`;
        textContent += '='.repeat(80) + '\n\n';

        for (const sessionData of exportData.sessions) {
          textContent += `세션: ${sessionData.session.title}\n`;
          textContent += `생성일: ${sessionData.session.createdAt}\n`;
          textContent += `모드: ${sessionData.session.mode}\n`;
          textContent += `모델: ${sessionData.session.modelUsed}\n`;
          if (sessionData.session.mentorName) {
            textContent += `멘토: ${sessionData.session.mentorName}\n`;
          }
          textContent += '\n' + '-'.repeat(50) + '\n\n';

          for (const message of sessionData.messages) {
            textContent += `[${message.role.toUpperCase()}] ${message.createdAt}\n`;
            textContent += `${message.content}\n\n`;
          }

          textContent += '\n' + '='.repeat(80) + '\n\n';
        }
      }

      return new NextResponse(textContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.txt"`
        }
      });
    } else {
      // JSON 형식
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`
        }
      });
    }

  } catch (error) {
    console.error('히스토리 내보내기 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '히스토리를 내보낼 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}