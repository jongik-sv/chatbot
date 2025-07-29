/**
 * 룰 기반 프롬프트 생성 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import RuleService from '../../../../lib/services/RuleService';

export const GET = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const ruleService = new RuleService();
    const rulesPrompt = ruleService.generateRulesPrompt(req.user?.userId, category);

    return NextResponse.json({
      success: true,
      data: {
        prompt: rulesPrompt,
        stats: ruleService.getRuleStats(req.user?.userId)
      }
    });

  } catch (error: any) {
    console.error('룰 프롬프트 생성 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '룰 프롬프트 생성 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}, { required: false }); // 인증 선택사항