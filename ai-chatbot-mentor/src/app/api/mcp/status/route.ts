import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

export async function GET(request: NextRequest) {
  try {
    // 모든 서버 정보 조회
    const allServers = mcpService.getAllServers();
    const connectedServers = mcpService.getConnectedServers();
    
    // 각 서버의 도구 목록과 통계 정보 수집
    const serverDetails = allServers.map(server => {
      const tools = mcpService.getServerTools(server.id);
      const stats = mcpService.getServerStats(server.id);
      
      return {
        ...server,
        toolCount: tools.length,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description
        })),
        stats
      };
    });

    // 전체 통계 계산
    const totalStats = {
      totalServers: allServers.length,
      connectedServers: connectedServers.length,
      disconnectedServers: allServers.length - connectedServers.length,
      totalTools: mcpService.getAllTools().length,
      totalExecutions: mcpService.getExecutionHistory({ limit: 1000 }).length
    };

    return NextResponse.json({
      success: true,
      data: {
        servers: serverDetails,
        summary: totalStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('MCP status API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get MCP status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, serverId } = await request.json();

    if (!action || !serverId) {
      return NextResponse.json({
        success: false,
        error: 'Action and serverId are required'
      }, { status: 400 });
    }

    let result;
    
    switch (action) {
      case 'connect':
        await mcpService.connectToServer(serverId);
        result = { message: `Connected to server ${serverId}` };
        break;
        
      case 'disconnect':
        await mcpService.disconnectFromServer(serverId);
        result = { message: `Disconnected from server ${serverId}` };
        break;
        
      case 'reconnect':
        await mcpService.disconnectFromServer(serverId);
        await mcpService.connectToServer(serverId);
        result = { message: `Reconnected to server ${serverId}` };
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('MCP status control API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to control MCP server',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}