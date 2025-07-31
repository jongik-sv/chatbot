// hooks/useMessageHandler.ts - 메시지 전송 및 스트리밍 처리 로직
import { useState } from 'react';
import { ApiClient } from '../lib/api';
import { ChatResponse } from '../types';
import { useChatContext } from '../contexts/ChatContext';
import { getCurrentKoreanTime } from '../utils/dateUtils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface RagInfo {
  projectId: string;
  projectName: string;
  documentIds: string[];
  documentTitles: string[];
}

interface UseMessageHandlerProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessionMode: string;
  ragInfo: RagInfo | null;
  initialMentorId?: number;
  selectedDocumentIds?: number[];
  setArtifacts: React.Dispatch<React.SetStateAction<any[]>>;
  setIsArtifactPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSessionUpdate?: (sessionId: number, updates: any) => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useMessageHandler({
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
}: UseMessageHandlerProps) {
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const { state, dispatch, getModelSettings } = useChatContext();

  // Sequential Thinking 감지 함수
  const isSequentialThinking = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    console.log('🔍 클라이언트 Sequential Thinking 감지 확인:', {
      content: content.substring(0, 50),
      lowerContent: lowerContent.substring(0, 50),
      includes단계별: lowerContent.includes('단계별'),
      includes분석: lowerContent.includes('분석'),
      includes생각: lowerContent.includes('생각'),
      includes순차적: lowerContent.includes('순차적')
    });
    
    return lowerContent.includes('단계별') || 
           lowerContent.includes('순차적') ||
           (lowerContent.includes('복잡한') && lowerContent.includes('분석')) ||
           (lowerContent.includes('체계적으로') && lowerContent.includes('분석'));
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
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // 현재 모델의 설정 가져오기
      const modelSettings = getModelSettings(state.selectedModel);

      // RAG 모드일 때는 ragInfo의 documentIds 사용, 그 외에는 기존 selectedDocumentIds 사용
      const documentIdsToUse = sessionMode === 'rag' && ragInfo 
        ? ragInfo.documentIds.map(id => parseInt(id))
        : selectedDocumentIds;

      // Sequential Thinking 감지 - 일반 응답으로 처리
      if (isSequentialThinking(content)) {
        console.log('🤔 Sequential Thinking 감지됨, 일반 응답 모드로 처리');
        
        // 일반 응답 방식 사용 (스트리밍 비활성화)
        const response = await ApiClient.sendMessage({
          message: content,
          model: state.selectedModel,
          mode: sessionMode,
          sessionId: state.currentSessionId,
          mentorId: initialMentorId,
          documentIds: documentIdsToUse,
          files
        });

        console.log('📥 서버 응답 수신:', {
          contentLength: response.content?.length || 0,
          contentPreview: response.content?.substring(0, 100) || 'No content',
          mcpToolsCount: response.mcpTools?.length || 0,
          sessionId: response.sessionId,
          messageId: response.messageId
        });

        setIsStreaming(false);
        setStreamingMessage('');

        // 세션 ID 업데이트 (새 세션인 경우)
        if (!state.currentSessionId) {
          dispatch({ type: 'SET_SESSION_ID', payload: response.sessionId });
        }

        // 세션 업데이트 콜백 호출
        if (onSessionUpdate && response.sessionId) {
          const responseContent = response.content || response.response;
          onSessionUpdate(response.sessionId, {
            messageCount: messages.length + 2,
            lastMessage: {
              content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
              role: 'assistant',
              createdAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          });
        }

        // 어시스턴트 메시지 추가 (임시 메시지 없이 바로 추가)
        const assistantMessage: Message = {
          id: response.messageId ? response.messageId.toString() : `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content || response.response || '응답을 받지 못했습니다.',
          timestamp: getCurrentKoreanTime(),
          metadata: {
            artifacts: response.artifacts,
            sources: response.sources,
            modelSettings,
            mcpTools: response.mcpTools, // MCP 도구 정보 포함
            isSequentialThinking: true
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // 아티팩트가 있으면 패널 열기
        if (response.artifacts && response.artifacts.length > 0) {
          setArtifacts(response.artifacts);
          setIsArtifactPanelOpen(true);
        }
      } else {
        // 일반 요청-응답 방식 사용
        const response = await ApiClient.sendMessage({
          message: content,
          model: state.selectedModel,
          mode: sessionMode,
          sessionId: state.currentSessionId,
          mentorId: initialMentorId,
          documentIds: documentIdsToUse,
          files
        });

        setIsStreaming(false);
        setStreamingMessage('');

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
            updatedAt: new Date().toISOString(),
            // RAG 정보 포함
            ...(sessionMode === 'rag' && ragInfo && {
              ragMetadata: {
                projectId: ragInfo.projectId,
                projectName: ragInfo.projectName,
                documentIds: ragInfo.documentIds,
                documentTitles: ragInfo.documentTitles
              }
            })
          });
        }

        // 어시스턴트 메시지 추가 (임시 메시지 없이 바로 추가)
        const assistantMessage: Message = {
          id: response.messageId ? response.messageId.toString() : `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content || response.response || '응답을 받지 못했습니다.',
          timestamp: getCurrentKoreanTime(),
          metadata: {
            artifacts: response.artifacts,
            sources: response.sources,
            modelSettings,
            mcpTools: response.mcpTools // MCP 도구 정보 포함
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // 사용자 메시지에 MCP 도구 정보 추가 (있는 경우)
        if (response.mcpTools && response.mcpTools.length > 0) {
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastUserMessageIndex = updatedMessages.length - 2; // assistant 메시지 바로 전
            if (updatedMessages[lastUserMessageIndex]?.role === 'user') {
              updatedMessages[lastUserMessageIndex] = {
                ...updatedMessages[lastUserMessageIndex],
                metadata: {
                  ...updatedMessages[lastUserMessageIndex].metadata,
                  mcpTools: response.mcpTools
                }
              };
            }
            return updatedMessages;
          });
        }

        // 아티팩트가 있으면 패널 열기
        if (response.artifacts && response.artifacts.length > 0) {
          setArtifacts(response.artifacts);
          setIsArtifactPanelOpen(true);
        }
      }

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      setIsStreaming(false);
      setStreamingMessage('');
      
      // 오류 메시지 추가
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '응답을 받을 수 없습니다. 다시 시도해주세요.',
        timestamp: getCurrentKoreanTime(),
        metadata: {
          isError: true
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      
      console.error('메시지 전송 실패:', error);
      setError(error instanceof Error ? error.message : '메시지 전송에 실패했습니다.');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return {
    streamingMessage,
    isStreaming,
    handleSendMessage
  };
}