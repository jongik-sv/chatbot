// app/api/mentors/improvements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MentorImprovementService } from '@/services/MentorImprovementService';

const improvementService = new MentorImprovementService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');

    if (mentorId) {
      // 특정 멘토의 개선 히스토리 조회
      const history = await improvementService.getImprovementHistory(mentorId);
      return NextResponse.json({ history });
    } else {
      // 전체 멘토 성능 대시보드 조회
      const dashboard = await improvementService.getMentorPerformanceDashboard();
      return NextResponse.json(dashboard);
    }
  } catch (error) {
    console.error('Error getting improvement data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}