'use client';

import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
import TypingIndicator from './TypingIndicator';
import { ApiClient } from '../../lib/api';
import { LLMModel, Message as MessageType } from '../../types';
import { useChatContext } from '../../contexts/ChatContext';
import { getCurrentKoreanTime } from '../../utils/dateUtils';
import { DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ArtifactPanel } from '../artifacts/ArtifactPanel';
import { Artifact } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatInterfaceProps {
  className?: string;
  sessionId?: number;
  initialMode?: string;
  initialMentorId?: number;
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
  mbtiContext,
  onSessionUpdate
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<string>(initialMode || 'chat');
  const [documentInfo, setDocumentInfo] = useState<{ name: string; id?: number } | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState<boolean>(false);
  const [artifactPanelWidth, setArtifactPanelWidth] = useState<number>(33); // percentage
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const { state, dispatch, getModelSettings, switchModel } = useChatContext();

  // 컴포넌트 마운트 시 모델 목록 로드
  useEffect(() => {
    loadAvailableModels();
  }, []);

  // 기존 세션이 있으면 로드
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
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

  const loadSession = async (sessionId: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await ApiClient.getSession(sessionId);
      const loadedMessages = response.messages.map((msg: MessageType) => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt), // 실제 메시지 생성 시간 사용
        metadata: msg.metadata
      }));
      setMessages(loadedMessages);
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
      
      // 세션의 모드 설정
      if (response.session.mode) {
        setSessionMode(response.session.mode);
      }
      
      // 세션의 모델 설정
      if (response.session.modelUsed) {
        switchModel(response.session.modelUsed);
      }

      // 문서 기반 세션인 경우 문서 정보 추출
      if (response.session.mode === 'document' || response.session.mode === 'rag') {
        extractDocumentInfo(loadedMessages);
      }

      // 세션의 아티팩트 로드
      await loadSessionArtifacts(sessionId);
    } catch (error) {
      console.error('세션 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '대화 기록을 불러올 수 없습니다.' });
      setError('대화 기록을 불러올 수 없습니다.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const extractDocumentInfo = (messages: Message[]) => {
    // 메시지 메타데이터에서 문서 정보 추출
    for (const message of messages) {
      if (message.metadata) {
        // RAG 메타데이터에서 문서 정보 찾기
        if (message.metadata.documentIds && Array.isArray(message.metadata.documentIds)) {
          fetchDocumentNames(message.metadata.documentIds);
          return;
        }
        
        // 소스 정보에서 문서 이름 추출
        if (message.metadata.sources && Array.isArray(message.metadata.sources)) {
          const source = message.metadata.sources[0];
          if (source && source.documentTitle) {
            setDocumentInfo({ name: source.documentTitle });
            return;
          }
        }
      }
    }

    // 메시지 내용에서 "선택된 문서:" 패턴 찾기
    const documentPattern = /선택된 문서:\s*(.+?)(?:\n|$)/;
    for (const message of messages) {
      if (message.role === 'user' && message.content) {
        const match = message.content.match(documentPattern);
        if (match) {
          setDocumentInfo({ name: match[1].trim() });
          return;
        }
      }
    }

    // 첫 번째 사용자 메시지에서 문서 정보 추출 (fallback)
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage?.metadata?.documentIds) {
      const documentIds = firstUserMessage.metadata.documentIds;
      if (Array.isArray(documentIds) && documentIds.length > 0) {
        fetchDocumentNames(documentIds);
      }
    }
  };

  const fetchDocumentNames = async (documentIds: number[]) => {
    try {
      // 첫 번째 문서의 정보만 가져오기 (대부분 하나의 문서만 사용)
      const documentId = documentIds[0];
      const response = await fetch(`/api/documents/${documentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.document) {
          setDocumentInfo({ 
            name: data.document.filename, 
            id: data.document.id 
          });
        }
      }
    } catch (error) {
      console.error('문서 정보 가져오기 실패:', error);
    }
  };

  const loadSessionArtifacts = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/artifacts?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setArtifacts(data.data);
          // 아티팩트가 있으면 패널을 열어둠
          if (data.data.length > 0) {
            setIsArtifactPanelOpen(true);
          }
        }
      }
    } catch (error) {
      console.error('아티팩트 로드 실패:', error);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: getCurrentKoreanTime(),
    };

    setMessages(prev => [...prev, userMessage]);
    dispatch({ type: 'SET_LOADING', payload: true });
    setError(null);

    try {
      // 현재 모델의 설정 가져오기
      const modelSettings = getModelSettings(state.selectedModel);
      
      const response = await ApiClient.sendMessage({
        message: content,
        model: state.selectedModel,
        mode: sessionMode,
        sessionId: state.currentSessionId,
        mentorId: initialMentorId,
        files
      });

      // 세션 ID 업데이트 (새 세션인 경우)
      if (!state.currentSessionId) {
        dispatch({ type: 'SET_SESSION_ID', payload: response.sessionId });
      }

      // 세션 업데이트 콜백 호출
      if (onSessionUpdate && response.sessionId) {
        const responseContent = response.content || response.response;
        onSessionUpdate(response.sessionId, {
          messageCount: messages.length + 2, // user + assistant message
          lastMessage: {
            content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
            role: 'assistant',
            createdAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        });
      }

      const assistantMessage: Message = {
        id: response.messageId.toString(),
        role: 'assistant',
        content: response.content || response.response, // RAG 엔드포인트는 response 필드 사용
        timestamp: getCurrentKoreanTime(),
        metadata: {
          artifacts: response.artifacts,
          sources: response.sources,
          modelSettings
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 새로 생성된 아티팩트가 있으면 artifacts 상태에 추가
      if (response.artifacts && Array.isArray(response.artifacts)) {
        setArtifacts(prev => {
          const newArtifacts = response.artifacts.filter((newArtifact: Artifact) => 
            !prev.some(existing => existing.id === newArtifact.id)
          );
          return [...prev, ...newArtifacts];
        });
        
        // 아티팩트가 새로 생성되면 패널을 열어둠
        if (response.artifacts.length > 0) {
          setIsArtifactPanelOpen(true);
        }
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMsg = error instanceof Error ? error.message : '메시지 전송에 실패했습니다.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      setError(errorMsg);
      
      // 오류 메시지 표시
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
        timestamp: getCurrentKoreanTime(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 아티팩트 관련 콜백 함수들
  const handleArtifactCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 성공 알림 (선택적)
      console.log('아티팩트 내용이 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      // 폴백: 텍스트 선택
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleArtifactDownload = (artifact: Artifact) => {
    const fileExtension = artifact.language || 'txt';
    const mimeTypes: Record<string, string> = {
      'javascript': 'text/javascript',
      'typescript': 'text/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'xml': 'text/xml',
      'markdown': 'text/markdown',
      'python': 'text/x-python',
      'java': 'text/x-java-source',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc'
    };

    const mimeType = mimeTypes[fileExtension] || 'text/plain';
    const fileName = `${artifact.title.replace(/[^\w\s-]/g, '')}.${fileExtension}`;
    
    const blob = new Blob([artifact.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleArtifactUpdate = async (artifactId: number, updates: Partial<Artifact>) => {
    try {
      // API를 통해 아티팩트 업데이트
      const response = await fetch(`/api/artifacts/${artifactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // artifacts 상태 업데이트
        setArtifacts(prev => prev.map(artifact =>
          artifact.id === artifactId ? { ...artifact, ...updates } : artifact
        ));
        
        // 메시지 메타데이터도 함께 업데이트
        setMessages(prev => prev.map(message => ({
          ...message,
          metadata: {
            ...message.metadata,
            artifacts: message.metadata?.artifacts?.map((artifact: Artifact) =>
              artifact.id === artifactId ? { ...artifact, ...updates } : artifact
            )
          }
        })));
      } else {
        console.error('아티팩트 업데이트 실패');
      }
    } catch (error) {
      console.error('아티팩트 업데이트 오류:', error);
    }
  };

  const handleArtifactDelete = async (artifactId: number) => {
    try {
      const response = await fetch(`/api/artifacts/${artifactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // artifacts 상태에서 제거
        setArtifacts(prev => prev.filter(artifact => artifact.id !== artifactId));
        
        // 메시지 메타데이터에서도 제거
        setMessages(prev => prev.map(message => ({
          ...message,
          metadata: {
            ...message.metadata,
            artifacts: message.metadata?.artifacts?.filter((artifact: Artifact) => artifact.id !== artifactId)
          }
        })));
      } else {
        console.error('아티팩트 삭제 실패');
      }
    } catch (error) {
      console.error('아티팩트 삭제 오류:', error);
    }
  };

  const toggleArtifactPanel = () => {
    setIsArtifactPanelOpen(!isArtifactPanelOpen);
  };

  const handlePanelWidthChange = (width: number) => {
    setArtifactPanelWidth(Math.max(20, Math.min(60, width))); // 20-60% 제한
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
        {documentInfo && (sessionMode === 'document' || sessionMode === 'rag') && (
          <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 p-3">
            <div className="flex items-center text-sm text-blue-800">
              <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="font-medium">선택된 문서:</span>
              <span className="ml-1 truncate">{documentInfo.name}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <MessageList messages={messages} mentorId={initialMentorId} />
          {state.isLoading && <TypingIndicator />}
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
                  className="p-1 text-gray-400 hover:text-gray-600"
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