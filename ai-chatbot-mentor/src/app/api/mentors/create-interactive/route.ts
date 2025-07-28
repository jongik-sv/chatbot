// app/api/mentors/create-interactive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InteractiveMentorCreationService } from '../../../../services/InteractiveMentorCreationService';
import { z } from 'zod';

// 대화형 멘토 생성 세션 시작 요청 스키마
const StartSessionSchema = z.object({
  userId: z.number().optional()
});

// 질문 응답 요청 스키마
const AnswerQuestionSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answer: z.string(),
  userId: z.number().optional()
});

// 멘토 생성 완료 요청 스키마
const CompleteMentorSchema = z.object({
  sessionId: z.string(),
  userId: z.number().optional(),
  customizations: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    additionalTraits: z.array(z.string()).optional(),
    systemPromptAdditions: z.string().optional()
  }).optional()
});

// 대화형 멘토 생성 세션 시작 (POST /api/mentors/create-interactive)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const service = new InteractiveMentorCreationService();
    
    switch (action) {
      case 'start':
        return await handleStartSession(body, service);
      case 'answer':
        return await handleAnswerQuestion(body, service);
      case 'complete':
        return await handleCompleteMentor(body, service);
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: '유효하지 않은 액션입니다' 
          },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error in interactive mentor creation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '대화형 멘토 생성 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// 세션 시작 처리
async function handleStartSession(body: any, service: InteractiveMentorCreationService) {
  const validatedData = StartSessionSchema.parse(body);
  
  const session = await service.startCreationSession(validatedData.userId);
  
  return NextResponse.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      currentQuestion: session.currentQuestion,
      progress: session.progress,
      totalQuestions: session.totalQuestions
    },
    message: '대화형 멘토 생성 세션이 시작되었습니다'
  });
}

// 질문 응답 처리
async function handleAnswerQuestion(body: any, service: InteractiveMentorCreationService) {
  const validatedData = AnswerQuestionSchema.parse(body);
  
  const result = await service.answerQuestion(
    validatedData.sessionId,
    validatedData.questionId,
    validatedData.answer
  );
  
  if (result.isComplete) {
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        isComplete: true,
        mentorProfile: result.mentorProfile,
        progress: result.progress
      },
      message: '모든 질문이 완료되었습니다. 멘토 프로필을 확인해주세요.'
    });
  } else {
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        currentQuestion: result.nextQuestion,
        progress: result.progress,
        totalQuestions: result.totalQuestions,
        isComplete: false
      },
      message: '답변이 저장되었습니다'
    });
  }
}

// 멘토 생성 완료 처리
async function handleCompleteMentor(body: any, service: InteractiveMentorCreationService) {
  const validatedData = CompleteMentorSchema.parse(body);
  
  const mentor = await service.completeMentorCreation(
    validatedData.sessionId,
    validatedData.userId,
    validatedData.customizations
  );
  
  return NextResponse.json({
    success: true,
    data: mentor,
    message: '멘토가 성공적으로 생성되었습니다'
  }, { status: 201 });
}

// 세션 상태 조회 (GET /api/mentors/create-interactive?sessionId=xxx)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: '세션 ID가 필요합니다' 
        },
        { status: 400 }
      );
    }
    
    const service = new InteractiveMentorCreationService();
    const session = await service.getSessionStatus(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: '세션을 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    console.error('Error getting session status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '세션 상태 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}