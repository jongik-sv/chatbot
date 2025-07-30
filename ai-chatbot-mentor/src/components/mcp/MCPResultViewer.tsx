'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  ServerIcon,
  CommandLineIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { MCPToolResult, MCPContent } from '@/types/mcp';

interface MCPResultViewerProps {
  result: MCPToolResult;
  toolName: string;
  serverName: string;
  onClose?: () => void;
  className?: string;
}

export function MCPResultViewer({
  result,
  toolName,
  serverName,
  onClose,
  className = ''
}: MCPResultViewerProps) {
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  const handleCopyContent = async (content: string, contentType: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(contentType);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  const renderContent = (content: MCPContent, index: number) => {
    switch (content.type) {
      case 'text':
        return (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">텍스트 결과</span>
              </div>
              <button
                onClick={() => handleCopyContent(content.text || '', `text-${index}`)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
              >
                <DocumentDuplicateIcon className="h-3 w-3" />
                <span>{copiedContent === `text-${index}` ? '복사됨!' : '복사'}</span>
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-3 rounded border">
                {content.text}
              </pre>
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <InformationCircleIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">이미지</span>
                {content.mimeType && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {content.mimeType}
                  </span>
                )}
              </div>
            </div>
            {content.data && (
              <div className="mt-2">
                <img
                  src={`data:${content.mimeType || 'image/png'};base64,${content.data}`}
                  alt="MCP Result"
                  className="max-w-full h-auto rounded border"
                />
              </div>
            )}
          </div>
        );

      case 'resource':
        return (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">리소스</span>
                {content.mimeType && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {content.mimeType}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {content.data && (
                <div className="mt-2 p-3 bg-white rounded border">
                  <pre className="whitespace-pre-wrap text-sm">
                    {content.data}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">
              알 수 없는 콘텐츠 유형: {content.type}
            </div>
            <pre className="mt-2 text-xs text-gray-600">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* 헤더 */}
      <div className={`px-4 py-3 border-b border-gray-200 ${
        result.success 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {result.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-600" />
            )}
            
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? '실행 성공' : '실행 실패'}
                </span>
                <span className="text-xs text-gray-500">#{result.id}</span>
              </div>
              
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1">
                  <CommandLineIcon className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">{toolName}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <ServerIcon className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">{serverName}</span>
                </div>
                
                {result.executionTime && (
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600">{result.executionTime}ms</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="p-4">
        {result.success && result.content && result.content.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-700 mb-3">
              <span className="font-medium">결과:</span>
              <span className="ml-2 text-gray-500">
                {result.content.length}개의 콘텐츠
              </span>
            </div>
            
            {result.content.map((content, index) => renderContent(content, index))}
          </div>
        ) : result.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 mb-1">오류 발생</h4>
                <p className="text-sm text-red-700">{result.error}</p>
                
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => handleCopyContent(result.error || '', 'error')}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                  >
                    <DocumentDuplicateIcon className="h-3 w-3" />
                    <span>{copiedContent === 'error' ? '복사됨!' : '오류 복사'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <InformationCircleIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">결과 콘텐츠가 없습니다.</p>
          </div>
        )}

        {/* 메타데이터 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">실행 시간:</span>
              <span className="ml-1">{new Date(result.timestamp).toLocaleString()}</span>
            </div>
            
            <div>
              <span className="font-medium">도구 호출 ID:</span>
              <span className="ml-1 font-mono">{result.toolCallId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}