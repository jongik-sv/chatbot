// app/api/mbti/types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MBTIService } from '@/services/MBTIService';

export async function GET(request: NextRequest) {
  try {
    const mbtiService = new MBTIService();
    const allTypes = mbtiService.getAllMBTITypes();

    const formattedTypes = allTypes.map(type => ({
      type: type.type,
      name: type.name,
      nickname: type.nickname,
      description: type.description,
      strengths: type.strengths,
      weaknesses: type.weaknesses,
      communicationStyle: type.communicationStyle,
      mentorStyle: type.mentorStyle,
      preferredTopics: type.preferredTopics,
      avoidTopics: type.avoidTopics
    }));

    return NextResponse.json({
      success: true,
      types: formattedTypes,
      total: formattedTypes.length
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