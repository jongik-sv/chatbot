'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Circle, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  Square,
  RotateCcw,
  Server,
  Wrench,
  Activity,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  version?: string;
  description?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  error?: string;
  toolCount: number;
  tools: Array<{
    name: string;
    description: string;
  }>;
  stats?: {
    serverId: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
    uptime: number;
    lastActivity: Date;
  };
}

interface MCPStatusResponse {
  success: boolean;
  data?: {
    servers: MCPServer[];
    summary: {
      totalServers: number;
      connectedServers: number;
      disconnectedServers: number;
      totalTools: number;  
      totalExecutions: number;
    };
    timestamp: string;
  };
  error?: string;
}

export default function MCPStatusPanel() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // MCP 상태 조회
  const fetchMCPStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mcp/status');
      const data: MCPStatusResponse = await response.json();
      
      if (data.success && data.data) {
        setServers(data.data.servers);
        setSummary(data.data.summary);
        setLastUpdated(new Date(data.data.timestamp).toLocaleString('ko-KR'));
      } else {
        setError(data.error || 'MCP 상태를 가져오는데 실패했습니다');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다');
      console.error('MCP status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 서버 제어 (연결/해제/재연결)
  const controlServer = async (serverId: string, action: 'connect' | 'disconnect' | 'reconnect') => {
    try {
      const response = await fetch('/api/mcp/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, serverId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 상태 갱신
        await fetchMCPStatus();
      } else {
        setError(data.error || `서버 ${action} 실패`);
      }
    } catch (err) {
      setError(`서버 제어 중 오류가 발생했습니다`);
      console.error('Server control error:', err);
    }
  };

  // 상태별 아이콘과 색상
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'connecting':
        return <Circle className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-red-100 text-red-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  // 도구 정보 토글 함수
  const toggleToolsExpanded = (serverId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchMCPStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">MCP 서버 상태</h2>
          <p className="text-gray-600 mt-1">Model Context Protocol 서버들의 연결 상태를 확인하고 관리합니다</p>
        </div>
        <Button 
          onClick={fetchMCPStatus} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 요약 */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              전체 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalServers}</div>
                <div className="text-sm text-gray-500">전체 서버</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.connectedServers}</div>
                <div className="text-sm text-gray-500">연결됨</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.disconnectedServers}</div>
                <div className="text-sm text-gray-500">연결 해제</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.totalTools}</div>
                <div className="text-sm text-gray-500">사용 가능한 도구</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.totalExecutions}</div>
                <div className="text-sm text-gray-500">총 실행 횟수</div>
              </div>
            </div>
            {lastUpdated && (
              <div className="text-xs text-gray-600 mt-4 text-center">
                마지막 업데이트: {lastUpdated}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 서버 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Server className="h-5 w-5" />
          MCP 서버 목록
        </h3>
        
        {servers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                {loading ? '로딩 중...' : 'MCP 서버가 없습니다'}
              </div>
            </CardContent>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(server.status)}
                    <div>
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusBadge(server.status)}>
                          {server.status}
                        </Badge>
                        <span className="text-sm text-gray-500">ID: {server.id}</span>
                        {server.version && (
                          <span className="text-sm text-gray-500">v{server.version}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 서버 제어 버튼 */}
                  <div className="flex items-center gap-2">
                    {server.status === 'connected' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => controlServer(server.id, 'disconnect')}
                          className="flex items-center gap-1"
                        >
                          <Square className="h-3 w-3" />
                          연결 해제
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => controlServer(server.id, 'reconnect')}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          재연결
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => controlServer(server.id, 'connect')}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        연결
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* 서버 설명 */}
                {server.description && (
                  <p className="text-gray-600">{server.description}</p>
                )}

                {/* 오류 메시지 */}
                {server.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">오류:</span>
                      <span>{server.error}</span>
                    </div>
                  </div>
                )}

                {/* 서버 통계 */}
                {server.stats && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      실행 통계
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{server.stats.totalCalls}</div>
                        <div className="text-gray-500">총 호출</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">{server.stats.successfulCalls}</div>
                        <div className="text-gray-500">성공</div>
                      </div>
                      <div>
                        <div className="font-medium text-red-600">{server.stats.failedCalls}</div>
                        <div className="text-gray-500">실패</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">
                          {server.stats.averageExecutionTime.toFixed(0)}ms
                        </div>
                        <div className="text-gray-500">평균 시간</div>
                      </div>
                    </div>
                    {server.stats.lastActivity && (
                      <div className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        마지막 활동: {new Date(server.stats.lastActivity).toLocaleString('ko-KR')}
                      </div>
                    )}
                  </div>
                )}

                {/* 사용 가능한 도구 */}
                <div>
                  <button
                    onClick={() => toggleToolsExpanded(server.id)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      사용 가능한 도구 ({server.toolCount}개)
                    </h4>
                    {expandedTools[server.id] ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedTools[server.id] && (
                    <div className="mt-2">
                      {server.tools.length > 0 ? (
                        <div className="space-y-2">
                          {server.tools.map((tool, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="font-medium text-blue-900">{tool.name}</div>
                              <div className="text-sm text-blue-700 mt-1">{tool.description}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">사용 가능한 도구가 없습니다</div>
                      )}
                    </div>
                  )}
                </div>

                {/* 연결 정보 */}
                {server.lastConnected && (
                  <div className="text-xs text-gray-600 border-t pt-3">
                    마지막 연결: {new Date(server.lastConnected).toLocaleString('ko-KR')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}