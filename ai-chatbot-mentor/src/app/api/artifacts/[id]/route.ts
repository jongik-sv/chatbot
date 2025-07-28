import { NextRequest, NextResponse } from 'next/server';
import { ArtifactService } from '@/services/ArtifactService';

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

    const artifact = ArtifactService.getArtifact(Number(id));

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

    const updatedArtifact = ArtifactService.updateArtifact(Number(id), updateData);

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

    const deleted = ArtifactService.deleteArtifact(Number(id));

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