// app/api/mentors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MentorRepository } from '../../../../lib/repositories/MentorRepository';
import { z } from 'zod';

// 멘토 업데이트 요청 스키마
const UpdateMentorSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  personality: z.object({
    traits: z.array(z.string()),
    communicationStyle: z.string(),
    teachingApproach: z.string(),
    responseStyle: z.string()
  }).optional(),
  expertise: z.array(z.string()).optional(),
  mbtiType: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
  userId: z.number().optional()
});

// 멘토 조회 (GET /api/mentors/[id])
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mentorId = parseInt(params.id);
    
    if (isNaN(mentorId)) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 멘토 ID입니다' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const mentorRepository = new MentorRepository();
    
    // 접근 권한 확인
    if (userId && !mentorRepository.hasAccess(mentorId, parseInt(userId))) {
      return NextResponse.json(
        { success: false, error: '이 멘토에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }
    
    const mentor = mentorRepository.findById(mentorId);
    
    if (!mentor) {
      return NextResponse.json(
        { success: false, error: '멘토를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 공개 멘토가 아니고 소유자가 아닌 경우 접근 거부
    if (!mentor.isPublic && (!userId || mentor.userId !== parseInt(userId))) {
      return NextResponse.json(
        { success: false, error: '이 멘토에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: mentor
    });
    
  } catch (error) {
    console.error('Error fetching mentor:', error);
    return NextResponse.json(
      { success: false, error: '멘토 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 멘토 업데이트 (PUT /api/mentors/[id])
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mentorId = parseInt(params.id);
    
    if (isNaN(mentorId)) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 멘토 ID입니다' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const validatedData = UpdateMentorSchema.parse(body);
    
    const mentorRepository = new MentorRepository();
    
    // 멘토 존재 확인
    const existingMentor = mentorRepository.findById(mentorId);
    if (!existingMentor) {
      return NextResponse.json(
        { success: false, error: '멘토를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 소유권 확인
    if (validatedData.userId && !mentorRepository.isOwner(mentorId, validatedData.userId)) {
      return NextResponse.json(
        { success: false, error: '이 멘토를 수정할 권한이 없습니다' },
        { status: 403 }
      );
    }
    
    // 멘토 업데이트
    const updatedMentor = mentorRepository.update(mentorId, validatedData);
    
    if (!updatedMentor) {
      return NextResponse.json(
        { success: false, error: '멘토 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedMentor,
      message: '멘토가 성공적으로 업데이트되었습니다'
    });
    
  } catch (error) {
    console.error('Error updating mentor:', error);
    
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
      { success: false, error: '멘토 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 멘토 삭제 (DELETE /api/mentors/[id])
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mentorId = parseInt(params.id);
    
    if (isNaN(mentorId)) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 멘토 ID입니다' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }
    
    const mentorRepository = new MentorRepository();
    
    // 멘토 존재 확인
    const existingMentor = mentorRepository.findById(mentorId);
    if (!existingMentor) {
      return NextResponse.json(
        { success: false, error: '멘토를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 소유권 확인
    if (!mentorRepository.isOwner(mentorId, parseInt(userId))) {
      return NextResponse.json(
        { success: false, error: '이 멘토를 삭제할 권한이 없습니다' },
        { status: 403 }
      );
    }
    
    // 멘토 삭제
    const deleted = mentorRepository.delete(mentorId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '멘토 삭제에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '멘토가 성공적으로 삭제되었습니다'
    });
    
  } catch (error) {
    console.error('Error deleting mentor:', error);
    return NextResponse.json(
      { success: false, error: '멘토 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}