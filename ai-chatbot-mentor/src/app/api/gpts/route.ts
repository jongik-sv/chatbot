// app/api/gpts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CustomGPTService } from '../../../services/CustomGPTService';
import { z } from 'zod';

// 커스텀 GPT 생성 요청 스키마
const CreateCustomGPTSchema = z.object({
  name: z.string().min(1, 'GPT 이름은 필수입니다'),
  description: z.string().optional(),
  systemPrompt: z.string().min(1, '시스템 프롬프트는 필수입니다'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(8192).optional().default(2048),
  model: z.string().optional().default('gemini-1.5-flash'),
  knowledgeBaseIds: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false),
  createdBy: z.number().min(1, '사용자 ID는 필수입니다')
});

// 커스텀 GPT 목록 조회 (GET /api/gpts)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includePublic = searchParams.get('includePublic') !== 'false';
    
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: '사용자 ID가 필요합니다' 
        },
        { status: 400 }
      );
    }
    
    const customGPTService = new CustomGPTService();
    const gpts = customGPTService.getUserCustomGPTs(parseInt(userId), includePublic);
    
    return NextResponse.json({
      success: true,
      data: gpts
    });
    
  } catch (error) {
    console.error('Error fetching custom GPTs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '커스텀 GPT 목록을 가져오는 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// 커스텀 GPT 생성 (POST /api/gpts)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = CreateCustomGPTSchema.parse(body);
    
    const customGPTService = new CustomGPTService();
    
    // 커스텀 GPT 생성
    const gptId = customGPTService.createCustomGPT(validatedData);
    const createdGPT = customGPTService.getCustomGPT(gptId);
    
    return NextResponse.json({
      success: true,
      data: createdGPT,
      message: '커스텀 GPT가 성공적으로 생성되었습니다'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating custom GPT:', error);
    
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
        error: '커스텀 GPT 생성 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}