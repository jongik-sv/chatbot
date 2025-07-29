// MCP (Model Context Protocol) 타입 정의

export interface MCPServer {
  id: string;
  name: string;
  version: string;
  description?: string;
  status: 'connected' | 'disconnected' | 'error';
  url?: string;
  lastConnected?: Date;
  capabilities?: MCPCapabilities;
  error?: string;
}

export interface MCPCapabilities {
  tools?: boolean;
  prompts?: boolean;
  resources?: boolean;
  logging?: boolean;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  serverId: string;
}

export interface MCPToolCall {
  id: string;
  tool: string;
  arguments: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

export interface MCPToolResult {
  id: string;
  toolCallId: string;
  success: boolean;
  content?: MCPContent[];
  error?: string;
  isError?: boolean;
  timestamp: Date;
  executionTime?: number;
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  annotations?: Record<string, any>;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface MCPConnection {
  serverId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
  latency?: number;
  error?: string;
}

export interface MCPExecutionContext {
  sessionId?: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, any>;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  autoRestart?: boolean;
  maxRestarts?: number;
  timeout?: number;
  enabled?: boolean;
  autoConnect?: boolean;
  type?: 'builtin' | 'external';
  tools?: string[];
  autoApprove?: string[];
}

// MCP 메시지 타입들
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPRequest extends MCPMessage {
  method: string;
  params?: any;
}

export interface MCPResponse extends MCPMessage {
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification extends MCPMessage {
  method: string;
  params?: any;
}

// MCP 도구 실행 히스토리
export interface MCPExecutionHistory {
  id: string;
  toolName: string;
  serverId: string;
  arguments: Record<string, any>;
  result?: MCPToolResult;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  executionTime?: number;
  success: boolean;
  error?: string;
}

// MCP 서버 통계
export interface MCPServerStats {
  serverId: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTime: number;
  uptime: number;
  lastActivity: Date;
}

// MCP 설정
export interface MCPSettings {
  autoConnect: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// MCP 이벤트 타입
export type MCPEventType = 
  | 'server_connected'
  | 'server_disconnected'
  | 'server_error'
  | 'tool_executed'
  | 'tool_failed'
  | 'prompt_requested'
  | 'resource_accessed';

export interface MCPEvent {
  type: MCPEventType;
  serverId: string;
  timestamp: Date;
  data?: any;
  error?: string;
}