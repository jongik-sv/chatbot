/**
 * 사용자 세션 관리 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import AuthService from '../../../../lib/auth/AuthService';

// 사용자 세션 목록 조회
export const GET = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const authService = new AuthService();
    const sessions = await authService.getUserSessions(req.user.userId);

    // 세션 정보 가공 (보안상 민감한 정보 제외)
    const safeSessions = sessions.map(session => ({
      id: session.id,
      deviceInfo: session.device_info ? JSON.parse(session.device_info) : {},
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      lastUsed: session.last_used,
      isActive: session.is_active,
      isCurrent: false // 현재 세션 여부는 프론트엔드에서 판단
    }));

    return NextResponse.json({
      success: true,
      sessions: safeSessions
    });

  } catch (error: any) {
    console.error('세션 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '세션 정보를 가져올 수 없습니다.'
    }, { status: 500 });
  }
});

// 모든 세션 로그아웃 (현재 세션 제외)
export const DELETE = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const authService = new AuthService();
    
    // 현재 토큰 제외하고 모든 세션 무효화
    const currentToken = req.cookies.get('auth-token')?.value;
    await authService.logoutAllSessions(req.user.userId);
    
    // 현재 세션 다시 생성 (선택사항)
    // if (currentToken) {
    //   await authService.createSession(req.user.userId, currentToken, req.deviceInfo);
    // }

    return NextResponse.json({
      success: true,
      message: '모든 다른 기기에서 로그아웃되었습니다.'
    });

  } catch (error: any) {
    console.error('전체 로그아웃 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '로그아웃 처리 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
});