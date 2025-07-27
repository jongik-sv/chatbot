// app/api/mbti/compatibility/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MBTIService, MBTIType } from '@/services/MBTIService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') as MBTIType;
    const mentorType = searchParams.get('mentorType') as MBTIType;

    if (!userType || !mentorType) {
      return NextResponse.json(
        {
          success: false,
          error: 'userType과 mentorType 파라미터가 필요합니다.'
        },
        { status: 400 }
      );
    }

    const mbtiService = new MBTIService();
    
    // 유효한 MBTI 타입인지 확인
    const validTypes: MBTIType[] = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP', 
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    if (!validTypes.includes(userType) || !validTypes.includes(mentorType)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 MBTI 타입입니다.'
        },
        { status: 400 }
      );
    }

    const compatibility = mbtiService.analyzeMBTICompatibility(userType, mentorType);
    
    // 각 타입의 특성 정보도 함께 제공
    const userCharacteristics = mbtiService.getMBTICharacteristics(userType);
    const mentorCharacteristics = mbtiService.getMBTICharacteristics(mentorType);

    return NextResponse.json({
      success: true,
      compatibility,
      userCharacteristics,
      mentorCharacteristics
    });

  } catch (error) {
    console.error('MBTI 호환성 분석 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 호환성을 분석하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userType, mentorTypes } = body;

    if (!userType || !Array.isArray(mentorTypes)) {
      return NextResponse.json(
        {
          success: false,
          error: 'userType과 mentorTypes 배열이 필요합니다.'
        },
        { status: 400 }
      );
    }

    const mbtiService = new MBTIService();
    
    // 다중 멘토 타입과의 호환성 분석
    const compatibilities = mentorTypes.map(mentorType => 
      mbtiService.analyzeMBTICompatibility(userType, mentorType)
    );

    // 호환성 점수순으로 정렬
    compatibilities.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      userType,
      compatibilities,
      bestMatch: compatibilities[0],
      totalAnalyzed: compatibilities.length
    });

  } catch (error) {
    console.error('다중 MBTI 호환성 분석 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '다중 MBTI 호환성을 분석하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}