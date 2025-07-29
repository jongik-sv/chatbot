// components/chat/MCPToolsDisplay.tsx
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface MCPToolResult {
  toolName: string;
  serverId: string;
  result: {
    id: string;
    toolCallId: string;
    success: boolean;
    content?: Array<{
      type: string;
      text?: string;
    }>;
    error?: string;
    isError?: boolean;
    timestamp: Date;
    executionTime?: number;
  };
  reasoning: string;
}

interface MCPToolsDisplayProps {
  mcpTools: MCPToolResult[];
  className?: string;
}

export default function MCPToolsDisplay({ mcpTools, className = '' }: MCPToolsDisplayProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  if (!mcpTools || mcpTools.length === 0) {
    return null;
  }

  const toggleExpanded = (toolId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolId)) {
      newExpanded.delete(toolId);
    } else {
      newExpanded.add(toolId);
    }
    setExpandedTools(newExpanded);
  };

  const formatExecutionTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getServerDisplayName = (serverId: string) => {
    const serverNames: Record<string, string> = {
      'mcp-toolbox': 'MCP Toolbox',
      'mcp-fetch': 'Web Fetch',
      'mcp-context7': 'Context7 Docs',
      'mcp-21st-dev-magic': '21st.dev Magic',
      'mcp-sequential-thinking': 'Sequential Thinking'
    };
    return serverNames[serverId] || serverId;
  };

  const getToolDisplayName = (toolName: string) => {
    const toolNames: Record<string, string> = {
      'search_servers': 'Server Search',
      'use_tool': 'Tool Execution',
      'fetch': 'Web Content Fetch',
      'resolve-library-id': 'Library ID Resolution',
      'get-library-docs': 'Library Documentation',
      '21st_magic_component_builder': 'Component Builder',
      'logo_search': 'Logo Search',
      'sequentialthinking': 'Sequential Thinking'
    };
    return toolNames[toolName] || toolName;
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-blue-800">
            MCP Tools Used ({mcpTools.length})
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {mcpTools.map((tool, index) => {
          const toolId = `${tool.serverId}-${tool.toolName}-${index}`;
          const isExpanded = expandedTools.has(toolId);
          const isSuccess = tool.result.success;

          return (
            <div key={toolId} className="bg-white rounded-md border border-blue-100">
              <button
                onClick={() => toggleExpanded(toolId)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-blue-600" />
                  )}
                  
                  {isSuccess ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-500" />
                  )}

                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {getToolDisplayName(tool.toolName)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getServerDisplayName(tool.serverId)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3" />
                  {formatExecutionTime(tool.result.executionTime)}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-blue-100">
                  <div className="mt-2 space-y-2">
                    {/* 도구 사용 이유 */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Reasoning:</div>
                      <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        {tool.reasoning}
                      </div>
                    </div>

                    {/* 실행 결과 */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Result:</div>
                      <div className="text-xs bg-gray-50 rounded p-2">
                        {isSuccess ? (
                          <div className="space-y-1">
                            {tool.result.content?.map((content, contentIndex) => (
                              <div key={contentIndex}>
                                {content.type === 'text' && content.text && (
                                  <div className="text-gray-800 whitespace-pre-wrap">
                                    {content.text.length > 200 
                                      ? `${content.text.substring(0, 200)}...` 
                                      : content.text
                                    }
                                  </div>
                                )}
                                {content.type !== 'text' && (
                                  <div className="text-gray-600 italic">
                                    [{content.type} content]
                                  </div>
                                )}
                              </div>
                            ))}
                            {(!tool.result.content || tool.result.content.length === 0) && (
                              <div className="text-green-600">Tool executed successfully</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-600">
                            Error: {tool.result.error || 'Unknown error occurred'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 메타데이터 */}
                    <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-200">
                      <span>ID: {tool.result.id.substring(0, 8)}...</span>
                      <span>
                        {new Date(tool.result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 요약 정보 */}
      <div className="mt-2 pt-2 border-t border-blue-200">
        <div className="flex justify-between text-xs text-blue-700">
          <span>
            Success: {mcpTools.filter(t => t.result.success).length} / {mcpTools.length}
          </span>
          <span>
            Total time: {formatExecutionTime(
              mcpTools.reduce((sum, t) => sum + (t.result.executionTime || 0), 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
}