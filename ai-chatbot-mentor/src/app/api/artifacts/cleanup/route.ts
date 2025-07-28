import { NextRequest, NextResponse } from 'next/server';
import { ArtifactCleanupService } from '@/services/ArtifactCleanupService';

// POST /api/artifacts/cleanup - 아티팩트 정리 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      daysOld = 7,
      maxSizeGB = 5,
      dryRun = false,
      sessionId = null
    } = body;

    let result;

    if (sessionId) {
      // 특정 세션 정리
      result = await ArtifactCleanupService.cleanupSession(sessionId, dryRun);
    } else {
      // 전체 정리
      result = await ArtifactCleanupService.cleanupOldArtifacts({
        daysOld,
        maxSizeGB,
        dryRun
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: dryRun 
        ? '정리 시뮬레이션이 완료되었습니다.'
        : '아티팩트 정리가 완료되었습니다.'
    });

  } catch (error) {
    console.error('아티팩트 정리 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '아티팩트 정리에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET /api/artifacts/cleanup - 정리 상태 조회
export async function GET() {
  try {
    const status = await ArtifactCleanupService.getCleanupStatus();

    return NextResponse.json({
      success: true,
      data: status,
      recommendations: generateRecommendations(status)
    });

  } catch (error) {
    console.error('정리 상태 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '정리 상태 조회에 실패했습니다.' 
      },
      { status: 500 }
    );
  }
}

/**
 * 정리 권장사항 생성
 */
function generateRecommendations(status: any): string[] {
  const recommendations: string[] = [];
  const GB = 1024 * 1024 * 1024;

  // 크기 기준 권장사항
  if (status.totalSizeBytes > 3 * GB) {
    recommendations.push('아티팩트 저장소 크기가 3GB를 초과했습니다. 정리를 권장합니다.');
  }

  // 아티팩트 개수 기준 권장사항
  if (status.totalArtifacts > 1000) {
    recommendations.push('아티팩트 개수가 1000개를 초과했습니다. 오래된 아티팩트 정리를 권장합니다.');
  }

  // 날짜 기준 권장사항
  if (status.oldestArtifactDate) {
    const oldestDate = new Date(status.oldestArtifactDate);
    const daysDiff = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 30) {
      recommendations.push(`30일 이상 된 아티팩트가 있습니다. (가장 오래된 것: ${daysDiff}일 전)`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('현재 아티팩트 저장소 상태가 양호합니다.');
  }

  return recommendations;
}