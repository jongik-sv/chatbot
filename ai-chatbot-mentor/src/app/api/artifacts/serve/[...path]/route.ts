import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { artifactFileManager } from '@/services/ArtifactFileManager';

// GET /api/artifacts/serve/[sessionId]/[artifactId]/[filename] - 아티팩트 파일 서빙
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: urlPath } = await params;
    
    if (!urlPath || urlPath.length < 3) {
      return NextResponse.json(
        { error: '잘못된 파일 경로입니다.' },
        { status: 400 }
      );
    }

    const [sessionId, artifactId, ...filenameParts] = urlPath;
    const filename = filenameParts.join('/'); // 서브디렉토리 지원

    // 보안 검증: 경로 조작 공격 방지
    if (sessionId.includes('..') || artifactId.includes('..') || filename.includes('..')) {
      return NextResponse.json(
        { error: '허용되지 않은 경로입니다.' },
        { status: 403 }
      );
    }

    // 파일 경로 생성
    const basePath = path.join(process.cwd(), 'data', 'artifacts');
    const filePath = path.join(basePath, `session_${sessionId}`, `artifact_${artifactId}`, filename);

    try {
      // 파일 존재 여부 확인
      const fileStat = await stat(filePath);
      
      if (!fileStat.isFile()) {
        return NextResponse.json(
          { error: '파일을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 파일 읽기
      const fileContent = await readFile(filePath);
      
      // MIME 타입 결정
      const mimeType = getMimeType(filename);
      
      // 응답 헤더 설정
      const headers = new Headers({
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600', // 1시간 캐시
        'X-Content-Type-Options': 'nosniff'
      });

      // HTML 파일의 경우 보안 헤더 추가
      if (mimeType === 'text/html') {
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('Content-Security-Policy', 
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
          "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
          "img-src 'self' data: blob: https:; " +
          "font-src 'self' data: https://cdnjs.cloudflare.com;"
        );
      }

      return new NextResponse(fileContent, {
        status: 200,
        headers
      });

    } catch (fileError) {
      if ((fileError as any).code === 'ENOENT') {
        return NextResponse.json(
          { error: '파일을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      throw fileError;
    }

  } catch (error) {
    console.error('아티팩트 파일 서빙 오류:', error);
    return NextResponse.json(
      { error: '파일 서빙에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 파일 확장자에 따른 MIME 타입 결정
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.py': 'text/plain',
    '.java': 'text/plain',
    '.cpp': 'text/plain',
    '.c': 'text/plain',
    '.go': 'text/plain',
    '.rs': 'text/plain',
    '.php': 'text/plain',
    '.rb': 'text/plain',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.jsx': 'text/javascript',
    '.vue': 'text/plain',
    '.svelte': 'text/plain',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}