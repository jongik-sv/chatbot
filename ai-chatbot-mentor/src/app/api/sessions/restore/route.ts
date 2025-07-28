// app/api/sessions/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const ChatRepository = require('../../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function POST(request: NextRequest) {
  try {
    const { userId, backupFileName, restoreMode = 'merge' } = await request.json();
    // restoreMode: 'merge' (기존 데이터와 병합) 또는 'replace' (기존 데이터 삭제 후 복원)

    if (!userId || !backupFileName) {
      return NextResponse.json(
        { success: false, error: 'userId와 backupFileName이 필요합니다.' },
        { status: 400 }
      );
    }

    // 백업 파일 경로
    const rootDir = process.cwd().endsWith('ai-chatbot-mentor') 
      ? path.join(process.cwd(), '..')
      : process.cwd();
    const backupFilePath = path.join(rootDir, 'data', 'backups', backupFileName);

    if (!fs.existsSync(backupFilePath)) {
      return NextResponse.json(
        { success: false, error: '백업 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 백업 파일 읽기
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backupData = JSON.parse(backupContent);

    // 백업 데이터 검증
    if (backupData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '백업 파일의 사용자 ID가 일치하지 않습니다.' },
        { status: 403 }
      );
    }

    let restoredSessions = 0;
    let restoredMessages = 0;
    let skippedSessions = 0;

    // replace 모드인 경우 기존 데이터 삭제
    if (restoreMode === 'replace') {
      const existingSessions = chatRepo.getSessions({ userId, limit: 10000 });
      for (const session of existingSessions) {
        chatRepo.deleteSession(session.id);
      }
    }

    // 백업 데이터 복원
    for (const sessionData of backupData.sessions) {
      try {
        // merge 모드에서 중복 세션 확인 (제목과 생성일 기준)
        if (restoreMode === 'merge') {
          const existingSessions = chatRepo.getSessions({ 
            userId, 
            limit: 1000 
          });
          
          const isDuplicate = existingSessions.some(existing => 
            existing.title === sessionData.session.title &&
            existing.created_at === sessionData.session.createdAt
          );

          if (isDuplicate) {
            skippedSessions++;
            continue;
          }
        }

        // 세션 생성
        const newSession = chatRepo.createSession({
          userId: userId,
          title: sessionData.session.title,
          mode: sessionData.session.mode,
          modelUsed: sessionData.session.modelUsed,
          mentorId: sessionData.session.mentorId
        });

        restoredSessions++;

        // 메시지 복원
        for (const message of sessionData.messages) {
          chatRepo.createMessage({
            sessionId: newSession.id,
            role: message.role,
            content: message.content,
            contentType: message.contentType,
            metadata: message.metadata
          });
          restoredMessages++;
        }

        // 원본 타임스탬프로 업데이트 (가능한 경우)
        try {
          const updateStmt = chatRepo.db.prepare(`
            UPDATE chat_sessions 
            SET created_at = ?, updated_at = ?
            WHERE id = ?
          `);
          updateStmt.run(
            sessionData.session.createdAt,
            sessionData.session.updatedAt,
            newSession.id
          );
        } catch (timestampError) {
          console.warn('타임스탬프 업데이트 실패:', timestampError);
        }

      } catch (sessionError) {
        console.error('세션 복원 오류:', sessionError);
        // 개별 세션 오류는 전체 복원을 중단하지 않음
      }
    }

    return NextResponse.json({
      success: true,
      restored: {
        sessions: restoredSessions,
        messages: restoredMessages,
        skipped: skippedSessions,
        mode: restoreMode
      },
      message: `복원 완료: ${restoredSessions}개 세션, ${restoredMessages}개 메시지${skippedSessions > 0 ? `, ${skippedSessions}개 세션 건너뜀` : ''}`
    });

  } catch (error) {
    console.error('백업 복원 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '백업을 복원할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 백업 파일 다운로드
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');
    const backupFileName = searchParams.get('fileName');

    if (!backupFileName) {
      return NextResponse.json(
        { success: false, error: 'fileName이 필요합니다.' },
        { status: 400 }
      );
    }

    // 백업 파일 경로
    const rootDir = process.cwd().endsWith('ai-chatbot-mentor') 
      ? path.join(process.cwd(), '..')
      : process.cwd();
    const backupFilePath = path.join(rootDir, 'data', 'backups', backupFileName);

    if (!fs.existsSync(backupFilePath)) {
      return NextResponse.json(
        { success: false, error: '백업 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 내용 읽기
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backupData = JSON.parse(backupContent);

    // 사용자 권한 확인
    if (backupData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '백업 파일에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    return new NextResponse(backupContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${backupFileName}"`
      }
    });

  } catch (error) {
    console.error('백업 파일 다운로드 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '백업 파일을 다운로드할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}