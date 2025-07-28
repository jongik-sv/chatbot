import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { artifactFileManager, ArtifactFile } from '@/services/ArtifactFileManager';

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
    const { sessionId, messageId, type, title, content, language, files } = body;

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
    let filePath = null;
    let filesInfo = null;
    let isProject = false;

    // 파일 시스템에 저장
    if (files && Array.isArray(files) && files.length > 1) {
      // 다중 파일 프로젝트
      isProject = true;
      const projectFiles = files.map(f => ({
        sessionId: sessionId.toString(),
        artifactId: '', // 임시값, 생성 후 업데이트
        filename: f.filename,
        content: f.content,
        language: f.language
      }));
      
      // 임시 아티팩트 ID로 파일 저장
      const tempArtifactId = `temp_${Date.now()}`;
      for (const file of projectFiles) {
        file.artifactId = tempArtifactId;
      }
      
      const savedFiles = await artifactFileManager.saveArtifactProject({
        sessionId: sessionId.toString(),
        artifactId: tempArtifactId,
        files: projectFiles
      });
      
      filePath = artifactFileManager.getArtifactUrl(sessionId.toString(), tempArtifactId);
      filesInfo = JSON.stringify(files.map((f, idx) => ({
        filename: f.filename,
        language: f.language,
        path: savedFiles[idx]
      })));
    } else {
      // 단일 파일
      const artifactFile: ArtifactFile = {
        sessionId: sessionId.toString(),
        artifactId: `temp_${Date.now()}`,
        filename: '',
        content,
        language: language || 'text'
      };
      
      const savedPath = await artifactFileManager.saveArtifact(artifactFile);
      filePath = artifactFileManager.getArtifactUrl(sessionId.toString(), artifactFile.artifactId);
    }

    const result = await db.run(
      `INSERT INTO artifacts (session_id, message_id, type, title, content, language, file_path, files_info, is_project, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [sessionId, messageId, type, title, content, language || null, filePath, filesInfo, isProject]
    );

    // 실제 아티팩트 ID로 파일 경로 업데이트
    const actualArtifactId = result.lastID.toString();
    if (filePath) {
      const newFilePath = filePath.replace(/temp_\d+/, actualArtifactId);
      await db.run(
        'UPDATE artifacts SET file_path = ? WHERE id = ?',
        [newFilePath, actualArtifactId]
      );
      
      // 파일 시스템에서도 디렉토리명 변경
      // TODO: 디렉토리 리네임 로직 추가 필요
    }

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