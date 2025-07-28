import { NextRequest, NextResponse } from 'next/server';
import { PythonExecutor } from '@/services/PythonExecutor';

// POST /api/python/execute - Python 코드 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      code, 
      timeout = 30000,
      allowNetworkAccess = false,
      sessionId,
      artifactId 
    } = body;

    // 필수 필드 검증
    if (!code && !(sessionId && artifactId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Python 코드 또는 아티팩트 정보가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    let result;

    if (sessionId && artifactId) {
      // 아티팩트 실행
      result = await PythonExecutor.executeArtifact(sessionId, artifactId, {
        timeout,
        allowNetworkAccess
      });
    } else {
      // 인라인 코드 실행
      result = await PythonExecutor.execute(code, {
        timeout,
        allowNetworkAccess
      });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Python 실행 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Python 코드 실행에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET /api/python/execute - Python 환경 상태 확인
export async function GET() {
  try {
    // 간단한 Python 코드로 환경 테스트
    const testResult = await PythonExecutor.execute('print("Python environment test successful")', {
      timeout: 5000
    });

    return NextResponse.json({
      success: true,
      available: testResult.success,
      message: testResult.success 
        ? 'Python 실행 환경이 정상적으로 작동합니다.' 
        : 'Python 실행 환경에 문제가 있습니다.',
      testOutput: testResult.output,
      testError: testResult.error
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      available: false,
      message: 'Python 실행 환경을 확인할 수 없습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}