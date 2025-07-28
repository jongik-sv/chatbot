import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// GET /api/mcp/stats - MCP 서버 및 도구 사용 통계
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const period = searchParams.get('period') || '24h'; // '1h', '24h', '7d', '30d'

    // 전체 서버 목록 및 상태
    const allServers = mcpService.getAllServers();
    const connectedServers = mcpService.getConnectedServers();
    
    // 서버별 통계
    const serverStats = mcpService.getServerStats() as any[];
    
    // 실행 히스토리 분석
    const history = mcpService.getExecutionHistory();
    
    // 기간별 필터링
    const periodMs = getPeriodInMs(period);
    const cutoffTime = new Date(Date.now() - periodMs);
    const filteredHistory = history.filter(h => h.timestamp > cutoffTime);

    // 특정 서버 통계
    if (serverId) {
      const server = allServers.find(s => s.id === serverId);
      if (!server) {
        return NextResponse.json(
          { success: false, error: `서버 ${serverId}를 찾을 수 없습니다.` },
          { status: 404 }
        );
      }

      const serverHistory = filteredHistory.filter(h => h.serverId === serverId);
      const serverStat = serverStats.find(s => s.serverId === serverId);
      const tools = mcpService.getServerTools(serverId);

      // 도구별 사용 통계
      const toolUsage = tools.map(tool => {
        const toolHistory = serverHistory.filter(h => h.toolName === tool.name);
        return {
          name: tool.name,
          description: tool.description,
          totalCalls: toolHistory.length,
          successfulCalls: toolHistory.filter(h => h.success).length,
          failedCalls: toolHistory.filter(h => !h.success).length,
          averageExecutionTime: toolHistory.length > 0 
            ? Math.round(toolHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / toolHistory.length)
            : 0,
          lastUsed: toolHistory.length > 0 
            ? Math.max(...toolHistory.map(h => h.timestamp.getTime()))
            : null
        };
      });

      // 시간대별 사용 패턴 (24시간 기준)
      const hourlyUsage = Array.from({ length: 24 }, (_, hour) => {
        const hourHistory = serverHistory.filter(h => {
          const historyHour = h.timestamp.getHours();
          return historyHour === hour;
        });
        return {
          hour,
          calls: hourHistory.length,
          successRate: hourHistory.length > 0 
            ? Math.round((hourHistory.filter(h => h.success).length / hourHistory.length) * 100)
            : 0
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          server: {
            ...server,
            tools: tools.length,
            isConnected: connectedServers.some(s => s.id === serverId)
          },
          period,
          stats: {
            ...serverStat,
            periodCalls: serverHistory.length,
            periodSuccessRate: serverHistory.length > 0 
              ? Math.round((serverHistory.filter(h => h.success).length / serverHistory.length) * 100)
              : 0,
            periodAverageExecutionTime: serverHistory.length > 0 
              ? Math.round(serverHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / serverHistory.length)
              : 0
          },
          toolUsage,
          hourlyUsage
        }
      });
    }

    // 전체 통계
    const totalStats = {
      servers: {
        total: allServers.length,
        connected: connectedServers.length,
        disconnected: allServers.filter(s => s.status === 'disconnected').length,
        error: allServers.filter(s => s.status === 'error').length
      },
      tools: {
        total: mcpService.getAllTools().length,
        available: connectedServers.reduce((sum, server) => 
          sum + mcpService.getServerTools(server.id).length, 0
        )
      },
      execution: {
        totalCalls: filteredHistory.length,
        successfulCalls: filteredHistory.filter(h => h.success).length,
        failedCalls: filteredHistory.filter(h => !h.success).length,
        successRate: filteredHistory.length > 0 
          ? Math.round((filteredHistory.filter(h => h.success).length / filteredHistory.length) * 100)
          : 0,
        averageExecutionTime: filteredHistory.length > 0 
          ? Math.round(filteredHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / filteredHistory.length)
          : 0
      }
    };

    // 서버별 사용 순위
    const serverUsage = allServers.map(server => {
      const serverHistory = filteredHistory.filter(h => h.serverId === server.id);
      const serverStat = serverStats.find(s => s.serverId === server.id);
      
      return {
        id: server.id,
        name: server.name,
        status: server.status,
        toolCount: mcpService.getServerTools(server.id).length,
        calls: serverHistory.length,
        successRate: serverHistory.length > 0 
          ? Math.round((serverHistory.filter(h => h.success).length / serverHistory.length) * 100)
          : 0,
        averageExecutionTime: serverHistory.length > 0 
          ? Math.round(serverHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / serverHistory.length)
          : 0,
        lastActivity: serverStat?.lastActivity || null
      };
    }).sort((a, b) => b.calls - a.calls);

    // 인기 도구 순위
    const toolUsage = mcpService.getAllTools().map(tool => {
      const toolHistory = filteredHistory.filter(h => h.toolName === tool.name);
      const server = allServers.find(s => s.id === tool.serverId);
      
      return {
        name: tool.name,
        description: tool.description,
        serverId: tool.serverId,
        serverName: server?.name || 'Unknown',
        calls: toolHistory.length,
        successRate: toolHistory.length > 0 
          ? Math.round((toolHistory.filter(h => h.success).length / toolHistory.length) * 100)
          : 0,
        averageExecutionTime: toolHistory.length > 0 
          ? Math.round(toolHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / toolHistory.length)
          : 0,
        lastUsed: toolHistory.length > 0 
          ? Math.max(...toolHistory.map(h => h.timestamp.getTime()))
          : null
      };
    }).sort((a, b) => b.calls - a.calls).slice(0, 10);

    // 시간대별 전체 사용 패턴
    const hourlyUsage = Array.from({ length: 24 }, (_, hour) => {
      const hourHistory = filteredHistory.filter(h => {
        const historyHour = h.timestamp.getHours();
        return historyHour === hour;
      });
      return {
        hour,
        calls: hourHistory.length,
        successRate: hourHistory.length > 0 
          ? Math.round((hourHistory.filter(h => h.success).length / hourHistory.length) * 100)
          : 0
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        summary: totalStats,
        serverUsage,
        toolUsage,
        hourlyUsage,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('MCP 통계 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 통계 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * 기간 문자열을 밀리초로 변환
 */
function getPeriodInMs(period: string): number {
  const periods: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  return periods[period] || periods['24h'];
}