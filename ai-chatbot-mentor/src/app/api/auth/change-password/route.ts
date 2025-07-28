/**
 * 비밀번호 변경 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import AuthService from '../../../../lib/auth/AuthService';
import { getDatabase } from '../../../../lib/database/db';

export const POST = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const { currentPassword, newPassword } = await req.json();

    // 입력 데이터 유효성 검사
    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      }, { status: 400 });
    }

    const authService = new AuthService();
    const db = getDatabase();

    // 현재 사용자 정보 조회
    const user = db.prepare(`
      SELECT id, password_hash FROM users WHERE id = ?
    `).get(req.user.userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await authService.verifyPassword(
      currentPassword, 
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json({
        success: false,
        error: '현재 비밀번호가 올바르지 않습니다.'
      }, { status: 401 });
    }

    // 새 비밀번호 강도 검사
    const passwordValidation = authService.validatePasswordStrength(newPassword);
    
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `새 비밀번호가 너무 약합니다. (현재: ${passwordValidation.message})`,
        passwordRules: {
          minLength: '최소 8글자',
          hasUpperCase: '대문자 포함',
          hasLowerCase: '소문자 포함', 
          hasNumber: '숫자 포함',
          hasSpecialChar: '특수문자 포함'
        },
        currentRules: passwordValidation.rules
      }, { status: 400 });
    }

    // 새 비밀번호가 현재 비밀번호와 같은지 확인
    const isSamePassword = await authService.verifyPassword(
      newPassword,
      user.password_hash
    );

    if (isSamePassword) {
      return NextResponse.json({
        success: false,
        error: '새 비밀번호는 현재 비밀번호와 달라야 합니다.'
      }, { status: 400 });
    }

    // 새 비밀번호 해시 생성
    const newPasswordHash = await authService.hashPassword(newPassword);

    // 데이터베이스 업데이트
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPasswordHash, user.id);

    // 보안상 다른 모든 세션 무효화 (선택사항)
    await authService.logoutAllSessions(user.id);

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 보안을 위해 다른 기기에서 자동 로그아웃됩니다.'
    });

  } catch (error: any) {
    console.error('비밀번호 변경 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '비밀번호 변경 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
});