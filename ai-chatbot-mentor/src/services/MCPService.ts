import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import {
  MCPServer,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPConnection,
  MCPServerConfig,
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPExecutionHistory,
  MCPServerStats,
  MCPSettings,
  MCPEvent,
  MCPEventType,
  MCPContent
} from '@/types/mcp';

export class MCPService extends EventEmitter {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, MCPConnection> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private tools: Map<string, MCPTool[]> = new Map();
  private executionHistory: MCPExecutionHistory[] = [];
  private serverStats: Map<string, MCPServerStats> = new Map();
  private settings: MCPSettings = {
    autoConnect: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: true,
    logLevel: 'info'
  };

  private messageId = 0;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor() {
    super();
    this.initializeDefaultServers();
  }

  /**
   * 기본 MCP 서버 초기화
   */
  private initializeDefaultServers() {
    // Claude Code에서 사용 가능한 MCP 서버들을 자동으로 감지하고 연결
    this.discoverMCPServers();
  }

  /**
   * 사용 가능한 MCP 서버 자동 감지
   */
  private async discoverMCPServers() {
    try {
      // Claude Code 환경에서 사용 가능한 MCP 서버들을 확인
      const availableServers = [
        {
          id: 'mcp-toolbox',
          name: 'MCP Toolbox',
          command: 'mcp-toolbox',
          description: 'MCP server management and tool discovery'
        },
        {
          id: 'mcp-fetch',
          name: 'MCP Fetch',
          command: 'mcp-fetch',
          description: 'Web content fetching and processing'
        },
        {
          id: 'mcp-context7',
          name: 'Context7',
          command: 'mcp-context7',
          description: 'Library documentation and context provider'
        },
        {
          id: 'mcp-21st-dev-magic',
          name: '21st.dev Magic',
          command: 'mcp-21st-dev-magic',
          description: 'UI component generation and magic tools'
        },
        {
          id: 'mcp-sequential-thinking',
          name: 'Sequential Thinking',
          command: 'mcp-sequential-thinking',
          description: 'Advanced reasoning and thinking tools'
        }
      ];

      for (const config of availableServers) {
        await this.registerServer(config);
      }

      if (this.settings.autoConnect) {
        await this.connectAllServers();
      }

    } catch (error) {
      this.log('error', 'Failed to discover MCP servers:', error);
    }
  }

  /**
   * MCP 서버 등록
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    const server: MCPServer = {
      id: config.id,
      name: config.name,
      version: '1.0.0',
      description: config.name,
      status: 'disconnected'
    };

    this.servers.set(config.id, server);
    this.tools.set(config.id, []);
    this.serverStats.set(config.id, {
      serverId: config.id,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageExecutionTime: 0,
      uptime: 0,
      lastActivity: new Date()
    });

    this.log('info', `Registered MCP server: ${config.name}`);
    this.emitEvent('server_connected', config.id);
  }

  /**
   * 모든 서버에 연결
   */
  async connectAllServers(): Promise<void> {
    const serverIds = Array.from(this.servers.keys());
    
    for (const serverId of serverIds) {
      try {
        await this.connectToServer(serverId);
      } catch (error) {
        this.log('warn', `Failed to connect to server ${serverId}:`, error);
      }
    }
  }

  /**
   * 특정 서버에 연결
   */
  async connectToServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      this.connections.set(serverId, {
        serverId,
        status: 'connecting'
      });

      // 서버 상태를 연결됨으로 표시 (실제 Claude Code 환경에서는 자동 연결)
      server.status = 'connected';
      server.lastConnected = new Date();

      this.connections.set(serverId, {
        serverId,
        status: 'connected',
        lastPing: new Date(),
        latency: 0
      });

      // 서버의 도구 목록 조회
      await this.loadServerTools(serverId);

