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

// JSON 유효성 검사 함수
const isValidJSON = (str: string | undefined | null): boolean => {
  if (!str || typeof str !== 'string') return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// JSON 포맷팅 함수
const formatJSON = (str: string | undefined | null): string => {
  if (!str || typeof str !== 'string') return 'No content';
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return str;
  }
};

// Sequential Thinking 단계별 파싱 함수
const parseSequentialThinkingSteps = (content: string): Array<{
  stepNumber: number;
  thought: string;
  reasoning?: string;
  nextThoughtNeeded?: boolean;
  totalThoughts?: number;
}> => {
  try {
    // 마크다운 형식의 Sequential Thinking 결과를 파싱
    const steps: Array<{
      stepNumber: number;
      thought: string;
      reasoning?: string;
      nextThoughtNeeded?: boolean;
      totalThoughts?: number;
    }> = [];

    // "단계 X:" 패턴으로 단계 분리
    const stepMatches = content.match(/### 🤔 단계 (\d+): 사고 과정\n\n(.*?)\n\n\*\*추론\*\*: (.*?)(?=\n\n---|\n\n### |$)/gs);
    
    if (stepMatches) {
      stepMatches.forEach((match, index) => {
        const stepMatch = match.match(/### 🤔 단계 (\d+): 사고 과정\n\n(.*?)\n\n\*\*추론\*\*: (.*?)$/s);
        if (stepMatch) {
          steps.push({
            stepNumber: parseInt(stepMatch[1]),
            thought: stepMatch[2].trim(),
            reasoning: stepMatch[3].trim(),
            nextThoughtNeeded: index < stepMatches.length - 1,
            totalThoughts: stepMatches.length
          });
        }
      });
    }

    // JSON 형태의 단계별 정보도 파싱 시도
    if (steps.length === 0 && isValidJSON(content)) {
      const parsed = JSON.parse(content);
      if (parsed.thoughtNumber && parsed.thought) {
        steps.push({
          stepNumber: parsed.thoughtNumber,
          thought: parsed.thought,
          reasoning: parsed.reasoning || 'No reasoning provided',
          nextThoughtNeeded: parsed.nextThoughtNeeded,
          totalThoughts: parsed.totalThoughts
        });
      }
    }

    return steps;
  } catch (error) {
    console.warn('Sequential Thinking 단계 파싱 오류:', error);
    return [];
  }
};

export default function MCPToolsDisplay({ mcpTools, className = '' }: MCPToolsDisplayProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  // 안전성 검사
  if (!mcpTools || !Array.isArray(mcpTools) || mcpTools.length === 0) {
    return null;
  }

  // 유효한 도구만 필터링
  const validTools = mcpTools.filter(tool => 
    tool && 
    tool.toolName && 
    tool.serverId && 
    tool.result
  );

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

// Sequential Thinking 단계별 표시 컴포넌트
function SequentialThinkingStepsDisplay({ content }: { content: string }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const steps = parseSequentialThinkingSteps(content);

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  // 단계가 파싱되지 않은 경우 원본 내용 표시
  if (steps.length === 0) {
    return (
      <div>
        {/* JSON 형태인 경우 코드 블록으로 표시 */}
        {isValidJSON(content) ? (
          <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
            <pre className="whitespace-pre-wrap">
              {formatJSON(content)}
            </pre>
          </div>
        ) : (
          <div className="text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {content && content.length > 500 ? `${content.substring(0, 500)}...` : (content || 'No content')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-purple-600 font-medium mb-2">
        🧠 Sequential Thinking Process ({steps.length} steps)
      </div>
      
      {steps.map((step) => {
        const isExpanded = expandedSteps.has(step.stepNumber);
        
        return (
          <div key={step.stepNumber} className="border border-purple-200 rounded-md bg-purple-50">
            <button
              onClick={() => toggleStep(step.stepNumber)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-purple-600" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-purple-600" />
                )}
                <span className="text-sm font-medium text-purple-800">
                  Step {step.stepNumber}
                  {step.totalThoughts && ` / ${step.totalThoughts}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {step.nextThoughtNeeded ? (
                  <div className="w-2 h-2 bg-orange-400 rounded-full" title="More thinking needed" />
                ) : (
                  <div className="w-2 h-2 bg-green-400 rounded-full" title="Thinking complete" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 border-t border-purple-200">
                <div className="mt-2 space-y-2">
                  {/* 사고 내용 */}
                  <div>
                    <div className="text-xs font-medium text-purple-700 mb-1">💭 Thought:</div>
                    <div className="text-xs text-gray-800 bg-white rounded p-2 border">
                      {step.thought}
                    </div>
                  </div>

                  {/* 추론 과정 */}
                  {step.reasoning && (
                    <div>
                      <div className="text-xs font-medium text-purple-700 mb-1">🔍 Reasoning:</div>
                      <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 border">
                        {step.reasoning}
                      </div>
                    </div>
                  )}

                  {/* 메타 정보 */}
                  <div className="flex justify-between text-xs text-purple-600 pt-1 border-t border-purple-100">
                    <span>Step {step.stepNumber}</span>
                    <span>
                      {step.nextThoughtNeeded ? '🔄 Continuing...' : '✅ Complete'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-purple-800">
            🔧 MCP Tools Used ({mcpTools.length})
          </span>
        </div>
        {/* Sequential Thinking 특별 표시 */}
        {validTools.some(tool => tool.toolName === 'sequentialthinking') && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
            <span className="text-xs text-purple-700 font-medium">🧠 Sequential Thinking</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {validTools.map((tool, index) => {
          const toolId = `${tool.serverId}-${tool.toolName}-${index}`;
          const isExpanded = expandedTools.has(toolId);
          const isSuccess = tool.result.success;

          return (
            <div key={toolId} className={`bg-white rounded-md border ${tool.toolName === 'sequentialthinking' ? 'border-purple-200 bg-purple-50' : 'border-blue-100'}`}>
              <button
                onClick={() => toggleExpanded(toolId)}
                className={`w-full px-3 py-2 flex items-center justify-between transition-colors ${tool.toolName === 'sequentialthinking' ? 'hover:bg-purple-100' : 'hover:bg-blue-50'}`}
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
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {tool.toolName === 'sequentialthinking' && '🧠'}
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
                <div className={`px-3 pb-3 border-t ${tool.toolName === 'sequentialthinking' ? 'border-purple-100' : 'border-blue-100'}`}>
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
                                {content && content.type === 'text' && (
                                  <div>
                                    {/* Sequential Thinking을 단계별로 표시 */}
                                    {tool.toolName === 'sequentialthinking' && content.text ? (
                                      <SequentialThinkingStepsDisplay content={content.text} />
                                    ) : (
                                      <div className="text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {content.text && typeof content.text === 'string' && content.text.length > 500 
                                          ? `${content.text.substring(0, 500)}...` 
                                          : (content.text || 'No content')
                                        }
                                      </div>
                                    )}
                                  </div>
                                )}
                                {content && content.type !== 'text' && (
                                  <div className="text-gray-600 italic">
                                    [{content.type || 'unknown'} content]
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
                      <span>ID: {tool.result.id ? tool.result.id.substring(0, 8) + '...' : 'N/A'}</span>
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
      <div className="mt-2 pt-2 border-t border-purple-200">
        <div className="flex justify-between text-xs text-purple-700">
          <span>
            ✅ Success: {validTools.filter(t => t.result && t.result.success).length} / {validTools.length}
          </span>
          <span>
            ⏱️ Total time: {formatExecutionTime(
              validTools.reduce((sum, t) => sum + (t.result?.executionTime || 0), 0)
            )}
          </span>
        </div>
        {/* Sequential Thinking 특별 정보 */}
        {validTools.some(tool => tool.toolName === 'sequentialthinking') && (
          <div className="mt-1 text-xs text-purple-600">
            💭 Sequential thinking process completed with detailed analysis
          </div>
        )}
      </div>
    </div>
  );
}