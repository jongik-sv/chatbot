'use client';

import React, { useState, useEffect } from 'react';
import { 
  CommandLineIcon, 
  ServerIcon, 
  PlayIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { MCPTool, MCPServer } from '@/types/mcp';

interface MCPToolSelectorProps {
  onToolSelect: (serverId: string, toolName: string, args: Record<string, any>) => void;
  disabled?: boolean;
  className?: string;
}

interface ToolWithServer extends MCPTool {
  serverName: string;
  serverStatus: string;
}

export function MCPToolSelector({ 
  onToolSelect, 
  disabled = false, 
  className = '' 
}: MCPToolSelectorProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<ToolWithServer[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolWithServer | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMCPData();
  }, []);

  const loadMCPData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 서버 목록과 도구 목록을 병렬로 로드
      const [serversResponse, toolsResponse] = await Promise.all([
        fetch('/api/mcp/servers'),
        fetch('/api/mcp/tools')
      ]);

      if (!serversResponse.ok || !toolsResponse.ok) {
        throw new Error('MCP 데이터 로드에 실패했습니다.');
      }

      const serversData = await serversResponse.json();
      const toolsData = await toolsResponse.json();

      if (serversData.success && toolsData.success) {
        setServers(serversData.data);
        setTools(toolsData.data);
      } else {
        throw new Error('MCP 데이터 형식이 올바르지 않습니다.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = tools.filter(tool => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      tool.name.toLowerCase().includes(query) ||
      (tool.description && tool.description.toLowerCase().includes(query)) ||
      tool.serverName.toLowerCase().includes(query)
    );
  });

  const handleToolSelect = (tool: ToolWithServer) => {
    setSelectedTool(tool);
    
    // 필수 인수들을 기본값으로 초기화
    const initialArgs: Record<string, any> = {};
    if (tool.inputSchema.required) {
      tool.inputSchema.required.forEach(field => {
        if (tool.inputSchema.properties?.[field]) {
          const property = tool.inputSchema.properties[field];
          switch (property.type) {
            case 'string':
              initialArgs[field] = '';
              break;
            case 'number':
              initialArgs[field] = 0;
              break;
            case 'boolean':
              initialArgs[field] = false;
              break;
            case 'array':
              initialArgs[field] = [];
              break;
            case 'object':
              initialArgs[field] = {};
              break;
            default:
              initialArgs[field] = '';
          }
        }
      });
    }
    
    setToolArgs(initialArgs);
  };

  const handleArgChange = (field: string, value: any) => {
    setToolArgs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExecute = () => {
    if (!selectedTool) return;
    
    onToolSelect(selectedTool.serverId, selectedTool.name, toolArgs);
    
    // 실행 후 초기화
    setSelectedTool(null);
    setToolArgs({});
  };

  const renderArgumentInput = (field: string, property: any, isRequired: boolean) => {
    const value = toolArgs[field];
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleArgChange(field, e.target.value)}
            placeholder={property.description || `Enter ${field}`}
            className={baseClasses}
            required={isRequired}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleArgChange(field, Number(e.target.value))}
            placeholder={property.description || `Enter ${field}`}
            className={baseClasses}
            required={isRequired}
          />
        );
        
      case 'boolean':
        return (
          <select
            value={value ? 'true' : 'false'}
            onChange={(e) => handleArgChange(field, e.target.value === 'true')}
            className={baseClasses}
            required={isRequired}
          >
            <option value="false">False</option>
            <option value="true">True</option>
          </select>
        );
        
      case 'array':
        return (
          <textarea
            value={Array.isArray(value) ? JSON.stringify(value, null, 2) : '[]'}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleArgChange(field, parsed);
              } catch {
                // 유효하지 않은 JSON인 경우 무시
              }
            }}
            placeholder={`JSON array for ${field}`}
            className={`${baseClasses} h-20 font-mono text-sm`}
            required={isRequired}
          />
        );
        
      default:
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '')}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleArgChange(field, parsed);
              } catch {
                handleArgChange(field, e.target.value);
              }
            }}
            placeholder={property.description || `Enter ${field}`}
            className={`${baseClasses} h-20`}
            required={isRequired}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <CommandLineIcon className="h-5 w-5 animate-spin" />
          <span>MCP 도구를 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={loadMCPData}
            className="ml-2 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded"
          >
            다시 시도
          </button>
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
            <CommandLineIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">MCP 도구</h3>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              {filteredTools.length}개 사용 가능
            </span>
          </div>
          
          {/* 서버 상태 표시 */}
          <div className="flex items-center space-x-1">
            <ServerIcon className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">
              {servers.filter(s => s.status === 'connected').length}/{servers.length} 연결됨
            </span>
          </div>
        </div>
        
        {/* 검색 */}
        <div className="mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="도구 이름이나 설명으로 검색..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 도구 목록 */}
      <div className="max-h-60 overflow-y-auto">
        {filteredTools.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? '검색 결과가 없습니다.' : '사용 가능한 도구가 없습니다.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTools.map((tool) => (
              <div
                key={`${tool.serverId}-${tool.name}`}
                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedTool?.name === tool.name && selectedTool?.serverId === tool.serverId
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : ''
                }`}
                onClick={() => handleToolSelect(tool)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 text-sm">{tool.name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        tool.serverStatus === 'connected' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tool.serverName}
                      </span>
                    </div>
                    {tool.description && (
                      <p className="text-xs text-gray-600 mt-1">{tool.description}</p>
                    )}
                    {tool.inputSchema.required && tool.inputSchema.required.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">
                          필수: {tool.inputSchema.required.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 선택된 도구의 인수 입력 */}
      {selectedTool && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
              {selectedTool.name} 실행 준비
            </span>
          </div>

          {selectedTool.inputSchema.properties && Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(selectedTool.inputSchema.properties).map(([field, property]) => {
                const isRequired = selectedTool.inputSchema.required?.includes(field) || false;
                
                return (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {field}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderArgumentInput(field, property, isRequired)}
                    {(property as any).description && (
                      <p className="text-xs text-gray-500 mt-1">{(property as any).description}</p>
                    )}
                  </div>
                );
              })}
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleExecute}
                  disabled={disabled}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md ${
                    disabled
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>실행</span>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedTool(null);
                    setToolArgs({});
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleExecute}
                disabled={disabled}
                className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md ${
                  disabled
                    ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <PlayIcon className="h-4 w-4" />
                <span>실행 (인수 없음)</span>
              </button>
              
              <button
                onClick={() => setSelectedTool(null)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}