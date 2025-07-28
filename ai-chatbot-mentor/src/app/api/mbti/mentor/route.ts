// app/api/mbti/mentor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mbtiService } from '@/services/MBTIService';
import { MBTIType } from '@/types';
import { MentorRepository } from '@/lib/repositories/MentorRepository';

const mentorRepo = new MentorRepository();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mbtiType, userType, customName, customDescription, userId } = body;

    if (!mbtiType || !mbtiService.isValidMBTIType(mbtiType)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효한 MBTI 타입이 필요합니다.'
        },
        { status: 400 }
      );
    }

    // MBTI 기반 멘토 생성
    const mbtiMentor = mbtiService.createMBTIMentor(mbtiType as MBTIType, {
      name: customName,
      description: customDescription,
      userId: userId || 1
    });

    // 데이터베이스에 멘토 저장
    const savedMentor = mentorRepo.create({
      userId: userId || 1,
      name: mbtiMentor.name,
      description: mbtiMentor.description,
      personality: JSON.stringify(mbtiMentor.personality),
      expertise: JSON.stringify(mbtiMentor.expertise),
      mbtiType: mbtiMentor.mbtiType,
      systemPrompt: mbtiMentor.systemPrompt,
      isPublic: false
    });

    // 사용자-멘토 호환성 분석 (사용자 MBTI가 제공된 경우)
    let compatibility = null;
    if (userType && mbtiService.isValidMBTIType(userType)) {
      compatibility = mbtiService.getMBTICompatibility(userType as MBTIType, mbtiType as MBTIType);
    }

    return NextResponse.json({
      success: true,
      mentor: {
        ...savedMentor,
        personality: mbtiMentor.personality,
        expertise: mbtiMentor.expertise,
        mbtiProfile: mbtiMentor.mbtiProfile
      },
      compatibility
    });

  } catch (error) {
    console.error('MBTI 멘토 생성 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 멘토를 생성하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mbtiType = searchParams.get('mbtiType');

    if (mbtiType && !mbtiService.isValidMBTIType(mbtiType)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 MBTI 타입입니다.'
        },
        { status: 400 }
      );
    }

    let mentors;
    
    if (userId) {
      // 특정 사용자의 MBTI 멘토들 조회
      mentors = mentorRepo.getByUserId(parseInt(userId))
        .filter(mentor => mentor.mbtiType)
        .map(mentor => ({
          ...mentor,
          personality: typeof mentor.personality === 'string' 
            ? JSON.parse(mentor.personality) 
            : mentor.personality,
          expertise: typeof mentor.expertise === 'string' 
            ? JSON.parse(mentor.expertise) 
            : mentor.expertise,
          mbtiProfile: mentor.mbtiType ? mbtiService.getMBTIProfile(mentor.mbtiType as MBTIType) : null
        }));
    } else if (mbtiType) {
      // 특정 MBTI 타입의 공개 멘토들 조회
      mentors = mentorRepo.getByMBTIType(mbtiType as MBTIType)
        .filter(mentor => mentor.isPublic)
        .map(mentor => ({
          ...mentor,
          personality: typeof mentor.personality === 'string' 
            ? JSON.parse(mentor.personality) 
            : mentor.personality,
          expertise: typeof mentor.expertise === 'string' 
            ? JSON.parse(mentor.expertise) 
            : mentor.expertise,
          mbtiProfile: mbtiService.getMBTIProfile(mbtiType as MBTIType)
        }));
    } else {
      // 모든 공개 MBTI 멘토들 조회
      mentors = mentorRepo.getAll()
        .filter(mentor => mentor.mbtiType && mentor.isPublic)
        .map(mentor => ({
          ...mentor,
          personality: typeof mentor.personality === 'string' 
            ? JSON.parse(mentor.personality) 
            : mentor.personality,
          expertise: typeof mentor.expertise === 'string' 
            ? JSON.parse(mentor.expertise) 
            : mentor.expertise,
          mbtiProfile: mentor.mbtiType ? mbtiService.getMBTIProfile(mentor.mbtiType as MBTIType) : null
        }));
    }

    return NextResponse.json({
      success: true,
      mentors,
      total: mentors.length
    });

  } catch (error) {
    console.error('MBTI 멘토 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'MBTI 멘토를 조회하는 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}