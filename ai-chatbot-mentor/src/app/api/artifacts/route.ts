import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/artifacts - 아티팩트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const messageId = searchParams.get('messageId');
    const type = searchParams.get('type');

    const db = await getDatabase();
    
    let query = 'SELECT * FROM artifacts WHERE 1=1';
    const params: any[] = [];

    if (sessionId) {
      query += ' AND session_id = ?';
      params.push(sessionId);
    }

    if (messageId) {
      query += ' AND message_id = ?';
      params.push(messageId);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const artifacts = await db.all(query, params);

    return NextResponse.json({
      success: true,
      data: artifacts
    });

  } catch (error) {
    console.error('아티팩트 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '아티팩트 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/artifacts - 새 아티팩트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messageId, type, title, content, language } = body;

    // 필수 필드 검증
    if (!sessionId || !type || !title || !content) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 지원되는 아티팩트 타입 검증
    const supportedTypes = ['code', 'document', 'chart', 'mermaid'];
    if (!supportedTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: '지원되지 않는 아티팩트 타입입니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const result = await db.run(
      `INSERT INTO artifacts (session_id, message_id, type, title, content, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [sessionId, messageId, type, title, content, language || null]
    );

    const artifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [result.lastID]
    );

    return NextResponse.json({
      success: true,
      data: artifact
    }, { status: 201 });

  } catch (error) {
    console.error('아티팩트 생성 오류:', error);
    return NextResponse.json(
      { success: false, error: '아티팩트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}