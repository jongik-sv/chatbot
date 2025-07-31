'use client';

import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
// TypingIndicator는 MessageList 내에서 처리
import { ApiClient } from '../../lib/api';
import { useChatContext } from '../../contexts/ChatContext';
import { DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon, FolderIcon } from '@heroicons/react/24/outline';
import { ArtifactPanel } from '../artifacts/ArtifactPanel';

// Custom hooks
import { useChatSession } from '../../hooks/useChatSession';
import { useDocumentInfo } from '../../hooks/useDocumentInfo';
import { useArtifacts } from '../../hooks/useArtifacts';
import { useMessageHandler } from '../../hooks/useMessageHandler';

interface ChatInterfaceProps {
  className?: string;
  sessionId?: number;
  initialMode?: string;
  initialMentorId?: number;
  selectedDocumentIds?: number[];
  mbtiContext?: {
    userType: string;
    mentorType: string;
    compatibility?: any;
  };
  onSessionUpdate?: (sessionId: number, updates: any) => void;
}

export default function ChatInterface({
  className = '',
  sessionId,
  initialMode,
  initialMentorId,
  selectedDocumentIds,
  mbtiContext,
  onSessionUpdate
}: ChatInterfaceProps) {
  const [error, setError] = useState<string | null>(null);
  const { state, dispatch, switchModel } = useChatContext();

  // Custom hooks
  const { messages, setMessages, sessionMode, ragInfo, loadSession } = useChatSession(sessionId, initialMode);
  const { documentInfo } = useDocumentInfo(selectedDocumentIds);
  const {
    artifacts,
    setArtifacts,
    isArtifactPanelOpen,
    setIsArtifactPanelOpen,
    artifactPanelWidth,
    loadSessionArtifacts,
    handleArtifactCopy,
    handleArtifactDownload,
    handleArtifactUpdate,
    handleArtifactDelete,
    toggleArtifactPanel,
    handlePanelWidthChange
  } = useArtifacts();

  const { streamingMessage, isStreaming, handleSendMessage } = useMessageHandler({
    messages,
    setMessages,
    sessionMode,
    ragInfo,
    initialMentorId,
    selectedDocumentIds,
    setArtifacts,
    setIsArtifactPanelOpen,
    onSessionUpdate,
    setError
  });

  // 컴포넌트 마운트 시 모델 목록 로드
  useEffect(() => {
    loadAvailableModels();
  }, []);

  // 세션 아티팩트 로드
  useEffect(() => {
    if (sessionId) {
      loadSessionArtifacts(sessionId);
    }
  }, [sessionId]);

  const loadAvailableModels = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await ApiClient.getAvailableModels();
      if (response.success) {
        dispatch({ type: 'SET_MODELS', payload: response.models });
      }
    } catch (error) {
      console.error('모델 목록 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '모델 목록을 불러올 수 없습니다.' });
      setError('모델 목록을 불러올 수 없습니다.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const hasArtifacts = artifacts.length > 0;
  const chatWidth = hasArtifacts && isArtifactPanelOpen ? 100 - artifactPanelWidth : 100;

  return (
    <div className={`flex h-full overflow-hidden ${className}`}>
      {/* 메인 채팅 영역 */}
      <div
        className="flex flex-col transition-all duration-300 relative"
        style={{ width: `${chatWidth}%` }}
      >
        {/* Error Banner */}
        {error && (
          <div className="flex-shrink-0 bg-red-50 border-b border-red-200 p-3">
            <div className="flex">
              <div className="text-sm text-red-700">
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Model Selector */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <ModelSelector
            models={state.availableModels}
            selectedModel={state.selectedModel}
            onModelChange={switchModel}
            disabled={state.isLoading}
          />
        </div>

        {/* Document Info Banner */}
        {documentInfo && sessionMode === 'document' && (
          <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 p-3">
            <div className="flex items-center text-sm text-blue-800">
              <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="font-medium">선택된 문서:</span>
              <span className="ml-1 truncate">{documentInfo.name}</span>
            </div>
          </div>
        )}

        {/* RAG Info Banner */}
        {ragInfo && sessionMode === 'rag' && (
          <div className="flex-shrink-0 bg-green-50 border-b border-green-200 p-3">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-green-800">
                <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="font-medium">프로젝트:</span>
                <span className="ml-1 font-semibold">{ragInfo.projectName}</span>
              </div>
              <div className="flex items-start text-sm text-green-800">
                <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span className="font-medium">선택된 문서 ({ragInfo.documentTitles.length}개):</span>
                <div className="ml-1 flex flex-wrap gap-1">
                  {ragInfo.documentTitles.map((title, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <MessageList
            messages={messages}
            mentorId={initialMentorId}
            isStreaming={isStreaming}
            streamingMessage={streamingMessage}
          />
          {/* 로딩 인디케이터는 메시지 목록 내에서 처리 */}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={state.isLoading}
            placeholder="메시지를 입력하세요..."
          />
        </div>
      </div>

      {/* 아티팩트 토글 버튼 */}
      {hasArtifacts && (
        <button
          onClick={toggleArtifactPanel}
          className="absolute top-1/2 right-0 transform -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-l-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
          title={isArtifactPanelOpen ? "아티팩트 패널 닫기" : "아티팩트 패널 열기"}
        >
          {isArtifactPanelOpen ? (
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          )}
        </button>
      )}

      {/* 오른쪽 아티팩트 패널 */}
      {hasArtifacts && isArtifactPanelOpen && (
        <div
          className="border-l border-gray-200 bg-gray-50 flex flex-col transition-all duration-300 relative"
          style={{ width: `${artifactPanelWidth}%` }}
        >
          {/* 크기 조절 핸들 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 bg-gray-300 transition-colors"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = artifactPanelWidth;
              const containerRect = e.currentTarget.closest('.flex')?.getBoundingClientRect();

              const handleMouseMove = (e: MouseEvent) => {
                if (!containerRect) return;
                const deltaX = startX - e.clientX;
                const deltaPercent = (deltaX / containerRect.width) * 100;
                handlePanelWidthChange(startWidth + deltaPercent);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* 패널 헤더 */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">아티팩트</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePanelWidthChange(25)}
                    className={`px-2 py-1 text-xs rounded ${artifactPanelWidth === 25 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    25%
                  </button>
                  <button
                    onClick={() => handlePanelWidthChange(33)}
                    className={`px-2 py-1 text-xs rounded ${artifactPanelWidth === 33 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    33%
                  </button>
                  <button
                    onClick={() => handlePanelWidthChange(50)}
                    className={`px-2 py-1 text-xs rounded ${artifactPanelWidth === 50 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    50%
                  </button>
                </div>
                <button
                  onClick={toggleArtifactPanel}
                  className="p-1 text-gray-600 hover:text-gray-800"
                  title="패널 닫기"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 패널 내용 */}
          <div className="flex-1 overflow-hidden">
            <ArtifactPanel
              artifacts={artifacts}
              onCopy={handleArtifactCopy}
              onDownload={handleArtifactDownload}
              onUpdate={handleArtifactUpdate}
              onDelete={handleArtifactDelete}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}