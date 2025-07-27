import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 최대 파일 크기 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 지원되는 파일 타입
const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

const getAllSupportedTypes = () => {
  return Object.values(SUPPORTED_TYPES).flat();
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '업로드할 파일이 없습니다.' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const uploadsDir = path.join(process.cwd(), 'uploads');

    // uploads 디렉토리 생성
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    for (const file of files) {
      // 파일 검증
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // 파일명 생성 (타임스탬프 + 원본 이름)
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = path.join(uploadsDir, fileName);

      try {
        // 파일 저장
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // 파일 정보 추가
        uploadedFiles.push({
          originalName: file.name,
          fileName,
          filePath,
          size: file.size,
          type: file.type,
          category: getFileCategory(file.type),
          uploadedAt: new Date().toISOString()
        });

      } catch (writeError) {
        console.error('파일 저장 실패:', writeError);
        return NextResponse.json(
          { error: '파일 저장에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다.`
    });

  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `파일 크기는 ${MAX_FILE_SIZE / (1024 * 1024)}MB 이하여야 합니다.`
    };
  }

  // 파일 타입 검증
  if (!getAllSupportedTypes().includes(file.type)) {
    return {
      valid: false,
      error: `지원되지 않는 파일 형식입니다. (${file.type})`
    };
  }

  return { valid: true };
}

function getFileCategory(mimeType: string): 'image' | 'audio' | 'document' | 'unknown' {
  for (const [category, types] of Object.entries(SUPPORTED_TYPES)) {
    if (types.includes(mimeType)) {
      return category as 'image' | 'audio' | 'document';
    }
  }
  return 'unknown';
}

// GET 요청 처리 (업로드된 파일 목록 조회)
export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!existsSync(uploadsDir)) {
      return NextResponse.json({
        files: [],
        count: 0
      });
    }

    // 추후 데이터베이스에서 파일 목록을 조회하도록 변경 예정
    return NextResponse.json({
      message: '파일 목록 조회 기능은 데이터베이스 연동 후 구현 예정입니다.'
    });

  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '파일 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}