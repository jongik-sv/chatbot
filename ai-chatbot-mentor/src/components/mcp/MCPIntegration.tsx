'use client';

import React, { useState, useEffect } from 'react';
import {
  CommandLineIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ClockIcon,
  PlayCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { MCPToolSelector } from './MCPToolSelector';
import { MCPResultViewer } from './MCPResultViewer';
import { MCPServerStatus } from './MCPServerStatus';
import { MCPHistoryViewer } from './MCPHistoryViewer';
import { MCPToolResult } from '@/types/mcp';

interface MCPIntegrationProps {
  sessionId?: string;
  onToolResult?: (result: MCPToolResult) => void;
  className?: string;
}

export function MCPIntegration({
  sessionId,
  onToolResult,
  className = ''
}: MCPIntegrationProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'servers' | 'history' | 'stats'>('tools');
  const [currentResult, setCurrentResult] = useState<MCPToolResult | null>(null);
  const [currentToolInfo, setCurrentToolInfo] = useState<{ toolName: string; serverName: string } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToolExecution = async (serverId: string, toolName: string, args: Record<string, any>) => {
    try {
      setExecuting(true);
      setError(null);
      setCurrentResult(null);

      // 서버 정보 조회
      const serversResponse = await fetch('/api/mcp/servers');
      const serversData = await serversResponse.json();
      const server = serversData.success ? serversData.data.find((s: any) => s.id === serverId) : null;
      const serverName = server?.name || 'Unknown Server';

      // 도구 실행
      const response = await fetch('/api/mcp/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId,
          toolName,
          arguments: args,
          sessionId,
          userId: 'current-user' // 실제 구현에서는 인증된 사용자 ID 사용
        })
      });

      if (!response.ok) {
        throw new Error('도구 실행 요청에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setCurrentResult(data.data);
        setCurrentToolInfo({ toolName, serverName });
        
        // 부모 컴포넌트에 결과 전달
        if (onToolResult) {
          onToolResult(data.data);
        }
      } else {
        throw new Error(data.error || '도구 실행에 실패했습니다.');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      
      // 에러도 결과로 생성
      const errorResult: MCPToolResult = {
        id: `error_${Date.now()}`,
        toolCallId: `call_${Date.now()}`,
        success: false,
        error: errorMessage,
        isError: true,
        timestamp: new Date()
      };
      
      setCurrentResult(errorResult);
      setCurrentToolInfo({ toolName, serverName: 'Unknown' });
      
    } finally {
      setExecuting(false);
    }
  };

  const tabs = [
    {
      id: 'tools' as const,
      name: 'MCP 도구',
      icon: CommandLineIcon,
      description: '사용 가능한 MCP 도구 실행'
    },
    {
      id: 'servers' as const,
      name: '서버 상태',
      icon: Cog6ToothIcon,
      description: 'MCP 서버 연결 및 관리'
    },
    {
      id: 'history' as const,
      name: '실행 히스토리',
      icon: ClockIcon,
      description: '도구 실행 기록 조회'
    },
    {
      id: 'stats' as const,
      name: '통계',
      icon: ChartBarIcon,
      description: '사용 통계 및 성능 분석'
    }
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 탭 헤더 */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <div className="flex items-center space-x-2">
            <CommandLineIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">MCP 통합</h2>
            {executing && (
              <div className="flex items-center space-x-1 text-blue-600">
                <PlayCircleIcon className="h-4 w-4 animate-pulse" />
                <span className="text-xs">실행 중...</span>
              </div>
            )}
          </div>
          
          {sessionId && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              세션: {sessionId.slice(-8)}
            </span>
          )}
        </div>
        
        {/* 탭 네비게이션 */}
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 전역 에러 표시 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div className="p-4">
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <MCPToolSelector
              onToolSelect={handleToolExecution}
              disabled={executing}
            />
            
            {/* 실행 결과 표시 */}
            {currentResult && currentToolInfo && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">최근 실행 결과</h3>
                <MCPResultViewer
                  result={currentResult}
                  toolName={currentToolInfo.toolName}
                  serverName={currentToolInfo.serverName}
                  onClose={() => {
                    setCurrentResult(null);
                    setCurrentToolInfo(null);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'servers' && (
          <MCPServerStatus
            onServerConnect={(serverId) => {
              console.log(`서버 ${serverId} 연결됨`);
              // 필요시 추가 로직
            }}
            onServerDisconnect={(serverId) => {
              console.log(`서버 ${serverId} 연결 해제됨`);
              // 필요시 추가 로직
            }}
          />
        )}

        {activeTab === 'history' && (
          <MCPHistoryViewer
            sessionId={sessionId}
            limit={20}
          />
        )}

        {activeTab === 'stats' && (
          <div className="text-center py-8">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">MCP 통계</h3>
            <p className="text-gray-600 mb-4">
              MCP 서버 및 도구 사용 통계를 확인할 수 있습니다.
            </p>
            <button
              onClick={() => {
                // 통계 페이지로 이동하거나 통계 컴포넌트 로드
                window.open('/api/mcp/stats', '_blank');
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              통계 보기
            </button>
          </div>
        )}
      </div>

      {/* 도움말 정보 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {tabs.find(tab => tab.id === activeTab)?.description}
          </span>
          
          <span>
            MCP (Model Context Protocol) v1.0
          </span>
        </div>
      </div>
    </div>
  );
}