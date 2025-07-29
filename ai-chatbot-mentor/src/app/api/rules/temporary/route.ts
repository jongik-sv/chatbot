/**
 * 임시 룰 관리 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import RuleService from '../../../../lib/services/RuleService';

// 임시 룰 생성
export const POST = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const { ruleData, expiresInMinutes = 60 } = await req.json();

    // 필수 필드 검증
    const { name, displayName, category, content } = ruleData;
    if (!name || !displayName || !category || !content) {
      return NextResponse.json({
        success: false,
        error: '룰 이름, 표시명, 카테고리, 내용은 필수입니다.'
      }, { status: 400 });
    }

    // 만료 시간 검증 (최대 24시간)
    if (expiresInMinutes < 1 || expiresInMinutes > 1440) {
      return NextResponse.json({
        success: false,
        error: '만료 시간은 1분에서 24시간 사이여야 합니다.'
      }, { status: 400 });
    }

    const ruleService = new RuleService();
    const temporaryRule = ruleService.createTemporaryRule(
      ruleData, 
      req.user?.userId, 
      expiresInMinutes
    );

    return NextResponse.json({
      success: true,
      data: temporaryRule,
      message: `임시 룰이 생성되었습니다. (${expiresInMinutes}분 후 만료)`
    }, { status: 201 });

  } catch (error: any) {
    console.error('임시 룰 생성 오류:', error);
    
    const statusCode = error.message.includes('이미 존재하는') ? 409 :
                      error.message.includes('존재하지 않는 카테고리') ? 400 : 500;

    return NextResponse.json({
      success: false,
      error: error.message || '임시 룰 생성 중 오류가 발생했습니다.'
    }, { status: statusCode });
  }
});

// 만료된 임시 룰 정리
export const DELETE = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const ruleService = new RuleService();
    const cleanedCount = ruleService.cleanupExpiredRules();

    return NextResponse.json({
      success: true,
      message: `만료된 임시 룰 ${cleanedCount}개가 정리되었습니다.`,
      data: { cleanedCount }
    });

  } catch (error: any) {
    console.error('임시 룰 정리 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '임시 룰 정리 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
});