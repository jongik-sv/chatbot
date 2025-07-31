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

      // 연결 상태를 먼저 true로 설정 (프로세스 시작 성공)
      this.isConnected = true;
      this.emit('connected');

      // 초기화 핸드셰이크 시도 (실패해도 연결은 유지)
      try {
        await this.initialize();
        this.log('info', `MCP initialization successful for: ${this.config.name}`);
      } catch (initError) {
        this.log('warn', `MCP initialization failed for ${this.config.name}, but process is running:`, initError);
        // 초기화 실패해도 프로세스는 실행 중이므로 연결 상태 유지
      }

      // 도구 목록 로드 시도 (실패해도 연결은 유지)
      try {
        await this.loadTools();
        this.log('info', `Tools loaded successfully for: ${this.config.name}`);
      } catch (toolsError) {
        this.log('warn', `Failed to load tools for ${this.config.name}, but connection maintained:`, toolsError);
        // 도구 로드 실패해도 기본 상태로 유지
        this.tools = [];
      }

      this.log('info', `Successfully connected to MCP server: ${this.config.name}`);

    } catch (error) {
      this.log('error', `Failed to connect to MCP server: ${this.config.name}`, error);
      this.isConnected = false;
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
        this.log('debug', `Full command: ${command} ${args.join(' ')}`);
        
        // 환경변수 로깅 (보안상 민감한 정보는 마스킹)
        if (this.config.env && Object.keys(this.config.env).length > 0) {
          const envKeys = Object.keys(this.config.env);
          this.log('debug', `Environment variables set: ${envKeys.join(', ')}`);
        }

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

        // 프로세스 시작 확인
        let processStarted = false;
        const startTimeout = setTimeout(() => {
          if (!processStarted) {
            reject(new Error('Server process start timeout'));
          }
        }, 10000); // 10초 타임아웃

        // 프로세스가 정상적으로 시작되었는지 확인
        const checkProcess = () => {
          if (this.process && !this.process.killed) {
            processStarted = true;
            clearTimeout(startTimeout);
            resolve();
          }
        };

        // 즉시 확인하고, 1초 후 재확인
        setTimeout(checkProcess, 100);
        setTimeout(() => {
          if (!processStarted) {
            checkProcess();
          }
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 서버 명령어 가져오기
   */
  private getServerCommand(): string {
    // 설정 파일에서 command가 지정된 경우 우선 사용
    if (this.config.command) {
      this.log('debug', `Using config command: ${this.config.command}`);
      return this.config.command;
    }

    // 기본 MCP 서버 명령어 매핑 (설정 파일에 command가 없는 경우만)
    const serverCommands: Record<string, string> = {
      'fetch': process.platform === 'win32' ? 'npx' : 'uvx',
      'pyhub.mcptools': process.platform === 'win32' ? 'npx' : 'uvx',
      'Context7': process.platform === 'win32' ? 'npx' : 'uvx',
      '@21st-dev/magic': process.platform === 'win32' ? 'npx' : 'uvx',
      'sequential-thinking': process.platform === 'win32' ? 'npx' : 'uvx'
    };

    const defaultCommand = serverCommands[this.config.id] || 'npx';
    this.log('debug', `Using default command for ${this.config.id}: ${defaultCommand}`);
    return defaultCommand;
  }

  /**
   * 서버 인수 가져오기
   */
  private getServerArgs(): string[] {
    // 설정 파일에서 args가 지정된 경우 우선 사용
    if (this.config.args && this.config.args.length > 0) {
      this.log('debug', `Using config args: ${JSON.stringify(this.config.args)}`);
      return this.config.args;
    }

    // 기본 MCP 서버 인수 매핑 (설정 파일에 args가 없는 경우만)
    const serverArgs: Record<string, string[]> = {
      'fetch': process.platform === 'win32' 
        ? ['-y', '@modelcontextprotocol/server-fetch'] 
        : ['@modelcontextprotocol/server-fetch'],
      'pyhub.mcptools': process.platform === 'win32'
        ? ['-y', '@smithery/cli@latest', 'run', '@smithery/toolbox']
        : ['@smithery/cli@latest', 'run', '@smithery/toolbox'],
      'Context7': process.platform === 'win32'
        ? ['-y', '@upstash/context7-mcp@latest']
        : ['@upstash/context7-mcp@latest'],
      '@21st-dev/magic': process.platform === 'win32'
        ? ['-y', '@21st-dev/magic@latest']
        : ['@21st-dev/magic@latest'],
      'sequential-thinking': process.platform === 'win32'
        ? ['-y', '@modelcontextprotocol/server-sequential-thinking']
        : ['@modelcontextprotocol/server-sequential-thinking']
    };

    const defaultArgs = serverArgs[this.config.id] || ['-y', this.config.id];
    this.log('debug', `Using default args for ${this.config.id}: ${JSON.stringify(defaultArgs)}`);
    return defaultArgs;
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

    // 프로세스가 준비될 때까지 약간 대기
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.log('info', 'Starting MCP initialization handshake...');

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

    this.log('debug', 'Sending initialize request:', JSON.stringify(initRequest));
    const response = await this.sendRequest(initRequest);
    this.log('debug', 'Received initialize response:', JSON.stringify(response));
    
    if (response.error) {
      throw new Error(`Initialization failed: ${response.error.message}`);
    }

    // 초기화 완료 알림
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    };
    
    this.log('debug', 'Sending initialized notification:', JSON.stringify(notification));
    await this.sendNotification(notification);

    this.log('info', 'MCP initialization completed successfully');
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
          // Windows cmd.exe 노이즈 필터링
          if (this.isWindowsCommandNoise(line.trim())) {
            this.log('debug', 'Filtered Windows command noise:', line.trim());
            continue;
          }
          
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
   * Windows 명령어 프롬프트 노이즈 필터링
   */
  private isWindowsCommandNoise(line: string): boolean {
    // Windows 시스템 메시지들 필터링
    const noisePatterns = [
      /^Microsoft Windows \[Version/,
      /^\(c\) Microsoft Corporation/,
      /^C:\\.*>$/,
      /^C:\\.*>\s*$/,
      /^PS C:\\.*>$/,
      /^PS C:\\.*>\s*$/,
      /^내부 또는 외부 명령/,
      /^'.*'은\(는\) 내부 또는 외부 명령/,
      /^'.*' is not recognized as an internal or external command/,
      /^The system cannot find the path specified/,
      /^파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다/,
      /^액세스가 거부되었습니다/,
      /^Access is denied/,
      /^Windows PowerShell/,
      /^Copyright \(C\) Microsoft Corporation/,
      /^All rights reserved/,
      /^\s*$/  // 빈 줄 필터링
    ];

    return noisePatterns.some(pattern => pattern.test(line));
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
      this.log('info', `Starting to load tools for server ${this.config.name}...`);
      
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

      const rawTools = response.result?.tools || [];

      this.tools = rawTools.map((tool: any) => ({
        ...tool,
        serverId: this.config.id
      }));

      this.log('info', `Successfully loaded ${this.tools.length} tools from server ${this.config.name}`);
      if (this.tools.length > 0) {
        this.log('info', `Available tools: ${this.tools.map(t => t.name).join(', ')}`);
      }

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