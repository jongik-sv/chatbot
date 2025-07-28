// app/api/sessions/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const ChatRepository = require('../../../../lib/repositories/ChatRepository');

const chatRepo = new ChatRepository();

export async function POST(request: NextRequest) {
  try {
    const { userId, backupName } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 백업 디렉토리 생성
    const rootDir = process.cwd().endsWith('ai-chatbot-mentor') 
      ? path.join(process.cwd(), '..')
      : process.cwd();
    const backupDir = path.join(rootDir, 'data', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 사용자의 모든 세션과 메시지 조회
    const sessions = chatRepo.getSessions({ userId, limit: 10000 });
    const backupData = {
      userId,
      backupName: backupName || `backup_${new Date().toISOString().split('T')[0]}`,
      createdAt: new Date().toISOString(),
      version: '1.0',
      sessions: []
    };

    // 각 세션의 메시지들 포함
    for (const session of sessions) {
      const messages = chatRepo.getMessages(session.id);
      
      backupData.sessions.push({
        session: {
          id: session.id,
          title: session.title,
          mode: session.mode,
          modelUsed: session.model_used,
          mentorId: session.mentor_id,
          mentorName: session.mentor_name,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        },
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          contentType: msg.content_type,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          createdAt: msg.created_at
        }))
      });
    }

    // 백업 파일 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_user${userId}_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));

    // 백업 메타데이터 저장 (백업 목록 관리용)
    const metadataPath = path.join(backupDir, 'backup_metadata.json');
    let metadata = [];
    
    if (fs.existsSync(metadataPath)) {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);
    }

    metadata.push({
      id: `backup_${Date.now()}`,
      userId,
      fileName: backupFileName,
      backupName: backupData.backupName,
      createdAt: backupData.createdAt,
      sessionCount: sessions.length,
      fileSize: fs.statSync(backupFilePath).size
    });

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      backup: {
        fileName: backupFileName,
        backupName: backupData.backupName,
        sessionCount: sessions.length,
        createdAt: backupData.createdAt,
        fileSize: fs.statSync(backupFilePath).size
      },
      message: '백업이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('백업 생성 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '백업을 생성할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '1');

    // 백업 목록 조회
    const rootDir = process.cwd().endsWith('ai-chatbot-mentor') 
      ? path.join(process.cwd(), '..')
      : process.cwd();
    const metadataPath = path.join(rootDir, 'data', 'backups', 'backup_metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json({
        success: true,
        backups: []
      });
    }

    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
    const allBackups = JSON.parse(metadataContent);
    
    // 해당 사용자의 백업만 필터링
    const userBackups = allBackups.filter(backup => backup.userId === userId);

    return NextResponse.json({
      success: true,
      backups: userBackups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });

  } catch (error) {
    console.error('백업 목록 조회 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '백업 목록을 조회할 수 없습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}