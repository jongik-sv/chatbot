// app/api/gpts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CustomGPTService } from '../../../../services/CustomGPTService';
import { z } from 'zod';

// 커스텀 GPT 업데이트 요청 스키마
const UpdateCustomGPTSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  model: z.string().optional(),
  knowledgeBaseIds: z.array(z.string()).optional(),
  isPublic: z.boolean().optional()
});

// 특정 커스텀 GPT 조회 (GET /api/gpts/[id])
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const customGPTService = new CustomGPTService();
    const gpt = customGPTService.getCustomGPT(id);
    
    if (!gpt) {
      return NextResponse.json(
        { 
          success: false, 
          error: '커스텀 GPT를 찾을 수 없습니다' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: gpt
    });
    
  } catch (error) {
    console.error('Error fetching custom GPT:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '커스텀 GPT 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// 커스텀 GPT 업데이트 (PUT /api/gpts/[id])
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // 요청 데이터 검증
    const validatedData = UpdateCustomGPTSchema.parse(body);
    
    const customGPTService = new CustomGPTService();
    
    // 커스텀 GPT 업데이트
    const success = customGPTService.updateCustomGPT(id, validatedData);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: '커스텀 GPT를 찾을 수 없거나 업데이트에 실패했습니다' 
        },
        { status: 404 }
      );
    }
    
    const updatedGPT = customGPTService.getCustomGPT(id);
    
    return NextResponse.json({
      success: true,
      data: updatedGPT,
      message: '커스텀 GPT가 성공적으로 업데이트되었습니다'
    });
    
  } catch (error) {
    console.error('Error updating custom GPT:', error);
    
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
        error: '커스텀 GPT 업데이트 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

// 커스텀 GPT 삭제 (DELETE /api/gpts/[id])
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const customGPTService = new CustomGPTService();
    const success = customGPTService.deleteCustomGPT(id);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: '커스텀 GPT를 찾을 수 없거나 삭제에 실패했습니다' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '커스텀 GPT가 성공적으로 삭제되었습니다'
    });
    
  } catch (error) {
    console.error('Error deleting custom GPT:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '커스텀 GPT 삭제 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}