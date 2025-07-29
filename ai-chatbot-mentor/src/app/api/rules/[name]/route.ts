/**
 * 특정 룰 관리 API - 조회, 수정, 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/middleware/auth';
import RuleService from '../../../../lib/services/RuleService';

// 특정 룰 조회
export const GET = withAuth(async (
  req: NextRequest & { user: any },
  { params }: { params: { name: string } }
) => {
  try {
    const ruleName = params.name;
    const ruleService = new RuleService();
    
    const rule = ruleService.getRule(ruleName, req.user?.userId);
    
    if (!rule) {
      return NextResponse.json({
        success: false,
        error: '존재하지 않는 룰입니다.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: rule
    });

  } catch (error: any) {
    console.error('룰 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '룰 조회 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}, { required: false });

// 룰 수정
export const PUT = withAuth(async (
  req: NextRequest & { user: any },
  { params }: { params: { name: string } }
) => {
  try {
    const ruleName = params.name;
    const updateData = await req.json();

    const ruleService = new RuleService();
    const updatedRule = ruleService.updateRule(ruleName, updateData, req.user?.userId);

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: '룰이 성공적으로 수정되었습니다.'
    });

  } catch (error: any) {
    console.error('룰 수정 오류:', error);
    
    const statusCode = error.message.includes('존재하지 않는') ? 404 : 500;

    return NextResponse.json({
      success: false,
      error: error.message || '룰 수정 중 오류가 발생했습니다.'
    }, { status: statusCode });
  }
});

// 룰 삭제
export const DELETE = withAuth(async (
  req: NextRequest & { user: any },
  { params }: { params: { name: string } }
) => {
  try {
    const ruleName = params.name;
    const ruleService = new RuleService();
    
    const deleted = ruleService.deleteRule(ruleName, req.user?.userId);
    
    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: '존재하지 않는 룰입니다.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '룰이 성공적으로 삭제되었습니다.'
    });

  } catch (error: any) {
    console.error('룰 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '룰 삭제 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
});