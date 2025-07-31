import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { MCPClient } from './MCPClient';
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
  private clients: Map<string, MCPClient> = new Map();
  private connections: Map<string, MCPConnection> = new Map();
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

  constructor() {
    super();
    this.initializeDefaultServers();
  }

  /**
   * 기본 MCP 서버 초기화
   */
  private initializeDefaultServers() {
    // 설정 파일에서 MCP 서버들을 로드하고 연결
    this.loadMCPServers();
  }

  /**
   * 설정 파일에서 MCP 서버 로드
   */
  private async loadMCPServers() {
    try {
      // .mcp.json 파일에서 설정 로드
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const configPath = path.join(process.cwd(), '.mcp.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      // 설정 업데이트
      if (config.settings) {
        this.updateSettings(config.settings);
      }

      // MCP 서버들 로드
      if (config.mcpServers) {
        for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
          if (!(serverConfig as any).disabled) {
            await this.registerServer({
              id: serverId,
              name: (serverConfig as any).name || serverId,
              description: (serverConfig as any).description || `MCP Server: ${serverId}`,
              command: (serverConfig as any).command,
              args: (serverConfig as any).args,
              env: (serverConfig as any).env,
              type: (serverConfig as any).type,
              tools: (serverConfig as any).tools,
              autoApprove: (serverConfig as any).autoApprove
            });
          }
        }
      }

      // 내장 fetch 서버 설정
      await this.setupBuiltinFetchServer();

      this.log('info', 'MCP servers loaded from .mcp.json');

      if (this.settings.autoConnect) {
        await this.connectAllServers();
      }

    } catch (error) {
      this.log('error', 'Failed to load .mcp.json, using fallback servers:', error);
      // 설정 파일 로드 실패 시 기본 서버들로 폴백
      await this.loadFallbackServers();
    }
  }

  /**
   * 폴백 서버 로드 (설정 파일 로드 실패 시)
   */
  private async loadFallbackServers() {
    const fallbackServers = [
      {
        id: 'mcp-fetch',
        name: 'MCP Fetch',
        description: 'Web content fetching and processing',
        type: 'builtin',
        tools: ['fetch']
      }
    ];

    for (const config of fallbackServers) {
      await this.registerServer(config);
    }

    // 내장 fetch 서버는 즉시 연결 상태로 설정
    await this.setupBuiltinFetchServer();

    if (this.settings.autoConnect) {
      await this.connectAllServers();
    }
  }

  /**
   * 내장 fetch 서버 설정
   */
  private async setupBuiltinFetchServer() {
    const serverId = 'mcp-fetch';
    const server = this.servers.get(serverId);
    
    if (server) {
      server.status = 'connected';
      server.lastConnected = new Date();
      
      this.connections.set(serverId, {
        serverId,
        status: 'connected',
        lastPing: new Date(),
        latency: 0
      });

      // 내장 fetch 도구 정의
      const fetchTools = [
        {
          name: 'fetch',
          description: 'Fetch content from a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to fetch' },
              max_length: { type: 'number', description: 'Maximum content length' },
              raw: { type: 'boolean', description: 'Return raw HTML instead of parsed content' }
            },
            required: ['url']
          },
          serverId
        }
      ];

      this.tools.set(serverId, fetchTools);
      this.log('info', `Setup builtin fetch server with ${fetchTools.length} tools`);
      this.emitEvent('server_connected', serverId);
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
      description: config.description || config.name,
      status: 'disconnected',
      command: config.command,
      args: config.args,
      env: config.env,
      type: config.type,
      tools: config.tools,
      autoApprove: config.autoApprove
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
    const connectionPromises = [];
    
    for (const serverId of serverIds) {
      const connectionPromise = this.connectToServerWithRetry(serverId, 2);
      connectionPromises.push(connectionPromise);
    }

    // 모든 연결을 병렬로 시도하되, 실패해도 계속 진행
    const results = await Promise.allSettled(connectionPromises);
    
    let connectedCount = 0;
    let failedCount = 0;
    
    results.forEach((result, index) => {
      const serverId = serverIds[index];
      if (result.status === 'fulfilled') {
        connectedCount++;
        this.log('info', `Successfully connected to server: ${serverId}`);
      } else {
        failedCount++;
        this.log('warn', `Failed to connect to server ${serverId}:`, result.reason);
      }
    });

    this.log('info', `Connection summary: ${connectedCount} connected, ${failedCount} failed`);
  }

  /**
   * 재시도를 포함한 서버 연결
   */
  private async connectToServerWithRetry(serverId: string, maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log('info', `Connecting to ${serverId} (attempt ${attempt}/${maxRetries})`);
        await this.connectToServer(serverId);
        return; // 성공시 즉시 반환
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.log('warn', `Connection attempt ${attempt} failed for ${serverId}: ${lastError.message}`);
        
        // 마지막 시도가 아니면 잠시 대기
        if (attempt < maxRetries) {
          const delay = 1000 * attempt; // 점진적으로 대기 시간 증가
          this.log('info', `Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 모든 재시도 실패
    throw lastError || new Error(`Failed to connect to ${serverId} after ${maxRetries} attempts`);
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
      this.log('info', `Attempting to connect to server: ${serverId}`);
      this.connections.set(serverId, {
        serverId,
        status: 'connecting'
      });

      // 내장 fetch 서버는 별도 연결 과정 없이 즉시 연결 상태로 설정
      if (serverId === 'mcp-fetch') {
        server.status = 'connected';
        server.lastConnected = new Date();
        this.connections.set(serverId, {
          serverId,
          status: 'connected',
          lastPing: new Date(),
          latency: 0
        });
        this.log('info', `Connected to builtin MCP server: ${server.name}`);
        this.emitEvent('server_connected', serverId);
        return;
      }

      // 기존 클라이언트가 있으면 연결 해제
      const existingClient = this.clients.get(serverId);
      if (existingClient) {
        this.log('info', `Disconnecting existing client for server: ${serverId}`);
        await existingClient.disconnect();
      }

      // 새 MCP 클라이언트 생성
      const config: MCPServerConfig = {
        id: serverId,
        name: server.name,
        description: server.description,
        command: server.command,
        args: server.args,
        env: server.env,
        type: server.type,
        tools: server.tools,
        autoApprove: server.autoApprove
      };

      this.log('info', `Creating MCP client for ${serverId} with command: ${config.command} ${config.args?.join(' ') || ''}`);

      const client = new MCPClient(config, {
        timeout: this.settings.timeout,
        maxRetries: this.settings.maxRetries,
        retryDelay: this.settings.retryDelay,
        enableLogging: this.settings.enableLogging
      });

      // 클라이언트 이벤트 핸들러 설정
      client.on('connected', () => {
        server.status = 'connected';
        server.lastConnected = new Date();
        this.connections.set(serverId, {
          serverId,
          status: 'connected',
          lastPing: new Date(),
          latency: 0
        });
        this.log('info', `Successfully connected to MCP server: ${server.name}`);
        this.emitEvent('server_connected', serverId);
      });

      client.on('disconnected', () => {
        server.status = 'disconnected';
        this.connections.set(serverId, {
          serverId,
          status: 'disconnected'
        });
        this.log('warn', `MCP server disconnected: ${server.name}`);
        this.emitEvent('server_disconnected', serverId);
      });

      client.on('error', (error) => {
        server.status = 'error';
        server.error = error.message;
        this.connections.set(serverId, {
          serverId,
          status: 'error',
          error: error.message
        });
        this.log('error', `MCP server error for ${server.name}:`, error);
        this.emitEvent('server_error', serverId, { error: error.message });
      });

      // 클라이언트 저장 및 연결 시도
      this.clients.set(serverId, client);
      
      // 연결 타임아웃 설정
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Connection timeout after ${this.settings.timeout}ms`)), this.settings.timeout);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // 서버의 도구 목록 로드
      await this.loadServerTools(serverId);

      this.log('info', `Successfully initialized MCP server: ${server.name}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      server.status = 'error';
      server.error = errorMessage;
      
      this.connections.set(serverId, {
        serverId,
        status: 'error',
        error: errorMessage
      });

      this.log('error', `Failed to connect to server ${serverId}: ${errorMessage}`, error);
      this.emitEvent('server_error', serverId, { error: errorMessage });
      
      // 실패한 클라이언트 정리
      const failedClient = this.clients.get(serverId);
      if (failedClient) {
        try {
          await failedClient.disconnect();
        } catch (disconnectError) {
          this.log('warn', `Failed to disconnect failed client for ${serverId}:`, disconnectError);
        }
        this.clients.delete(serverId);
      }
      
      throw error;
    }
  }

  /**
   * 서버 연결 해제
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    const client = this.clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverId);
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
      const client = this.clients.get(serverId);
      if (!client) {
        this.log('warn', `No client found for server ${serverId}`);
        return;
      }

      // 실제 MCP 클라이언트에서 도구 목록 가져오기
      const tools = client.getTools();
      this.tools.set(serverId, tools);

      this.log('info', `Loaded ${tools.length} tools for server ${serverId}`);

    } catch (error) {
      this.log('error', `Failed to load tools for server ${serverId}:`, error);
      // 실패 시 빈 배열로 설정
      this.tools.set(serverId, []);
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

      let result: MCPToolResult;

      // 내장 fetch 서버 처리
      if (serverId === 'mcp-fetch' && toolName === 'fetch') {
        result = await this.executeBuiltinFetch(args, toolCallId);
        result.executionTime = Date.now() - startTime;
      } else {
        // 실제 MCP 클라이언트를 통한 도구 실행
        const client = this.clients.get(serverId);
        if (!client) {
          throw new Error(`MCP client for server ${serverId} not found`);
        }

        result = await client.executeTool(toolName, args);
        result.executionTime = Date.now() - startTime;
      }

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
   * 내장 fetch 도구 실행
   */
  private async executeBuiltinFetch(args: Record<string, any>, toolCallId: string): Promise<MCPToolResult> {
    try {
      const { url, max_length = 50000, raw = false } = args;

      if (!url || typeof url !== 'string') {
        throw new Error('URL is required and must be a string');
      }

      // WebScrapingService 동적 import
      const { WebScrapingService } = await import('./WebScrapingService');
      const webScraper = WebScrapingService.getInstance();

      if (raw) {
        // Raw HTML 반환
        const axios = await import('axios');
        const response = await axios.default.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const content = response.data.length > max_length 
          ? response.data.substring(0, max_length) + '...'
          : response.data;

        return {
          id: `result_${toolCallId}`,
          toolCallId,
          success: true,
          content: [{
            type: 'text',
            text: content
          }],
          timestamp: new Date()
        };
      } else {
        // 파싱된 콘텐츠 반환
        const scrapedContent = await webScraper.scrapeWebsite(url, {
          maxContentLength: max_length,
          removeElements: ['script', 'style', 'nav', 'header', 'footer', '.advertisement', '.ads', '#ads']
        });

        const contentText = `제목: ${scrapedContent.title}\n\n${scrapedContent.content}`;

        return {
          id: `result_${toolCallId}`,
          toolCallId,
          success: true,
          content: [{
            type: 'text',
            text: contentText
          }],
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        id: `result_${toolCallId}`,
        toolCallId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch URL',
        isError: true,
        timestamp: new Date()
      };
    }
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
   * 서버 상태 조회
   */
  async getServerStatus(): Promise<Record<string, any>> {
    const servers = this.getAllServers();
    const status: Record<string, any> = {};

    for (const server of servers) {
      const connection = this.connections.get(server.id);
      const tools = this.getServerTools(server.id);
      const stats = this.getServerStats(server.id);

      status[server.id] = {
        name: server.name,
        status: server.status,
        lastConnected: server.lastConnected,
        error: server.error,
        connection: connection ? {
          status: connection.status,
          lastPing: connection.lastPing,
          latency: connection.latency,
          error: connection.error
        } : null,
        toolsCount: tools.length,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description
        })),
        stats: stats
      };
    }

    return status;
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

    this.removeAllListeners();
  }
}

// 싱글톤 인스턴스
export const mcpService = new MCPService();