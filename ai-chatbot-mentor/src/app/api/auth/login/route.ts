/**
 * 사용자 로그인 API
 */

import { NextRequest, NextResponse } from 'next/server';
import AuthService from '../../../../lib/auth/AuthService';
import { getDeviceInfo, rateLimit } from '../../../../lib/middleware/auth';

// 로그인 요청 제한 (IP당 5분에 10회)
const loginRateLimit = rateLimit(10, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting 적용
    loginRateLimit(request);

    const { username, password, rememberMe } = await request.json();

    // 입력 데이터 유효성 검사
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '사용자명과 비밀번호를 입력해주세요.'
      }, { status: 400 });
    }

    // 디바이스 정보 수집
    const deviceInfo = getDeviceInfo(request);

    // 로그인 시도
    const authService = new AuthService();
    const loginResult = await authService.login(
      { username, password },
      deviceInfo
    );

    // 쿠키 설정 옵션
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 기억하기: 7일, 일반: 1일
      path: '/'
    };

    // 응답 생성
    const response = NextResponse.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: loginResult.user.id,
        username: loginResult.user.username,
        email: loginResult.user.email
      }
    });

    // JWT 토큰을 HttpOnly 쿠키로 설정
    response.cookies.set('auth-token', loginResult.token, cookieOptions);

    return response;

  } catch (error: any) {
    console.error('로그인 오류:', error);

    // 특정 오류 메시지에 따른 상태 코드 설정
    let statusCode = 500;
    if (error.message.includes('존재하지 않는')) {
      statusCode = 404;
    } else if (error.message.includes('잘못된 비밀번호')) {
      statusCode = 401;
    } else if (error.message.includes('계정이 잠겼습니다')) {
      statusCode = 423; // Locked
    } else if (error.message.includes('요청 횟수')) {
      statusCode = 429; // Too Many Requests
    }

    return NextResponse.json({
      success: false,
      error: error.message || '로그인 중 오류가 발생했습니다.'
    }, { status: statusCode });
  }
}