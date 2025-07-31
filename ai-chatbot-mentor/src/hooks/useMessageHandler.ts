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
    return lowerContent.includes('단계별') && 
           (lowerContent.includes('분석') || 
            lowerContent.includes('생각') ||
            lowerContent.includes('순차적'));
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

    // 임시 어시스턴트 메시지 생성 (스트림용)
    const tempAssistantMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: getCurrentKoreanTime(),
    };

    setMessages(prev => [...prev, tempAssistantMessage]);

    try {
      // 현재 모델의 설정 가져오기
      const modelSettings = getModelSettings(state.selectedModel);

      // RAG 모드일 때는 ragInfo의 documentIds 사용, 그 외에는 기존 selectedDocumentIds 사용
      const documentIdsToUse = sessionMode === 'rag' && ragInfo 
        ? ragInfo.documentIds.map(id => parseInt(id))
        : selectedDocumentIds;

      // Sequential Thinking 감지
      if (isSequentialThinking(content)) {
        console.log('🤔 Sequential Thinking 감지됨, 스트리밍 모드 시작');
        
        // 스트리밍 방식 사용
        let streamingContent = '';
        let finalResponse: ChatResponse | null = null;

        await ApiClient.sendMessageStream({
          message: content,
          model: state.selectedModel,
          mode: sessionMode,
          sessionId: state.currentSessionId,
          mentorId: initialMentorId,
          documentIds: documentIdsToUse,
          files
        },
        // onChunk - 실시간으로 스트리밍 데이터 처리
        (chunk: string) => {
          try {
            // SSE 형식 파싱
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                if (jsonStr.trim() && jsonStr !== '[DONE]') {
                  const data = JSON.parse(jsonStr);
                  
                  // 실시간으로 사고 과정 표시
                  if (data.type === 'thinking_start') {
                    streamingContent = `✨ ${data.message}\n\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'step_start') {
                    streamingContent += `🔄 ${data.message}\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'mcp_call') {
                    streamingContent += `🔧 ${data.message}\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'mcp_result') {
                    streamingContent += `✅ ${data.message}\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'thinking_generation') {
                    streamingContent += `🤔 ${data.message}\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'step_complete') {
                    streamingContent += `\n### 🤔 단계 ${data.stepNumber}: 사고 과정\n\n${data.thought}\n\n**추론**: ${data.reasoning}\n\n---\n\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'final_generation_start') {
                    streamingContent += `🎯 ${data.message}\n\n`;
                    setStreamingMessage(streamingContent);
                  } else if (data.type === 'final_complete') {
                    streamingContent += `## 🎯 최종 답변\n\n${data.finalAnswer}\n\n---\n*총 ${data.totalSteps}단계, ${Math.round(data.processingTime / 1000)}초 소요*`;
                    setStreamingMessage(streamingContent);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('스트리밍 청크 파싱 오류:', e);
          }
        },
        // onComplete
        (response: ChatResponse) => {
          finalResponse = response;
          setIsStreaming(false);
          setStreamingMessage('');
        },
        // onError
        (error: Error) => {
          console.error('스트리밍 오류:', error);
          setError(error.message);
          setIsStreaming(false);
          setStreamingMessage('');
        });

        // 스트리밍 완료 후 처리
        if (finalResponse) {
          // 세션 ID 업데이트 (새 세션인 경우)
          if (!state.currentSessionId) {
            dispatch({ type: 'SET_SESSION_ID', payload: finalResponse.sessionId });
          }

          // 세션 업데이트 콜백 호출
          if (onSessionUpdate && finalResponse.sessionId) {
            const responseContent = finalResponse.content || finalResponse.response;
            onSessionUpdate(finalResponse.sessionId, {
              messageCount: messages.length + 2,
              lastMessage: {
                content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
                role: 'assistant',
                createdAt: new Date().toISOString()
              },
              updatedAt: new Date().toISOString()
            });
          }

          // 최종 메시지 업데이트
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.role === 'assistant') {
              updated[lastIndex] = {
                id: finalResponse.messageId ? finalResponse.messageId.toString() : `assistant-${Date.now()}`,
                role: 'assistant',
                content: streamingContent,
                timestamp: getCurrentKoreanTime(),
                metadata: {
                  artifacts: finalResponse.artifacts,
                  sources: finalResponse.sources,
                  modelSettings,
                  mcpTools: finalResponse.mcpTools,
                  isSequentialThinking: true
                }
              };
            }
            return updated;
          });

          // 아티팩트가 있으면 패널 열기
          if (finalResponse.artifacts && finalResponse.artifacts.length > 0) {
            setArtifacts(finalResponse.artifacts);
            setIsArtifactPanelOpen(true);
          }
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

        // 최종 어시스턴트 메시지로 업데이트
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex]?.role === 'assistant') {
            updated[lastIndex] = {
              id: response.messageId ? response.messageId.toString() : `assistant-${Date.now()}`,
              role: 'assistant',
              content: response.content || response.response,
              timestamp: getCurrentKoreanTime(),
              metadata: {
                artifacts: response.artifacts,
                sources: response.sources,
                modelSettings,
                mcpTools: response.mcpTools
              }
            };
          }
          return updated;
        });

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
      
      // 임시 메시지 제거
      setMessages(prev => prev.slice(0, -1));
      
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