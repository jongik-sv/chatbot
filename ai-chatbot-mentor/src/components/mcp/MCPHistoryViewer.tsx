'use client';

import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  CommandLineIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { MCPExecutionHistory } from '@/types/mcp';
import { MCPResultViewer } from './MCPResultViewer';

interface MCPHistoryViewerProps {
  sessionId?: string;
  limit?: number;
  className?: string;
}

interface HistoryWithDetails extends MCPExecutionHistory {
  serverName: string;
  serverStatus: string;
  toolDescription: string;
  duration: string;
}

export function MCPHistoryViewer({
  sessionId,
  limit = 20,
  className = ''
}: MCPHistoryViewerProps) {
  const [history, setHistory] = useState<HistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<HistoryWithDetails | null>(null);
  
  // 필터링 상태
  const [filters, setFilters] = useState({
    serverId: '',
    toolName: '',
    success: '',
    search: ''
  });
  
  // 페이지네이션 상태
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    averageExecutionTime: 0,
    uniqueTools: 0,
    uniqueServers: 0
  });

  useEffect(() => {
    loadHistory();
  }, [sessionId, pagination.page, filters]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (sessionId) params.append('sessionId', sessionId);
      if (filters.serverId) params.append('serverId', filters.serverId);
      if (filters.toolName) params.append('toolName', filters.toolName);

      const response = await fetch(`/api/mcp/history?${params}`);
      if (!response.ok) {
        throw new Error('히스토리 조회에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        throw new Error(data.error || '히스토리 데이터 형식이 올바르지 않습니다.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // 필터 변경 시 첫 페이지로
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleClearHistory = async (type: 'all' | 'session' | 'failed') => {
    if (!confirm(`정말로 ${type === 'all' ? '모든' : type === 'session' ? '현재 세션의' : '실패한'} 히스토리를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({ action: type });
      if (type === 'session' && sessionId) {
        params.append('sessionId', sessionId);
      }

      const response = await fetch(`/api/mcp/history?${params}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('히스토리 삭제에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        await loadHistory(); // 히스토리 새로고침
      } else {
        throw new Error(data.error || '히스토리 삭제에 실패했습니다.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '히스토리 삭제에 실패했습니다.');
    }
  };

  const filteredHistory = history.filter(entry => {
    if (filters.success && filters.success !== 'all') {
      const isSuccess = filters.success === 'true';
      if (entry.success !== isSuccess) return false;
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        entry.toolName.toLowerCase().includes(search) ||
        entry.serverName.toLowerCase().includes(search) ||
        (entry.error && entry.error.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <ClockIcon className="h-5 w-5 animate-pulse" />
          <span>히스토리를 로딩 중...</span>
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
            <ClockIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">MCP 실행 히스토리</h3>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              {stats.total}개 항목
            </span>
          </div>
          
          {/* 통계 */}
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="h-3 w-3 text-green-500" />
              <span>{stats.successful}</span>
            </div>
            <div className="flex items-center space-x-1">
              <XCircleIcon className="h-3 w-3 text-red-500" />
              <span>{stats.failed}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-3 w-3" />
              <span>{stats.averageExecutionTime}ms</span>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filters.success}
            onChange={(e) => handleFilterChange('success', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 결과</option>
            <option value="true">성공만</option>
            <option value="false">실패만</option>
          </select>

          <div className="flex space-x-1">
            <button
              onClick={() => loadHistory()}
              className="flex-1 px-3 py-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              새로고침
            </button>
            
            <div className="relative">
              <button className="px-2 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
                <FunnelIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex space-x-1">
            <button
              onClick={() => handleClearHistory('failed')}
              className="flex-1 px-2 py-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            >
              <TrashIcon className="h-3 w-3 inline mr-1" />
              실패 삭제
            </button>
            
            <button
              onClick={() => handleClearHistory('all')}
              className="flex-1 px-2 py-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            >
              모두 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700 text-sm">
            <XCircleIcon className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 히스토리 목록 */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {filters.search || filters.success ? '검색 결과가 없습니다.' : '실행 히스토리가 없습니다.'}
          </div>
        ) : (
          filteredHistory.map((entry) => (
            <div
              key={entry.id}
              className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {entry.success ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 text-sm">{entry.toolName}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {entry.serverName}
                      </span>
                    </div>
                    
                    {entry.toolDescription && (
                      <p className="text-xs text-gray-600 mt-1">{entry.toolDescription}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      <span>{entry.duration}</span>
                      {entry.sessionId && (
                        <span>세션: {entry.sessionId.slice(-8)}</span>
                      )}
                    </div>

                    {entry.error && (
                      <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        {entry.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {entry.arguments && Object.keys(entry.arguments).length > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {Object.keys(entry.arguments).length}개 인수
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              <span className="px-2 py-1 text-xs">
                {pagination.page} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 선택된 항목의 상세 결과 표시 */}
      {selectedEntry && selectedEntry.result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-auto">
            <MCPResultViewer
              result={selectedEntry.result}
              toolName={selectedEntry.toolName}
              serverName={selectedEntry.serverName}
              onClose={() => setSelectedEntry(null)}
              className="max-w-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}