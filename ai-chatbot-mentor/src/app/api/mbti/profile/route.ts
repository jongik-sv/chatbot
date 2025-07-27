// app/api/mbti/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MBTIService, MBTIType } from '@/services/MBTIService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '1'); // 기본 사용자 ID

    const mbtiService = new MBTIService();
    const profile = mbtiService.getUserMBTIProfile(userId);

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: '사용자 MBTI 프로필을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // MBTI 특성 정보 추가
    const characteristics = mbtiService.getMBTICharacteristics(profile.mbtiType);
    
    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        characteristics
      }
    });

  } catch (error) {
    console.error('MBTI 프로필 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 프로필을 조회하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 1, mbtiType, preferences } = body;

    // MBTI 타입 유효성 검사
    const validTypes: MBTIType[] = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP', 
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    if (!validTypes.includes(mbtiType)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 MBTI 타입입니다.'
        },
        { status: 400 }
      );
    }

    const mbtiService = new MBTIService();
    const profileId = mbtiService.setUserMBTIProfile(userId, mbtiType, preferences);

    // 설정된 프로필 조회
    const updatedProfile = mbtiService.getUserMBTIProfile(userId);
    const characteristics = mbtiService.getMBTICharacteristics(mbtiType);

    // 추천 멘토 타입 조회
    const recommendedMentors = mbtiService.getRecommendedMentorTypes(mbtiType, 3);

    return NextResponse.json({
      success: true,
      profileId,
      profile: {
        ...updatedProfile,
        characteristics
      },
      recommendedMentors
    }, { status: 201 });

  } catch (error) {
    console.error('MBTI 프로필 설정 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 프로필을 설정하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}