      this.log('info', `Connected to MCP server: ${server.name}`);
      this.emitEvent('server_connected', serverId);

    } catch (error) {
      server.status = 'error';
      server.error = error instanceof Error ? error.message : 'Connection failed';
      
      this.connections.set(serverId, {
        serverId,
        status: 'error',
        error: server.error
      });

      this.log('error', `Failed to connect to server ${serverId}:`, error);
      this.emitEvent('server_error', serverId, { error: server.error });
      throw error;
    }
  }

  /**
   * 서버 연결 해제
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    const process = this.processes.get(serverId);
    if (process) {
      process.kill();
      this.processes.delete(serverId);
    }

    server.status = 'disconnected';
    this.connections.set(serverId, {
      serverId,
      status: 'disconnected'
    });

    this.log('info', `Disconnected from MCP server: ${server.name}`);
    this.emitEvent('server_disconnected', serverId);
  }

  /**
   * 서버의 도구 목록 로드
   */
  private async loadServerTools(serverId: string): Promise<void> {
    try {
      // Claude Code 환경에서 사용 가능한 도구들을 하드코딩으로 정의
      // 실제 환경에서는 MCP 프로토콜을 통해 동적으로 로드해야 함
      const toolsByServer: Record<string, MCPTool[]> = {
        'mcp-toolbox': [
          {
            name: 'search_servers',
            description: 'Search for MCP servers in the registry',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                n: { type: 'number' }
              },
              required: ['query']
            },
            serverId
          },
          {
            name: 'use_tool',
            description: 'Execute a tool on an MCP server',
            inputSchema: {
              type: 'object',
              properties: {
                qualifiedName: { type: 'string' },
                parameters: { type: 'object' }
              },
              required: ['qualifiedName', 'parameters']
            },
            serverId
          }
        ],
        'mcp-fetch': [
          {
            name: 'fetch',
            description: 'Fetch content from a URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                max_length: { type: 'number' },
                raw: { type: 'boolean' }
              },
              required: ['url']
            },
            serverId
          }
        ],
        'mcp-context7': [
          {
            name: 'resolve-library-id',
            description: 'Resolve a library name to Context7 ID',
            inputSchema: {
              type: 'object',
              properties: {
                libraryName: { type: 'string' }
              },
              required: ['libraryName']
            },
            serverId
          },
          {
            name: 'get-library-docs',
            description: 'Get documentation for a library',
            inputSchema: {
              type: 'object',
              properties: {
                context7CompatibleLibraryID: { type: 'string' },
                tokens: { type: 'number' },
                topic: { type: 'string' }
              },
              required: ['context7CompatibleLibraryID']
            },
            serverId
          }
        ],
        'mcp-21st-dev-magic': [
          {
            name: '21st_magic_component_builder',
            description: 'Build UI components using 21st.dev',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                searchQuery: { type: 'string' },
                absolutePathToCurrentFile: { type: 'string' },
                absolutePathToProjectDirectory: { type: 'string' },
                standaloneRequestQuery: { type: 'string' }
              },
              required: ['message', 'searchQuery']
            },
            serverId
          },
          {
            name: 'logo_search',
            description: 'Search for company logos',
            inputSchema: {
              type: 'object',
              properties: {
                queries: { type: 'array', items: { type: 'string' } },
                format: { type: 'string', enum: ['JSX', 'TSX', 'SVG'] }
              },
              required: ['queries', 'format']
            },
            serverId
          }
        ],
        'mcp-sequential-thinking': [
          {
            name: 'sequentialthinking',
            description: 'Advanced sequential thinking and reasoning',
            inputSchema: {
              type: 'object',
              properties: {
                thought: { type: 'string' },
                nextThoughtNeeded: { type: 'boolean' },
                thoughtNumber: { type: 'number' },
                totalThoughts: { type: 'number' }
              },
              required: ['thought', 'nextThoughtNeeded', 'thoughtNumber', 'totalThoughts']
            },
            serverId
          }
        ]
      };

      const tools = toolsByServer[serverId] || [];
      this.tools.set(serverId, tools);

      this.log('info', `Loaded ${tools.length} tools for server ${serverId}`);

    } catch (error) {
      this.log('error', `Failed to load tools for server ${serverId}:`, error);
    }
  }

  /**
   * 도구 실행
   */
  async executeTool(
    serverId: string,
    toolName: string,
    args: Record<string, any>,
    context?: { sessionId?: string; userId?: string }
  ): Promise<MCPToolResult> {
    const startTime = Date.now();
    const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const toolCall: MCPToolCall = {
      id: toolCallId,
      tool: toolName,
      arguments: args,
      timestamp: new Date(),
      sessionId: context?.sessionId,
      userId: context?.userId
    };

    try {
      // 서버와 도구 유효성 검증
      const server = this.servers.get(serverId);
      if (!server || server.status !== 'connected') {
        throw new Error(`Server ${serverId} is not connected`);
      }

      const tools = this.tools.get(serverId) || [];
      const tool = tools.find(t => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found on server ${serverId}`);
      }

      // 실제 MCP 도구 실행은 Claude Code 환경에서 처리됨
      // 여기서는 모의 실행 결과를 반환
      const mockResult = await this.executeMockTool(serverId, toolName, args);

      const result: MCPToolResult = {
        id: `result_${toolCallId}`,
        toolCallId,
        success: true,
        content: mockResult.content,
        timestamp: new Date(),
        executionTime: Date.now() - startTime
      };

      // 실행 히스토리 저장
      const historyEntry: MCPExecutionHistory = {
        id: toolCallId,
        toolName,
        serverId,
        arguments: args,
        result,
        timestamp: new Date(),
        sessionId: context?.sessionId,
        userId: context?.userId,
        executionTime: result.executionTime,
        success: true
      };

      this.executionHistory.push(historyEntry);

      // 서버 통계 업데이트
      this.updateServerStats(serverId, true, result.executionTime || 0);

      this.log('info', `Executed tool ${toolName} on server ${serverId}`);
      this.emitEvent('tool_executed', serverId, { toolName, result });

      return result;

    } catch (error) {
      const result: MCPToolResult = {
        id: `result_${toolCallId}`,
        toolCallId,
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        isError: true,
        timestamp: new Date(),
        executionTime: Date.now() - startTime
      };

      // 실행 히스토리 저장 (실패)
      const historyEntry: MCPExecutionHistory = {
        id: toolCallId,
        toolName,
        serverId,
        arguments: args,
        result,
        timestamp: new Date(),
        sessionId: context?.sessionId,
        userId: context?.userId,
        executionTime: result.executionTime,
        success: false,
        error: result.error
      };

      this.executionHistory.push(historyEntry);

      // 서버 통계 업데이트
      this.updateServerStats(serverId, false, result.executionTime || 0);

      this.log('error', `Failed to execute tool ${toolName} on server ${serverId}:`, error);
      this.emitEvent('tool_failed', serverId, { toolName, error: result.error });

      return result;
    }
  }

  /**
   * 모의 도구 실행 (실제 환경에서는 MCP 프로토콜 사용)
   */
  private async executeMockTool(
    serverId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<{ content: MCPContent[] }> {
    // 실제 Claude Code 환경에서는 여기서 MCP 프로토콜을 통해 도구를 실행
    // 현재는 모의 응답을 반환

    const mockResponses: Record<string, any> = {
      'search_servers': {
        content: [{
          type: 'text',
          text: `Found MCP servers for query: ${args.query}\n\nExample servers:\n- Server 1: Description\n- Server 2: Description`
        }]
      },
      'fetch': {
        content: [{
          type: 'text',
          text: `Fetched content from: ${args.url}\n\nContent preview: This is mock content from the URL.`
        }]
      },
      'resolve-library-id': {
        content: [{
          type: 'text',
          text: `Resolved library ID for: ${args.libraryName}\nLibrary ID: /example/library`
        }]
      },
      'sequentialthinking': {
        content: [{
          type: 'text',
          text: `Sequential thinking result:\nThought ${args.thoughtNumber}: ${args.thought}\nNext thought needed: ${args.nextThoughtNeeded}`
        }]
      }
    };

    const response = mockResponses[toolName] || {
      content: [{
        type: 'text',
        text: `Mock result for tool ${toolName} with arguments: ${JSON.stringify(args, null, 2)}`
      }]
    };

    // 실행 시간 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    return response;
  }

  /**
   * 서버 통계 업데이트
   */
  private updateServerStats(serverId: string, success: boolean, executionTime: number) {
    const stats = this.serverStats.get(serverId);
    if (!stats) return;

    stats.totalCalls++;
    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }

    // 평균 실행 시간 업데이트
    const totalExecutionTime = (stats.averageExecutionTime * (stats.totalCalls - 1)) + executionTime;
    stats.averageExecutionTime = totalExecutionTime / stats.totalCalls;
    stats.lastActivity = new Date();

    this.serverStats.set(serverId, stats);
  }

  /**
   * 연결된 서버 목록 조회
   */
  getConnectedServers(): MCPServer[] {
    return Array.from(this.servers.values()).filter(server => server.status === 'connected');
  }

  /**
   * 모든 서버 목록 조회
   */
  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * 서버의 도구 목록 조회
   */
  getServerTools(serverId: string): MCPTool[] {
    return this.tools.get(serverId) || [];
  }

  /**
   * 모든 도구 목록 조회
   */
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const tools of this.tools.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }

  /**
   * 실행 히스토리 조회
   */
  getExecutionHistory(filters?: {
    serverId?: string;
    toolName?: string;
    sessionId?: string;
    limit?: number;
  }): MCPExecutionHistory[] {
    let history = this.executionHistory;

    if (filters) {
      if (filters.serverId) {
        history = history.filter(h => h.serverId === filters.serverId);
      }
      if (filters.toolName) {
        history = history.filter(h => h.toolName === filters.toolName);
      }
      if (filters.sessionId) {
        history = history.filter(h => h.sessionId === filters.sessionId);
      }
      if (filters.limit) {
        history = history.slice(-filters.limit);
      }
    }

    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 서버 통계 조회
   */
  getServerStats(serverId?: string): MCPServerStats | MCPServerStats[] {
    if (serverId) {
      return this.serverStats.get(serverId) || null;
    }
    return Array.from(this.serverStats.values());
  }

  /**
   * 이벤트 발생
   */
  private emitEvent(type: MCPEventType, serverId: string, data?: any) {
    const event: MCPEvent = {
      type,
      serverId,
      timestamp: new Date(),
      data,
      error: data?.error
    };

    this.emit('mcp_event', event);
    this.emit(type, event);
  }

  /**
   * 로깅
   */
  private log(level: string, message: string, ...args: any[]) {
    if (!this.settings.enableLogging) return;

    const timestamp = new Date().toISOString();
    console[level as keyof Console](`[MCP ${timestamp}] ${message}`, ...args);
  }

  /**
   * 설정 업데이트
   */
  updateSettings(newSettings: Partial<MCPSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * 서비스 종료
   */
  async shutdown() {
    // 모든 서버 연결 해제
    for (const serverId of this.servers.keys()) {
      await this.disconnectFromServer(serverId);
    }

    // 대기 중인 요청 정리
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Service shutting down'));
    }
    this.pendingRequests.clear();

    this.removeAllListeners();
  }
}

// 싱글톤 인스턴스
export const mcpService = new MCPService();