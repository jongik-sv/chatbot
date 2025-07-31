import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '../../../../services/MCPService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, toolName, arguments: toolArgs } = body;

    if (!serverId || !toolName) {
      return NextResponse.json(
        {
          success: false,
          error: 'serverId와 toolName이 필요합니다.'
        },
        { status: 400 }
      );
    }

    // MCP 서버 상태 확인
    const servers = mcpService.getAllServers();
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
      return NextResponse.json(
        {
          success: false,
          error: `서버 '${serverId}'를 찾을 수 없습니다.`
        },
        { status: 404 }
      );
    }

    if (server.status !== 'connected') {
      return NextResponse.json(
        {
          success: false,
          error: `서버 '${serverId}'가 연결되지 않았습니다. 현재 상태: ${server.status}`
        },
        { status: 400 }
      );
    }

    // 도구 존재 확인
    const tools = mcpService.getServerTools(serverId);
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      return NextResponse.json(
        {
          success: false,
          error: `도구 '${toolName}'을 서버 '${serverId}'에서 찾을 수 없습니다.`
        },
        { status: 404 }
      );
    }

    // 도구 실행
    const startTime = Date.now();
    const result = await mcpService.executeTool(
      serverId,
      toolName,
      toolArgs || {},
      {
        sessionId: 'test-session',
        userId: 'test-user'
      }
    );
    const executionTime = Date.now() - startTime;

    // 결과 반환
    return NextResponse.json({
      success: result.success,
      result: result.success ? result : undefined,
      error: result.success ? undefined : result.error,
      executionTime,
      metadata: {
        serverId,
        toolName,
        arguments: toolArgs,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('MCP 도구 테스트 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}