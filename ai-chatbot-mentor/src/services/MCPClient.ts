import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  MCPToolResult,
  MCPContent,
  MCPServerConfig
} from '@/types/mcp';

export interface MCPClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  private config: MCPServerConfig;
  private options: MCPClientOptions;
  private isConnected = false;
  private tools: MCPTool[] = [];

  constructor(config: MCPServerConfig, options: MCPClientOptions = {}) {
    super();
    this.config = config;
    this.options = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...options
    };
  }

  /**
   * MCP 서버에 연결
   */
  async connect(): Promise<void> {
    try {
      this.log('info', `Connecting to MCP server: ${this.config.name}`);

      // 서버 프로세스 시작
      await this.startServerProcess();

      // 초기화 핸드셰이크
      await this.initialize();

      // 도구 목록 로드
      await this.loadTools();

      this.isConnected = true;
      this.emit('connected');
      this.log('info', `Successfully connected to MCP server: ${this.config.name}`);

    } catch (error) {
      this.log('error', `Failed to connect to MCP server: ${this.config.name}`, error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * 서버 프로세스 시작
   */
  private async startServerProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 서버 명령어 구성
        const command = this.getServerCommand();
        const args = this.getServerArgs();
        const env = { ...process.env, ...this.config.env };

        this.log('info', `Starting server process: ${command} ${args.join(' ')}`);

        // 프로세스 시작
        this.process = spawn(command, args, {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: process.platform === 'win32'
        });

        // 프로세스 이벤트 핸들러
        this.process.on('error', (error) => {
          this.log('error', 'Server process error:', error);
          reject(error);
        });

        this.process.on('exit', (code, signal) => {
          this.log('info', `Server process exited with code ${code}, signal ${signal}`);
          this.isConnected = false;
          this.emit('disconnected');
        });

        // stdout/stderr 로깅
        if (this.process.stdout) {
          this.process.stdout.on('data', (data) => {
            this.log('debug', 'Server stdout:', data.toString());
          });
        }

        if (this.process.stderr) {
          this.process.stderr.on('data', (data) => {
            this.log('debug', 'Server stderr:', data.toString());
          });
        }

        // 프로세스가 시작될 때까지 잠시 대기
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            resolve();
          } else {
            reject(new Error('Server process failed to start'));
          }
        }, 2000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 서버 명령어 가져오기
   */
  private getServerCommand(): string {
    if (this.config.command) {
      return this.config.command;
    }

    // 기본 MCP 서버 명령어 매핑
    const serverCommands: Record<string, string> = {
      'mcp-fetch': process.platform === 'win32' ? 'npx' : 'uvx',
      'mcp-toolbox': process.platform === 'win32' ? 'npx' : 'uvx',
      'mcp-context7': process.platform === 'win32' ? 'npx' : 'uvx',
      'mcp-21st-dev-magic': process.platform === 'win32' ? 'npx' : 'uvx',
      'mcp-sequential-thinking': process.platform === 'win32' ? 'npx' : 'uvx'
    };

    return serverCommands[this.config.id] || 'npx';
  }

  /**
   * 서버 인수 가져오기
   */
  private getServerArgs(): string[] {
    if (this.config.args) {
      return this.config.args;
    }

    // 기본 MCP 서버 인수 매핑
    const serverArgs: Record<string, string[]> = {
      'mcp-fetch': process.platform === 'win32' 
        ? ['-y', 'mcp-server-fetch'] 
        : ['mcp-server-fetch'],
      'mcp-toolbox': process.platform === 'win32'
        ? ['-y', '@smithery/cli@latest', 'run', '@smithery/toolbox']
        : ['@smithery/cli@latest', 'run', '@smithery/toolbox'],
      'mcp-context7': process.platform === 'win32'
        ? ['-y', '@upstash/context7-mcp@latest']
        : ['@upstash/context7-mcp@latest'],
      'mcp-21st-dev-magic': process.platform === 'win32'
        ? ['-y', '@21st-dev/magic@latest']
        : ['@21st-dev/magic@latest'],
      'mcp-sequential-thinking': process.platform === 'win32'
        ? ['-y', '@modelcontextprotocol/server-sequential-thinking']
        : ['@modelcontextprotocol/server-sequential-thinking']
    };

    return serverArgs[this.config.id] || ['-y', this.config.id];
  }

  /**
   * MCP 초기화 핸드셰이크
   */
  private async initialize(): Promise<void> {
    if (!this.process || !this.process.stdin || !this.process.stdout) {
      throw new Error('Server process not available');
    }

    // JSON-RPC over stdio 통신 설정
    this.setupStdioTransport();

    // 초기화 요청
    const initRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: this.getNextMessageId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
          logging: {}
        },
        clientInfo: {
          name: 'ai-chatbot-mentor',
          version: '1.0.0'
        }
      }
    };

    const response = await this.sendRequest(initRequest);
    
    if (response.error) {
      throw new Error(`Initialization failed: ${response.error.message}`);
    }

    // 초기화 완료 알림
    await this.sendNotification({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    });

    this.log('info', 'MCP initialization completed');
  }

  /**
   * stdio 전송 설정
   */
  private setupStdioTransport(): void {
    if (!this.process || !this.process.stdout) return;

    let buffer = '';

    this.process.stdout.on('data', (data) => {
      buffer += data.toString();
      
      // JSON-RPC 메시지 파싱 (줄바꿈으로 구분)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line.trim());
            this.handleMessage(message);
          } catch (error) {
            this.log('error', 'Failed to parse message:', line, error);
          }
        }
      }
    });
  }

  /**
   * 메시지 처리
   */
  private handleMessage(message: MCPMessage): void {
    if ('id' in message && message.id !== undefined) {
      // 응답 메시지
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        
        if ('error' in message && message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message);
        }
      }
    } else {
      // 알림 메시지
      this.emit('notification', message);
    }
  }

  /**
   * 요청 전송
   */
  private async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Server process not available'));
        return;
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id!);
        reject(new Error('Request timeout'));
      }, this.options.timeout);

      this.pendingRequests.set(request.id!, { resolve, reject, timeout });

      const message = JSON.stringify(request) + '\n';
      this.process.stdin.write(message);
    });
  }

  /**
   * 알림 전송
   */
  private async sendNotification(notification: any): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server process not available');
    }

    const message = JSON.stringify(notification) + '\n';
    this.process.stdin.write(message);
  }

  /**
   * 도구 목록 로드
   */
  private async loadTools(): Promise<void> {
    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: this.getNextMessageId(),
        method: 'tools/list',
        params: {}
      };

      const response = await this.sendRequest(request);
      
      if (response.error) {
        throw new Error(`Failed to load tools: ${response.error.message}`);
      }

      this.tools = (response.result?.tools || []).map((tool: any) => ({
        ...tool,
        serverId: this.config.id
      }));

      this.log('info', `Loaded ${this.tools.length} tools from server ${this.config.name}`);

    } catch (error) {
      this.log('error', 'Failed to load tools:', error);
      this.tools = [];
    }
  }

  /**
   * 도구 실행
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: this.getNextMessageId(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      const response = await this.sendRequest(request);

      if (response.error) {
        return {
          id: `result_${Date.now()}`,
          toolCallId: request.id!.toString(),
          success: false,
          error: response.error.message,
          isError: true,
          timestamp: new Date()
        };
      }

      // MCP 응답을 MCPToolResult 형식으로 변환
      const content: MCPContent[] = [];
      
      if (response.result?.content) {
        for (const item of response.result.content) {
          if (item.type === 'text') {
            content.push({
              type: 'text',
              text: item.text
            });
          } else if (item.type === 'image') {
            content.push({
              type: 'image',
              data: item.data,
              mimeType: item.mimeType
            });
          } else if (item.type === 'resource') {
            content.push({
              type: 'resource',
              resource: {
                uri: item.resource.uri,
                name: item.resource.name,
                description: item.resource.description,
                mimeType: item.resource.mimeType
              }
            });
          }
        }
      }

      return {
        id: `result_${Date.now()}`,
        toolCallId: request.id!.toString(),
        success: true,
        content,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: `result_${Date.now()}`,
        toolCallId: `error_${Date.now()}`,
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        isError: true,
        timestamp: new Date()
      };
    }
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;

    // 대기 중인 요청 정리
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Client disconnecting'));
    }
    this.pendingRequests.clear();

    // WebSocket 연결 종료
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // 프로세스 종료
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // 강제 종료 대기
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process = null;
    }

    this.emit('disconnected');
    this.log('info', `Disconnected from MCP server: ${this.config.name}`);
  }

  /**
   * 연결 상태 확인
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.process !== null && !this.process.killed;
  }

  /**
   * 도구 목록 가져오기
   */
  getTools(): MCPTool[] {
    return [...this.tools];
  }

  /**
   * 다음 메시지 ID 생성
   */
  private getNextMessageId(): number {
    return ++this.messageId;
  }

  /**
   * 로깅
   */
  private log(level: string, message: string, ...args: any[]): void {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = `[MCP Client ${this.config.name} ${timestamp}]`;
    
    console[level as keyof Console](`${prefix} ${message}`, ...args);
  }
}