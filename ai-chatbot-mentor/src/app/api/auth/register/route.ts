/**
 * 사용자 회원가입 API
 */

import { NextRequest, NextResponse } from 'next/server';
import AuthService from '../../../../lib/auth/AuthService';
import { getDeviceInfo } from '../../../../lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, mbtiType } = await request.json();

    // 입력 데이터 유효성 검사
    if (!username || !email || !password) {
      return NextResponse.json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      }, { status: 400 });
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: '유효한 이메일 주소를 입력해주세요.'
      }, { status: 400 });
    }

    // 비밀번호 강도 검사
    const authService = new AuthService();
    const passwordValidation = authService.validatePasswordStrength(password);
    
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `비밀번호가 너무 약합니다. (현재: ${passwordValidation.message})`,
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

    // 사용자 등록
    const newUser = await authService.register({
      username,
      email,
      password,
      mbtiType
    });

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        mbtiType: newUser.mbti_type,
        createdAt: newUser.created_at
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('회원가입 오류:', error);

    // 중복 사용자 오류 처리
    if (error.message.includes('이미 존재하는')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || '회원가입 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}