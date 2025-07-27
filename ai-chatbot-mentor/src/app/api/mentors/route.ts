// app/api/mentors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MentorRepository } from '../../../lib/repositories/MentorRepository';
import { z } from 'zod';

// 멘토 생성 요청 스키마
const CreateMentorSchema = z.object({
  name: z.string().min(1, '멘토 이름은 필수입니다'),
  description: z.string().min(1, '멘토 설명은 필수입니다'),
  personality: z.object({
    traits: z.array(z.string()),
    communicationStyle: z.string(),
    teachingApproach: z.string(),
    responseStyle: z.string()
  }),
  expertise: z.array(z.string()),
  mbtiType: z.string().optional(),
  systemPrompt: z.string().min(1, '시스템 프롬프트는 필수입니다'),
  isPublic: z.boolean().optional().default(false),
  userId: z.number().optional()
});

// 멘토 목록 조회 (GET /api/mentors)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const publicOnly = searchParams.get('publicOnly') === 'true';
    const search = searchParams.get('search');
    
    const mentorRepository = new MentorRepository();
    
    let mentors;
    
    if (search) {
      // 검색
      mentors = mentorRepository.search(search, userId ? parseInt(userId) : undefined);
    } else if (publicOnly) {
      // 공개 멘토만
      mentors = mentorRepository.findPublicMentors();
    } else if (userId) {
      // 사용자별 멘토 (소유 + 공개)
      mentors = mentorRepository.findAllAccessible(parseInt(userId));
    } else {
      // 모든 공개 멘토
      mentors = mentorRepository.findPublicMentors();
    }
    
    return NextResponse.json({
      success: true,
      data: mentors
    });
    
  } catch (error) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '멘토 목록을 가져오는 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// 멘토 생성 (POST /api/mentors)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = CreateMentorSchema.parse(body);
    
    const mentorRepository = new MentorRepository();
    
    // 멘토 생성
    const mentor = mentorRepository.create(validatedData);
    
    return NextResponse.json({
      success: true,
      data: mentor,
      message: '멘토가 성공적으로 생성되었습니다'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating mentor:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '멘토 생성 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}