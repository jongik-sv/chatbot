import { MCPServerConfig } from '@/types/mcp';

/**
 * MCP 서버 설정
 * 실제 MCP 서버들의 연결 정보를 정의합니다.
 */
export const MCP_SERVER_CONFIGS: MCPServerConfig[] = [
  {
    id: 'mcp-fetch',
    name: 'MCP Fetch',
    description: 'Web content fetching and processing',
    command: process.platform === 'win32' ? 'npx' : 'uvx',
    args: process.platform === 'win32' 
      ? ['-y', '@modelcontextprotocol/server-fetch'] 
      : ['@modelcontextprotocol/server-fetch'],
    env: {
      // 필요한 환경 변수들
    },
    enabled: true,
    autoConnect: true
  },
  {
    id: 'mcp-toolbox',
    name: 'MCP Toolbox',
    description: 'MCP server management and tool discovery',
    command: process.platform === 'win32' ? 'npx' : 'uvx',
    args: process.platform === 'win32'
      ? ['-y', '@smithery/cli@latest', 'run', '@smithery/toolbox']
      : ['@smithery/cli@latest', 'run', '@smithery/toolbox'],
    env: {
      // Toolbox API 키가 필요한 경우
    },
    enabled: false, // 일시적으로 비활성화
    autoConnect: false
  },
  {
    id: 'mcp-context7',
    name: 'Context7',
    description: 'Library documentation and context provider',
    command: process.platform === 'win32' ? 'npx' : 'uvx',
    args: process.platform === 'win32'
      ? ['-y', '@upstash/context7-mcp@latest']
      : ['@upstash/context7-mcp@latest'],
    env: {},
    enabled: false, // 일시적으로 비활성화
    autoConnect: false
  },
  {
    id: 'mcp-21st-dev-magic',
    name: '21st.dev Magic',
    description: 'UI component generation and magic tools',
    command: process.platform === 'win32' ? 'npx' : 'uvx',
    args: process.platform === 'win32'
      ? ['-y', '@21st-dev/magic@latest']
      : ['@21st-dev/magic@latest'],
    env: {
      // 21st.dev API 키가 필요한 경우
    },
    enabled: false, // 일시적으로 비활성화
    autoConnect: false
  },
  {
    id: 'mcp-sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Advanced reasoning and thinking tools',
    command: process.platform === 'win32' ? 'npx' : 'uvx',
    args: process.platform === 'win32'
      ? ['-y', '@modelcontextprotocol/server-sequential-thinking']
      : ['@modelcontextprotocol/server-sequential-thinking'],
    env: {},
    enabled: false, // 일시적으로 비활성화
    autoConnect: false
  }
];

/**
 * MCP 서비스 기본 설정
 */
export const MCP_SERVICE_CONFIG = {
  autoConnect: true,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  logLevel: 'info' as const,
  
  // 연결 재시도 설정
  reconnectOnFailure: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  
  // 도구 실행 설정
  toolExecutionTimeout: 60000,
  maxConcurrentExecutions: 10,
  
  // 캐싱 설정
  enableToolCache: false,
  toolCacheTimeout: 300000, // 5분
  
  // 보안 설정
  allowedOrigins: ['localhost', '127.0.0.1'],
  requireAuth: false
};

/**
 * 환경별 MCP 설정 오버라이드
 */
export function getMCPConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig = {
    servers: MCP_SERVER_CONFIGS.filter(server => server.enabled),
    service: MCP_SERVICE_CONFIG
  };
  
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          enableLogging: false,
          logLevel: 'error' as const,
          timeout: 60000,
          toolExecutionTimeout: 120000
        }
      };
      
    case 'test':
      return {
        ...baseConfig,
        servers: [], // 테스트 환경에서는 실제 서버 연결 안함
        service: {
          ...baseConfig.service,
          autoConnect: false,
          enableLogging: false
        }
      };
      
    default: // development
      return baseConfig;
  }
}

/**
 * 특정 서버 설정 가져오기
 */
export function getServerConfig(serverId: string): MCPServerConfig | undefined {
  return MCP_SERVER_CONFIGS.find(config => config.id === serverId);
}

/**
 * 활성화된 서버 목록 가져오기
 */
export function getEnabledServers(): MCPServerConfig[] {
  return MCP_SERVER_CONFIGS.filter(config => config.enabled);
}