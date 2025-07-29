/**
 * 룰 활성화/비활성화 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import RuleService from '../../../../lib/services/RuleService';

export const POST = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const { ruleName, isActive } = await req.json();

    if (!ruleName || typeof isActive !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: '룰 이름과 활성화 상태는 필수입니다.'
      }, { status: 400 });
    }

    const ruleService = new RuleService();
    const updatedRule = ruleService.toggleRule(ruleName, isActive, req.user?.userId);

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: `룰이 ${isActive ? '활성화' : '비활성화'}되었습니다.`
    });

  } catch (error: any) {
    console.error('룰 토글 오류:', error);
    
    const statusCode = error.message.includes('존재하지 않는') ? 404 : 500;

    return NextResponse.json({
      success: false,
      error: error.message || '룰 상태 변경 중 오류가 발생했습니다.'
    }, { status: statusCode });
  }
});