import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// GET /api/mcp/tools - MCP 도구 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const search = searchParams.get('search');

    let tools;

    if (serverId) {
      // 특정 서버의 도구 목록
      tools = mcpService.getServerTools(serverId);
    } else {
      // 모든 서버의 도구 목록
      tools = mcpService.getAllTools();
    }

    // 검색 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      tools = tools.filter(tool => 
        tool.name.toLowerCase().includes(searchLower) ||
        (tool.description && tool.description.toLowerCase().includes(searchLower))
      );
    }

    // 서버 정보 포함하여 반환
    const toolsWithServerInfo = tools.map(tool => {
      const server = mcpService.getAllServers().find(s => s.id === tool.serverId);
      return {
        ...tool,
        serverName: server?.name || 'Unknown',
        serverStatus: server?.status || 'unknown'
      };
    });

    return NextResponse.json({
      success: true,
      data: toolsWithServerInfo,
      total: toolsWithServerInfo.length,
      servers: serverId ? 1 : mcpService.getConnectedServers().length
    });

  } catch (error) {
    console.error('MCP 도구 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 도구 목록 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// POST /api/mcp/tools - MCP 도구 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      serverId, 
      toolName, 
      arguments: toolArgs = {},
      sessionId,
      userId 
    } = body;

    // 필수 필드 검증
    if (!serverId || !toolName) {
      return NextResponse.json(
        { success: false, error: 'serverId와 toolName이 필요합니다.' },
        { status: 400 }
      );
    }

    // 서버 연결 상태 확인
    const servers = mcpService.getConnectedServers();
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
      return NextResponse.json(
        { 
          success: false, 
          error: `서버 ${serverId}가 연결되지 않았습니다.`,
          suggestion: '서버 연결 상태를 확인하고 다시 시도해주세요.'
        },
        { status: 400 }
      );
    }

    // 도구 존재 여부 확인
    const tools = mcpService.getServerTools(serverId);
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      return NextResponse.json(
        { 
          success: false, 
          error: `도구 '${toolName}'을 서버 ${serverId}에서 찾을 수 없습니다.`,
          availableTools: tools.map(t => t.name)
        },
        { status: 400 }
      );
    }

    // 입력 인수 검증
    if (tool.inputSchema.required) {
      const missingArgs = tool.inputSchema.required.filter(
        required => !(required in toolArgs)
      );
      
      if (missingArgs.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `필수 인수가 누락되었습니다: ${missingArgs.join(', ')}`,
            required: tool.inputSchema.required,
            provided: Object.keys(toolArgs)
          },
          { status: 400 }
        );
      }
    }

    // 도구 실행
    const result = await mcpService.executeTool(
      serverId,
      toolName,
      toolArgs,
      { sessionId, userId }
    );

    return NextResponse.json({
      success: true,
      data: result,
      tool: {
        name: tool.name,
        description: tool.description,
        server: server.name
      }
    });

  } catch (error) {
    console.error('MCP 도구 실행 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 도구 실행에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}