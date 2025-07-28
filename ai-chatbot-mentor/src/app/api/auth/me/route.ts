/**
 * 현재 사용자 정보 조회 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '../../../../lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 토큰 추출하여 인증 확인
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: '인증 토큰이 없습니다.'
      }, { status: 401 });
    }

    // Authorization 헤더 설정 (미들웨어용)
    const requestWithToken = new Request(request.url, {
      headers: {
        ...request.headers,
        authorization: `Bearer ${token}`
      }
    });

    // 사용자 인증 확인
    const user = await optionalAuth(requestWithToken);

    if (!user) {
      // 쿠키 삭제 (만료된 토큰)
      const response = NextResponse.json({
        success: false,
        authenticated: false,
        error: '유효하지 않은 토큰입니다.'
      }, { status: 401 });
      
      response.cookies.delete('auth-token');
      return response;
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error);

    // 인증 오류 시 쿠키 삭제
    const response = NextResponse.json({
      success: false,
      authenticated: false,
      error: error.message || '사용자 정보를 가져올 수 없습니다.'
    }, { status: 401 });

    response.cookies.delete('auth-token');
    return response;
  }
}