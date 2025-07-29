/**
 * 룰 카테고리 관리 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import RuleService from '../../../../lib/services/RuleService';

// 룰 카테고리 목록 조회
export const GET = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const ruleService = new RuleService();
    const categories = ruleService.getRuleCategories();

    return NextResponse.json({
      success: true,
      data: categories
    });

  } catch (error: any) {
    console.error('룰 카테고리 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '룰 카테고리 조회 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}, { required: false }); // 인증 선택사항