// app/api/mbti/types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mbtiService } from '@/services/MBTIService';

export async function GET(request: NextRequest) {
  try {
    const profiles = mbtiService.getAllMBTIProfiles();
    
    // 기존 컴포넌트 형식에 맞게 데이터 변환
    const types = Object.values(profiles).map(profile => ({
      type: profile.type,
      name: profile.name,
      nickname: profile.nickname,
      description: profile.description,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      communicationStyle: profile.communicationStyle,
      mentorStyle: profile.learningPreferences.join(', ') + ' 중심의 멘토링',
      preferredTopics: profile.motivations,
      avoidTopics: profile.stressors
    }));

    return NextResponse.json({
      success: true,
      types: types,
      total: types.length
    });

  } catch (error) {
    console.error('MBTI 유형 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 유형을 조회하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}