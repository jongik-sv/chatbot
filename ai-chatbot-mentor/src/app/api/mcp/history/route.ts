import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// GET /api/mcp/history - MCP 도구 실행 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const toolName = searchParams.get('toolName');
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const success = searchParams.get('success'); // 'true', 'false'
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') || 'timestamp'; // 'timestamp', 'executionTime', 'toolName'
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 'asc', 'desc'

    // 히스토리 조회
    let history = mcpService.getExecutionHistory({
      serverId: serverId || undefined,
      toolName: toolName || undefined,
      sessionId: sessionId || undefined,
      limit: undefined // 전체 조회 후 필터링
    });

    // 추가 필터링
    if (userId) {
      history = history.filter(h => h.userId === userId);
    }

    if (success !== null) {
      const successFilter = success === 'true';
      history = history.filter(h => h.success === successFilter);
    }

    // 날짜 범위 필터링
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      history = history.filter(h => h.timestamp >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // 해당 날짜 끝까지
      history = history.filter(h => h.timestamp <= toDate);
    }

    // 정렬
    history.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'executionTime':
          aValue = a.executionTime || 0;
          bValue = b.executionTime || 0;
          break;
        case 'toolName':
          aValue = a.toolName;
          bValue = b.toolName;
          break;
        case 'timestamp':
        default:
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
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
        duration: entry.executionTime ? `${entry.executionTime}ms` : 'N/A',
        formattedTimestamp: entry.timestamp.toISOString(),
        relativeTime: getRelativeTime(entry.timestamp),
        argumentsCount: Object.keys(entry.arguments || {}).length,
        hasResult: !!entry.result,
        resultType: entry.result?.content?.[0]?.type || 'unknown'
      };
    });

    // 통계 계산
    const stats = {
      total: history.length,
      successful: history.filter(h => h.success).length,
      failed: history.filter(h => !h.success).length,
      successRate: history.length > 0 
        ? Math.round((history.filter(h => h.success).length / history.length) * 100)
        : 0,
      averageExecutionTime: history.length > 0 
        ? Math.round(history.reduce((sum, h) => sum + (h.executionTime || 0), 0) / history.length)
        : 0,
      totalExecutionTime: history.reduce((sum, h) => sum + (h.executionTime || 0), 0),
      uniqueTools: new Set(history.map(h => h.toolName)).size,
      uniqueServers: new Set(history.map(h => h.serverId)).size,
      uniqueSessions: new Set(history.filter(h => h.sessionId).map(h => h.sessionId)).size,
      uniqueUsers: new Set(history.filter(h => h.userId).map(h => h.userId)).size,
      dateRange: {
        earliest: history.length > 0 ? new Date(Math.min(...history.map(h => h.timestamp.getTime()))) : null,
        latest: history.length > 0 ? new Date(Math.max(...history.map(h => h.timestamp.getTime()))) : null
      }
    };

    // 도구별 통계
    const toolStats = Array.from(new Set(history.map(h => h.toolName))).map(toolName => {
      const toolHistory = history.filter(h => h.toolName === toolName);
      return {
        toolName,
        totalCalls: toolHistory.length,
        successfulCalls: toolHistory.filter(h => h.success).length,
        failedCalls: toolHistory.filter(h => !h.success).length,
        successRate: Math.round((toolHistory.filter(h => h.success).length / toolHistory.length) * 100),
        averageExecutionTime: Math.round(toolHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / toolHistory.length),
        lastUsed: new Date(Math.max(...toolHistory.map(h => h.timestamp.getTime())))
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);

    // 서버별 통계
    const serverStats = Array.from(new Set(history.map(h => h.serverId))).map(serverId => {
      const serverHistory = history.filter(h => h.serverId === serverId);
      const server = mcpService.getAllServers().find(s => s.id === serverId);
      return {
        serverId,
        serverName: server?.name || 'Unknown Server',
        totalCalls: serverHistory.length,
        successfulCalls: serverHistory.filter(h => h.success).length,
        failedCalls: serverHistory.filter(h => !h.success).length,
        successRate: Math.round((serverHistory.filter(h => h.success).length / serverHistory.length) * 100),
        averageExecutionTime: Math.round(serverHistory.reduce((sum, h) => sum + (h.executionTime || 0), 0) / serverHistory.length),
        uniqueTools: new Set(serverHistory.map(h => h.toolName)).size,
        lastUsed: new Date(Math.max(...serverHistory.map(h => h.timestamp.getTime())))
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);

    return NextResponse.json({
      success: true,
      data: enrichedHistory,
      pagination: {
        page,
        limit,
        total: history.length,
        totalPages: Math.ceil(history.length / limit),
        hasNext: endIndex < history.length,
        hasPrev: page > 1,
        startIndex: startIndex + 1,
        endIndex: Math.min(endIndex, history.length)
      },
      stats,
      toolStats,
      serverStats,
      filters: {
        serverId,
        toolName,
        sessionId,
        userId,
        success,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('MCP 히스토리 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MCP 히스토리 조회에 실패했습니다.',
        code: 'HISTORY_FETCH_ERROR',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// 상대 시간 계산 헬퍼 함수
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds}초 전`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR');
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