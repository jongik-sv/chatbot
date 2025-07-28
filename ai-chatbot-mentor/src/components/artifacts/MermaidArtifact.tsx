'use client';

import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { 
  PuzzlePieceIcon, 
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

interface MermaidArtifactProps {
  content: string;
  className?: string;
}

export function MermaidArtifact({
  content,
  className = ''
}: MermaidArtifactProps) {
  const [viewMode, setViewMode] = useState<'diagram' | 'source'>('diagram');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const diagramRef = useRef<HTMLDivElement>(null);
  const mermaidId = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Mermaid 초기화
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false
      },
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        fontFamily: 'ui-sans-serif, system-ui',
        fontSize: 11,
        gridLineStartPadding: 35,
        bottomPadding: 25,
        leftPadding: 75,
        topPadding: 50,
        rightPadding: 25
      }
    });
  }, []);

  useEffect(() => {
    if (viewMode === 'diagram' && diagramRef.current) {
      renderDiagram();
    }
  }, [content, viewMode]);

  const renderDiagram = async () => {
    if (!diagramRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // 기존 다이어그램 제거
      diagramRef.current.innerHTML = '';

      // Mermaid 다이어그램 렌더링
      const { svg } = await mermaid.render(mermaidId.current, content);
      diagramRef.current.innerHTML = svg;
      
      setIsLoading(false);
    } catch (err) {
      console.error('Mermaid 렌더링 오류:', err);
      setError(err instanceof Error ? err.message : '다이어그램을 렌더링할 수 없습니다.');
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  const handleDownload = () => {
    const svgElement = diagramRef.current?.querySelector('svg');
    if (svgElement) {
      // SVG를 PNG로 변환하여 다운로드
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = 'mermaid-diagram.png';
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const getDiagramType = () => {
    const firstLine = content.trim().split('\n')[0].toLowerCase();
    
    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
      return '플로우차트';
    } else if (firstLine.startsWith('sequencediagram')) {
      return '시퀀스 다이어그램';
    } else if (firstLine.startsWith('classdiagram')) {
      return '클래스 다이어그램';
    } else if (firstLine.startsWith('statediagram')) {
      return '상태 다이어그램';
    } else if (firstLine.startsWith('erdiagram')) {
      return 'ER 다이어그램';
    } else if (firstLine.startsWith('gantt')) {
      return '간트 차트';
    } else if (firstLine.startsWith('pie')) {
      return '파이 차트';
    } else if (firstLine.startsWith('journey')) {
      return '사용자 여정';
    } else if (firstLine.startsWith('gitgraph')) {
      return 'Git 그래프';
    }
    
    return 'Mermaid 다이어그램';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 다이어그램 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <PuzzlePieceIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {getDiagramType()}
          </span>
          <span className="text-xs text-gray-500">
            {content.split('\n').length} 줄
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('diagram')}
              className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                viewMode === 'diagram'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <EyeIcon className="h-3 w-3 inline mr-1" />
              다이어그램
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'source'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CodeBracketIcon className="h-3 w-3 inline mr-1" />
              소스
            </button>
          </div>
          
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={viewMode === 'source' || error !== null}
          >
            <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
            PNG 다운로드
          </button>
          
          <button
            onClick={handleCopy}
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
            {copied ? '복사됨!' : '복사'}
          </button>
        </div>
      </div>

      {/* 다이어그램 내용 */}
      <div className="relative">
        {viewMode === 'diagram' ? (
          <div className="p-4">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">다이어그램 렌더링 중...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex items-center justify-center h-64 text-red-600">
                <div className="text-center">
                  <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                  <h3 className="mt-2 text-sm font-medium text-red-900">렌더링 오류</h3>
                  <p className="mt-1 text-sm text-red-500">{error}</p>
                </div>
              </div>
            )}
            
            <div 
              ref={diagramRef}
              className={`mermaid-diagram ${isLoading || error ? 'hidden' : ''}`}
              style={{ 
                textAlign: 'center',
                minHeight: '200px'
              }}
            />
          </div>
        ) : (
          <pre className="p-4 text-sm font-mono text-gray-800 bg-gray-50 overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>

      {/* 다이어그램 정보 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {content.length} 문자, {content.split('\n').length} 줄
          </span>
          <span>
            타입: {getDiagramType()}
          </span>
        </div>
      </div>

      {/* 도움말 */}
      <details className="border-t border-gray-200">
        <summary className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
          Mermaid 문법 도움말
        </summary>
        <div className="p-4 bg-gray-50 text-xs text-gray-600">
          <div className="space-y-2">
            <div>
              <strong>플로우차트:</strong> <code>flowchart TD</code> 또는 <code>graph TD</code>
            </div>
            <div>
              <strong>시퀀스 다이어그램:</strong> <code>sequenceDiagram</code>
            </div>
            <div>
              <strong>클래스 다이어그램:</strong> <code>classDiagram</code>
            </div>
            <div>
              <strong>상태 다이어그램:</strong> <code>stateDiagram-v2</code>
            </div>
            <div>
              <strong>간트 차트:</strong> <code>gantt</code>
            </div>
            <div>
              <strong>파이 차트:</strong> <code>pie title 제목</code>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}