'use client';

import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
import TypingIndicator from './TypingIndicator';
import { ApiClient } from '../../lib/api';
import { LLMModel, Message as MessageType } from '../../types';
import { useChatContext } from '../../contexts/ChatContext';

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
        timestamp: new Date(msg.createdAt),
        metadata: msg.metadata
      }));
      setMessages(loadedMessages);
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
      
      // 세션의 모델 설정
      if (response.session.modelUsed) {
        switchModel(response.session.modelUsed);
      }
    } catch (error) {
      console.error('세션 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '대화 기록을 불러올 수 없습니다.' });
      setError('대화 기록을 불러올 수 없습니다.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
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
        mode: initialMode || 'chat',
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
        onSessionUpdate(response.sessionId, {
          messageCount: messages.length + 2, // user + assistant message
          lastMessage: {
            content: response.content.substring(0, 100) + (response.content.length > 100 ? '...' : ''),
            role: 'assistant',
            createdAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        });
      }

      const assistantMessage: Message = {
        id: response.messageId.toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          artifacts: response.artifacts,
          sources: response.sources,
          modelSettings
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
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
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
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
  );
}