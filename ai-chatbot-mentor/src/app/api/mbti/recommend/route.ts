// app/api/mbti/recommend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MBTIService, MBTIType } from '@/services/MBTIService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') as MBTIType;
    const count = parseInt(searchParams.get('count') || '3');

    if (!userType) {
      return NextResponse.json(
        {
          success: false,
          error: 'userType 파라미터가 필요합니다.'
        },
        { status: 400 }
      );
    }

    const validTypes: MBTIType[] = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP', 
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    if (!validTypes.includes(userType)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 MBTI 타입입니다.'
        },
        { status: 400 }
      );
    }

    const mbtiService = new MBTIService();
    const recommendedTypes = mbtiService.getRecommendedMentorTypes(userType, Math.min(count, 10));

    // 추천된 멘토 타입들의 상세 정보와 호환성 분석
    const recommendations = recommendedTypes.map(mentorType => {
      const characteristics = mbtiService.getMBTICharacteristics(mentorType);
      const compatibility = mbtiService.analyzeMBTICompatibility(userType, mentorType);
      
      return {
        mentorType,
        characteristics,
        compatibility,
        systemPrompt: mbtiService.generateMBTISystemPrompt(mentorType, userType)
      };
    });

    return NextResponse.json({
      success: true,
      userType,
      recommendations,
      totalRecommendations: recommendations.length
    });

  } catch (error) {
    console.error('MBTI 멘토 추천 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 멘토를 추천하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}