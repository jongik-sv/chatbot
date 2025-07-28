import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// GET /api/mcp/servers - MCP 서버 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'connected', 'disconnected', 'error'
    const includeStats = searchParams.get('includeStats') === 'true';

    let servers = mcpService.getAllServers();

    // 상태별 필터링
    if (status) {
      servers = servers.filter(server => server.status === status);
    }

    // 통계 정보 포함
    let serverData = servers.map(server => ({
      ...server,
      tools: mcpService.getServerTools(server.id).length,
      connection: mcpService.getConnectedServers().find(s => s.id === server.id) ? 'connected' : 'disconnected'
    }));

    if (includeStats) {
      const allStats = mcpService.getServerStats() as any[];
      serverData = serverData.map(server => {
        const stats = allStats.find(s => s.serverId === server.id);
        return {
          ...server,
          stats: stats || {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageExecutionTime: 0,
            uptime: 0,
            lastActivity: null
          }
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: serverData,
      total: servers.length,
      connected: servers.filter(s => s.status === 'connected').length
    });

  } catch (error) {
    console.error('MCP 서버 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 서버 목록 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// POST /api/mcp/servers - MCP 서버 연결/해제
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serverId, config } = body;

    if (!action || !serverId) {
      return NextResponse.json(
        { success: false, error: 'action과 serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'connect':
        await mcpService.connectToServer(serverId);
        result = { message: `서버 ${serverId}에 연결되었습니다.` };
        break;

      case 'disconnect':
        await mcpService.disconnectFromServer(serverId);
        result = { message: `서버 ${serverId} 연결이 해제되었습니다.` };
        break;

      case 'register':
        if (!config) {
          return NextResponse.json(
            { success: false, error: '서버 설정이 필요합니다.' },
            { status: 400 }
          );
        }
        await mcpService.registerServer(config);
        result = { message: `서버 ${config.name}이 등록되었습니다.` };
        break;

      case 'reconnect':
        await mcpService.disconnectFromServer(serverId);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        await mcpService.connectToServer(serverId);
        result = { message: `서버 ${serverId}에 재연결되었습니다.` };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `지원하지 않는 액션입니다: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('MCP 서버 관리 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 서버 관리에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}