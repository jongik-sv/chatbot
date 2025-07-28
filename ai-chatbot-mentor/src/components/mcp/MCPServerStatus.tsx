'use client';

import React, { useState, useEffect } from 'react';
import {
  ServerIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { MCPServer, MCPServerStats } from '@/types/mcp';

interface MCPServerStatusProps {
  onServerConnect?: (serverId: string) => void;
  onServerDisconnect?: (serverId: string) => void;
  className?: string;
}

interface ServerWithStats extends MCPServer {
  stats?: MCPServerStats;
  toolCount: number;
}

export function MCPServerStatus({
  onServerConnect,
  onServerDisconnect,
  className = ''
}: MCPServerStatusProps) {
  const [servers, setServers] = useState<ServerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadServerStatus();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadServerStatus = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      if (!showRefresh) setLoading(true);
      setError(null);

      const response = await fetch('/api/mcp/servers?includeStats=true');
      if (!response.ok) {
        throw new Error('서버 상태 조회에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setServers(data.data);
      } else {
        throw new Error(data.error || '서버 데이터 형식이 올바르지 않습니다.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleServerAction = async (serverId: string, action: 'connect' | 'disconnect' | 'reconnect') => {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          serverId
        })
      });

      if (!response.ok) {
        throw new Error(`서버 ${action} 요청에 실패했습니다.`);
      }

      const data = await response.json();
      if (data.success) {
        // 서버 상태 새로고침
        await loadServerStatus(true);
        
        // 콜백 호출
        if (action === 'connect' && onServerConnect) {
          onServerConnect(serverId);
        } else if (action === 'disconnect' && onServerDisconnect) {
          onServerDisconnect(serverId);
        }
      } else {
        throw new Error(data.error || `서버 ${action}에 실패했습니다.`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 작업에 실패했습니다.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ServerIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (loading && !refreshing) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <ServerIcon className="h-5 w-5 animate-pulse" />
          <span>서버 상태를 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ServerIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">MCP 서버 상태</h3>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              {servers.filter(s => s.status === 'connected').length}/{servers.length} 연결됨
            </span>
          </div>
          
          <button
            onClick={() => loadServerStatus(true)}
            disabled={refreshing}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 서버 목록 */}
      <div className="divide-y divide-gray-200">
        {servers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            등록된 MCP 서버가 없습니다.
          </div>
        ) : (
          servers.map((server) => (
            <div key={server.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(server.status)}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{server.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(server.status)}`}>
                        {server.status === 'connected' ? '연결됨' : 
                         server.status === 'disconnected' ? '연결 해제' : 
                         server.status === 'error' ? '오류' : server.status}
                      </span>
                    </div>
                    
                    {server.description && (
                      <p className="text-xs text-gray-600 mt-1">{server.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{server.toolCount}개 도구</span>
                      
                      {server.lastConnected && (
                        <span>
                          마지막 연결: {new Date(server.lastConnected).toLocaleString()}
                        </span>
                      )}
                      
                      {server.stats && server.stats.uptime > 0 && (
                        <span>
                          가동시간: {formatUptime(server.stats.uptime)}
                        </span>
                      )}
                    </div>

                    {/* 통계 정보 */}
                    {server.stats && (
                      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <div className="text-gray-500">총 호출</div>
                          <div className="font-medium">{server.stats.totalCalls}</div>
                        </div>
                        <div className="bg-green-50 px-2 py-1 rounded">
                          <div className="text-gray-500">성공</div>
                          <div className="font-medium text-green-700">{server.stats.successfulCalls}</div>
                        </div>
                        <div className="bg-red-50 px-2 py-1 rounded">
                          <div className="text-gray-500">실패</div>
                          <div className="font-medium text-red-700">{server.stats.failedCalls}</div>
                        </div>
                        <div className="bg-blue-50 px-2 py-1 rounded">
                          <div className="text-gray-500">평균 시간</div>
                          <div className="font-medium text-blue-700">{Math.round(server.stats.averageExecutionTime)}ms</div>
                        </div>
                      </div>
                    )}

                    {/* 오류 메시지 */}
                    {server.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {server.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex items-center space-x-1 ml-4">
                  {server.status === 'connected' ? (
                    <>
                      <button
                        onClick={() => handleServerAction(server.id, 'disconnect')}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      >
                        연결 해제
                      </button>
                      <button
                        onClick={() => handleServerAction(server.id, 'reconnect')}
                        className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        재연결
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleServerAction(server.id, 'connect')}
                      className="px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    >
                      연결
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 푸터 - 전체 통계 */}
      {servers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <SignalIcon className="h-3 w-3" />
                <span>연결률: {Math.round((servers.filter(s => s.status === 'connected').length / servers.length) * 100)}%</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <ChartBarIcon className="h-3 w-3" />
                <span>총 도구: {servers.reduce((sum, s) => sum + s.toolCount, 0)}개</span>
              </div>
            </div>
            
            <span className="text-gray-500">
              마지막 업데이트: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}