/**
 * 룰 관리 API - 룰 CRUD 및 카테고리 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../lib/middleware/auth';
import RuleService from '../../../lib/services/RuleService';

// 룰 목록 조회
export const GET = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const ruleService = new RuleService();

    let rules;
    if (search) {
      // 검색
      rules = ruleService.searchRules(search, req.user?.userId);
    } else if (category) {
      // 카테고리별 조회
      rules = ruleService.getRulesByCategory(category, req.user?.userId);
    } else if (activeOnly) {
      // 활성 룰만 조회
      rules = ruleService.getActiveRules(req.user?.userId);
    } else {
      // 전체 조회 (카테고리별로 그룹화)
      const categories = ruleService.getRuleCategories();
      const rulesByCategory = {};
      
      categories.forEach(cat => {
        rulesByCategory[cat.name] = ruleService.getRulesByCategory(cat.name, req.user?.userId);
      });

      return NextResponse.json({
        success: true,
        data: {
          categories,
          rulesByCategory,
          stats: ruleService.getRuleStats(req.user?.userId)
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: rules
    });

  } catch (error: any) {
    console.error('룰 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '룰을 조회하는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}, { required: false }); // 인증 선택사항 (게스트도 기본 룰 조회 가능)

// 새로운 룰 생성
export const POST = withAuth(async (req: NextRequest & { user: any }) => {
  try {
    const ruleData = await req.json();

    // 필수 필드 검증
    const { name, displayName, category, content } = ruleData;
    if (!name || !displayName || !category || !content) {
      return NextResponse.json({
        success: false,
        error: '룰 이름, 표시명, 카테고리, 내용은 필수입니다.'
      }, { status: 400 });
    }

    const ruleService = new RuleService();
    const newRule = ruleService.createRule(ruleData, req.user?.userId);

    return NextResponse.json({
      success: true,
      data: newRule,
      message: '룰이 성공적으로 생성되었습니다.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('룰 생성 오류:', error);
    
    const statusCode = error.message.includes('이미 존재하는') ? 409 :
                      error.message.includes('존재하지 않는 카테고리') ? 400 : 500;

    return NextResponse.json({
      success: false,
      error: error.message || '룰 생성 중 오류가 발생했습니다.'
    }, { status: statusCode });
  }
});