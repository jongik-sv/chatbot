import { NextRequest, NextResponse } from 'next/server';
import { ArtifactService } from '@/services/ArtifactService';
import { artifactFileManager } from '@/services/ArtifactFileManager';
import { getDatabase } from '@/lib/database';

// GET /api/artifacts/[id] - 특정 아티팩트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 아티팩트 ID입니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const artifact = await db.get('SELECT * FROM artifacts WHERE id = ?', [id]);

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      artifact: artifact
    });

  } catch (error) {
    console.error('아티팩트 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '아티팩트 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// PUT /api/artifacts/[id] - 아티팩트 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, language } = body;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 아티팩트 ID입니다.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (language !== undefined) updateData.language = language;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 필드가 없습니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 기존 아티팩트 정보 조회
    const existingArtifact = await db.get('SELECT * FROM artifacts WHERE id = ?', [id]);
    if (!existingArtifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 콘텐츠가 변경된 경우 파일 시스템에도 업데이트
    if (content !== undefined) {
      try {
        await artifactFileManager.saveArtifact({
          sessionId: existingArtifact.session_id.toString(),
          artifactId: id,
          filename: '',
          content,
          language: language || existingArtifact.language || 'text'
        });
      } catch (fileError) {
        console.error('파일 업데이트 오류:', fileError);
        // 파일 업데이트 실패해도 DB 업데이트는 진행
      }
    }

    // 데이터베이스 업데이트
    const setClauses = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateData), new Date().toISOString(), id];
    
    await db.run(
      `UPDATE artifacts SET ${setClauses}, updated_at = ? WHERE id = ?`,
      values
    );

    const updatedArtifact = await db.get('SELECT * FROM artifacts WHERE id = ?', [id]);

    if (!updatedArtifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      artifact: updatedArtifact
    });

  } catch (error) {
    console.error('아티팩트 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: '아티팩트 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/artifacts/[id] - 아티팩트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 아티팩트 ID입니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 아티팩트 정보 조회
    const artifact = await db.get('SELECT * FROM artifacts WHERE id = ?', [id]);
    if (!artifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 시스템에서 아티팩트 삭제
    try {
      await artifactFileManager.deleteArtifact(
        artifact.session_id.toString(),
        id
      );
    } catch (fileError) {
      console.error('파일 삭제 오류:', fileError);
      // 파일 삭제 실패해도 DB 삭제는 진행
    }

    // 데이터베이스에서 삭제
    const result = await db.run('DELETE FROM artifacts WHERE id = ?', [id]);
    const deleted = result.changes > 0;

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '아티팩트가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('아티팩트 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '아티팩트 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}