import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// GET /api/mcp/servers - MCP 서버 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'connected', 'disconnected', 'error'
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeTools = searchParams.get('includeTools') === 'true';
    const detailed = searchParams.get('detailed') === 'true';

    let servers = mcpService.getAllServers();

    // 상태별 필터링
    if (status) {
      servers = servers.filter(server => server.status === status);
    }

    // 서버 데이터 구성
    let serverData = servers.map(server => {
      const tools = mcpService.getServerTools(server.id);
      const connection = mcpService.getConnectedServers().find(s => s.id === server.id);
      
      const baseData = {
        id: server.id,
        name: server.name,
        version: server.version,
        description: server.description,
        status: server.status,
        lastConnected: server.lastConnected,
        error: server.error,
        toolCount: tools.length,
        connectionStatus: connection ? 'connected' : 'disconnected',
        capabilities: server.capabilities || {
          tools: tools.length > 0,
          prompts: false,
          resources: false,
          logging: true
        }
      };

      // 도구 목록 포함
      if (includeTools) {
        (baseData as any).tools = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          required: tool.inputSchema.required || [],
          properties: Object.keys(tool.inputSchema.properties || {})
        }));
      }

      return baseData;
    });

    // 통계 정보 포함
    if (includeStats) {
      const allStats = mcpService.getServerStats() as any[];
      serverData = serverData.map(server => {
        const stats = allStats.find(s => s.serverId === server.id);
        return {
          ...server,
          stats: stats ? {
            totalCalls: stats.totalCalls,
            successfulCalls: stats.successfulCalls,
            failedCalls: stats.failedCalls,
            successRate: stats.totalCalls > 0 
              ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) 
              : 0,
            averageExecutionTime: Math.round(stats.averageExecutionTime),
            uptime: Math.round(stats.uptime),
            lastActivity: stats.lastActivity
          } : {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            successRate: 0,
            averageExecutionTime: 0,
            uptime: 0,
            lastActivity: null
          }
        };
      });
    }

    // 상세 정보 포함
    if (detailed) {
      const connections = mcpService.getConnectedServers();
      serverData = serverData.map(server => ({
        ...server,
        connection: connections.find(c => c.id === server.id) ? {
          latency: 0, // 실제 환경에서는 ping 측정
          lastPing: new Date(),
          reconnectCount: 0,
          uptime: Date.now() - (server.lastConnected?.getTime() || Date.now())
        } : null
      }));
    }

    // 전체 시스템 상태 요약
    const summary = {
      total: servers.length,
      connected: servers.filter(s => s.status === 'connected').length,
      disconnected: servers.filter(s => s.status === 'disconnected').length,
      error: servers.filter(s => s.status === 'error').length,
      totalTools: serverData.reduce((sum, s) => sum + s.toolCount, 0),
      healthScore: servers.length > 0 
        ? Math.round((servers.filter(s => s.status === 'connected').length / servers.length) * 100)
        : 0
    };

    return NextResponse.json({
      success: true,
      data: serverData,
      summary,
      timestamp: new Date().toISOString(),
      filters: {
        status,
        includeStats,
        includeTools,
        detailed
      }
    });

  } catch (error) {
    console.error('MCP 서버 상태 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 서버 상태 조회에 실패했습니다.',
        code: 'SERVER_STATUS_ERROR',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString()
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