/**
 * 사용자 로그아웃 API
 */

import { NextRequest, NextResponse } from 'next/server';
import AuthService from '../../../../lib/auth/AuthService';

export async function POST(request: NextRequest) {
  try {
    // 쿠키에서 토큰 추출
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      // 세션 무효화
      const authService = new AuthService();
      await authService.logout(token);
    }

    // 응답 생성 및 쿠키 삭제
    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.'
    });

    // 인증 쿠키 삭제
    response.cookies.delete('auth-token');

    return response;

  } catch (error: any) {
    console.error('로그아웃 오류:', error);

    // 오류가 있어도 쿠키는 삭제
    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.'
    });

    response.cookies.delete('auth-token');
    return response;
  }
}