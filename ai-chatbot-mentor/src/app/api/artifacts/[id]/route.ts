import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/artifacts/[id] - 특정 아티팩트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 아티팩트 ID입니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const artifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [id]
    );

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: artifact
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, content, language } = body;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 아티팩트 ID입니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 아티팩트 존재 확인
    const existingArtifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [id]
    );

    if (!existingArtifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 필드들 준비
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    if (language !== undefined) {
      updates.push('language = ?');
      params.push(language);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 필드가 없습니다.' },
        { status: 400 }
      );
    }

    params.push(id);

    await db.run(
      `UPDATE artifacts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 업데이트된 아티팩트 조회
    const updatedArtifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      data: updatedArtifact
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 아티팩트 ID입니다.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 아티팩트 존재 확인
    const existingArtifact = await db.get(
      'SELECT * FROM artifacts WHERE id = ?',
      [id]
    );

    if (!existingArtifact) {
      return NextResponse.json(
        { success: false, error: '아티팩트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await db.run('DELETE FROM artifacts WHERE id = ?', [id]);

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