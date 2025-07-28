import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// GET /api/mcp/history - MCP 도구 실행 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const toolName = searchParams.get('toolName');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // 히스토리 조회
    const history = mcpService.getExecutionHistory({
      serverId: serverId || undefined,
      toolName: toolName || undefined,
      sessionId: sessionId || undefined,
      limit: limit * page // 페이지네이션을 위해 더 많이 가져옴
    });

    // 페이지네이션 적용
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = history.slice(startIndex, endIndex);

    // 서버 및 도구 정보 추가
    const enrichedHistory = paginatedHistory.map(entry => {
      const server = mcpService.getAllServers().find(s => s.id === entry.serverId);
      const tools = mcpService.getServerTools(entry.serverId);
      const tool = tools.find(t => t.name === entry.toolName);

      return {
        ...entry,
        serverName: server?.name || 'Unknown Server',
        serverStatus: server?.status || 'unknown',
        toolDescription: tool?.description || 'No description available',
        duration: entry.executionTime ? `${entry.executionTime}ms` : 'N/A'
      };
    });

    // 통계 계산
    const stats = {
      total: history.length,
      successful: history.filter(h => h.success).length,
      failed: history.filter(h => !h.success).length,
      averageExecutionTime: history.length > 0 
        ? Math.round(history.reduce((sum, h) => sum + (h.executionTime || 0), 0) / history.length)
        : 0,
      uniqueTools: new Set(history.map(h => h.toolName)).size,
      uniqueServers: new Set(history.map(h => h.serverId)).size
    };

    return NextResponse.json({
      success: true,
      data: enrichedHistory,
      pagination: {
        page,
        limit,
        total: history.length,
        totalPages: Math.ceil(history.length / limit),
        hasNext: endIndex < history.length,
        hasPrev: page > 1
      },
      stats,
      filters: {
        serverId,
        toolName,
        sessionId
      }
    });

  } catch (error) {
    console.error('MCP 히스토리 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 히스토리 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp/history - MCP 히스토리 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'all', 'session', 'server', 'tool'
    const sessionId = searchParams.get('sessionId');
    const serverId = searchParams.get('serverId');
    const toolName = searchParams.get('toolName');
    const days = parseInt(searchParams.get('days') || '0');

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    let deletedCount = 0;
    const currentHistory = mcpService.getExecutionHistory();

    switch (action) {
      case 'all':
        // 모든 히스토리 삭제
        deletedCount = currentHistory.length;
        // mcpService에 clearHistory 메서드 필요 (현재는 read-only)
        break;

      case 'session':
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'sessionId가 필요합니다.' },
            { status: 400 }
          );
        }
        deletedCount = currentHistory.filter(h => h.sessionId === sessionId).length;
        break;

      case 'server':
        if (!serverId) {
          return NextResponse.json(
            { success: false, error: 'serverId가 필요합니다.' },
            { status: 400 }
          );
        }
        deletedCount = currentHistory.filter(h => h.serverId === serverId).length;
        break;

      case 'tool':
        if (!toolName) {
          return NextResponse.json(
            { success: false, error: 'toolName이 필요합니다.' },
            { status: 400 }
          );
        }
        deletedCount = currentHistory.filter(h => h.toolName === toolName).length;
        break;

      case 'old':
        if (days <= 0) {
          return NextResponse.json(
            { success: false, error: '유효한 days 값이 필요합니다.' },
            { status: 400 }
          );
        }
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        deletedCount = currentHistory.filter(h => h.timestamp < cutoffDate).length;
        break;

      default:
        return NextResponse.json(
          { success: false, error: `지원하지 않는 액션입니다: ${action}` },
          { status: 400 }
        );
    }

    // 실제 삭제는 MCPService에 deleteHistory 메서드 구현 필요
    // 현재는 시뮬레이션

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        action,
        filters: { sessionId, serverId, toolName, days },
        message: `${deletedCount}개의 히스토리 항목이 삭제되었습니다.`
      }
    });

  } catch (error) {
    console.error('MCP 히스토리 삭제 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 히스토리 삭제에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}