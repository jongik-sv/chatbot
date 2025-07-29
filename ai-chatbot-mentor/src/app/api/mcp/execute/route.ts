import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '@/services/MCPService';

// POST /api/mcp/execute - MCP 도구 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      serverId, 
      toolName, 
      arguments: toolArgs = {},
      sessionId,
      userId,
      timeout = 30000
    } = body;

    // 필수 필드 검증
    if (!serverId || !toolName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'serverId와 toolName이 필요합니다.',
          code: 'MISSING_REQUIRED_FIELDS'
        },
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
          error: `서버 '${serverId}'가 연결되지 않았습니다.`,
          code: 'SERVER_NOT_CONNECTED',
          suggestion: '서버 연결 상태를 확인하고 다시 시도해주세요.',
          availableServers: servers.map(s => ({ id: s.id, name: s.name, status: s.status }))
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
          error: `도구 '${toolName}'을 서버 '${serverId}'에서 찾을 수 없습니다.`,
          code: 'TOOL_NOT_FOUND',
          availableTools: tools.map(t => ({ 
            name: t.name, 
            description: t.description,
            required: t.inputSchema.required || []
          }))
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
            code: 'MISSING_REQUIRED_ARGUMENTS',
            required: tool.inputSchema.required,
            provided: Object.keys(toolArgs),
            schema: tool.inputSchema
          },
          { status: 400 }
        );
      }
    }

    // 타임아웃 설정
    const executePromise = mcpService.executeTool(
      serverId,
      toolName,
      toolArgs,
      { sessionId, userId }
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timeout')), timeout);
    });

    // 도구 실행 (타임아웃 포함)
    const result = await Promise.race([executePromise, timeoutPromise]);

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        result,
        execution: {
          serverId,
          serverName: server.name,
          toolName,
          toolDescription: tool.description,
          arguments: toolArgs,
          executionTime: result.executionTime,
          timestamp: result.timestamp
        },
        metadata: {
          sessionId,
          userId,
          requestId: result.id
        }
      }
    });

  } catch (error) {
    console.error('MCP 도구 실행 오류:', error);

    // 에러 타입별 처리
    let errorCode = 'EXECUTION_ERROR';
    let statusCode = 500;
    let errorMessage = 'MCP 도구 실행에 실패했습니다.';

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorCode = 'EXECUTION_TIMEOUT';
        statusCode = 408;
        errorMessage = '도구 실행이 시간 초과되었습니다.';
      } else if (error.message.includes('not connected')) {
        errorCode = 'SERVER_CONNECTION_ERROR';
        statusCode = 503;
        errorMessage = 'MCP 서버 연결에 문제가 있습니다.';
      } else if (error.message.includes('not found')) {
        errorCode = 'RESOURCE_NOT_FOUND';
        statusCode = 404;
        errorMessage = '요청한 리소스를 찾을 수 없습니다.';
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString(),
        suggestion: errorCode === 'EXECUTION_TIMEOUT' 
          ? '더 긴 타임아웃을 설정하거나 더 간단한 작업으로 나누어 시도해보세요.'
          : errorCode === 'SERVER_CONNECTION_ERROR'
          ? 'MCP 서버 연결 상태를 확인하고 다시 시도해주세요.'
          : '요청 내용을 확인하고 다시 시도해주세요.'
      },
      { status: statusCode }
    );
  }
}

// GET /api/mcp/execute - 실행 가능한 도구 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let tools;

    if (serverId) {
      // 특정 서버의 도구 목록
      const server = mcpService.getAllServers().find(s => s.id === serverId);
      if (!server) {
        return NextResponse.json(
          { 
            success: false, 
            error: `서버 '${serverId}'를 찾을 수 없습니다.`,
            code: 'SERVER_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      tools = mcpService.getServerTools(serverId);
    } else {
      // 모든 연결된 서버의 도구 목록
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

    // 카테고리 필터링 (도구 이름 기반)
    if (category) {
      const categoryFilters: Record<string, (name: string) => boolean> = {
        'web': (name) => name.includes('fetch') || name.includes('web') || name.includes('url'),
        'search': (name) => name.includes('search') || name.includes('find'),
        'ui': (name) => name.includes('component') || name.includes('ui') || name.includes('logo'),
        'docs': (name) => name.includes('docs') || name.includes('library') || name.includes('resolve'),
        'thinking': (name) => name.includes('thinking') || name.includes('reason'),
        'toolbox': (name) => name.includes('toolbox') || name.includes('server')
      };

      const filter = categoryFilters[category.toLowerCase()];
      if (filter) {
        tools = tools.filter(tool => filter(tool.name));
      }
    }

    // 서버 정보와 실행 통계 포함
    const enrichedTools = tools.map(tool => {
      const server = mcpService.getAllServers().find(s => s.id === tool.serverId);
      const stats = mcpService.getServerStats(tool.serverId) as any;
      
      return {
        ...tool,
        server: {
          id: server?.id,
          name: server?.name,
          status: server?.status,
          description: server?.description
        },
        stats: stats ? {
          totalCalls: stats.totalCalls,
          successRate: stats.totalCalls > 0 
            ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) 
            : 0,
          averageExecutionTime: Math.round(stats.averageExecutionTime),
          lastActivity: stats.lastActivity
        } : null,
        executable: server?.status === 'connected'
      };
    });

    // 카테고리별 그룹화
    const categories = {
      web: enrichedTools.filter(t => t.name.includes('fetch') || t.name.includes('web')),
      search: enrichedTools.filter(t => t.name.includes('search')),
      ui: enrichedTools.filter(t => t.name.includes('component') || t.name.includes('logo')),
      docs: enrichedTools.filter(t => t.name.includes('docs') || t.name.includes('library')),
      thinking: enrichedTools.filter(t => t.name.includes('thinking')),
      toolbox: enrichedTools.filter(t => t.name.includes('toolbox')),
      other: enrichedTools.filter(t => 
        !t.name.includes('fetch') && !t.name.includes('web') &&
        !t.name.includes('search') && !t.name.includes('component') &&
        !t.name.includes('logo') && !t.name.includes('docs') &&
        !t.name.includes('library') && !t.name.includes('thinking') &&
        !t.name.includes('toolbox')
      )
    };

    return NextResponse.json({
      success: true,
      data: {
        tools: enrichedTools,
        categories,
        summary: {
          total: enrichedTools.length,
          executable: enrichedTools.filter(t => t.executable).length,
          servers: new Set(enrichedTools.map(t => t.serverId)).size,
          categories: Object.keys(categories).filter(key => categories[key as keyof typeof categories].length > 0)
        }
      },
      filters: {
        serverId,
        category,
        search
      }
    });

  } catch (error) {
    console.error('MCP 실행 가능한 도구 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '실행 가능한 도구 목록 조회에 실패했습니다.',
        code: 'TOOLS_FETCH_ERROR',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}