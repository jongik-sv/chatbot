// components/gpt/GPTChatInterface.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    chunksUsed: number;
    sources: Array<{
      documentId: string;
      filename: string;
      relevance: number;
    }>;
    relevantChunks: Array<{
      content: string;
      score: number;
      source: string;
    }>;
  };
}

interface GPTChatInterfaceProps {
  gptId: string;
  gptName: string;
  userId: number;
  systemPrompt?: string;
}

export default function GPTChatInterface({
  gptId,
  gptName,
  userId,
  systemPrompt
}: GPTChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [maxContextChunks, setMaxContextChunks] = useState(5);
  const [contextThreshold, setContextThreshold] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 메시지 전송
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/gpts/${gptId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          userId,
          includeContext,
          maxContextChunks,
          contextThreshold
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.response,
          timestamp: new Date(),
          context: result.data.context
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(result.error || '응답 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      setError('메시지 전송 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 대화 초기화
  const clearChat = () => {
    if (confirm('대화를 초기화하시겠습니까?')) {
      setMessages([]);
      setError('');
    }
  };

  // 메시지 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">{gptName}</h2>
          {systemPrompt && (
            <p className="text-sm text-gray-600 mt-1 max-w-md truncate">
              {systemPrompt}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            설정
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
          >
            초기화
          </Button>
        </div>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <Card className="m-4 p-4">
          <h3 className="font-semibold mb-3">채팅 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeContext}
                  onChange={(e) => setIncludeContext(e.target.checked)}
                  className="mr-2"
                />
                지식 베이스 활용
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                최대 컨텍스트 청크: {maxContextChunks}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={maxContextChunks}
                onChange={(e) => setMaxContextChunks(parseInt(e.target.value))}
                className="w-full"
                disabled={!includeContext}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                관련성 임계값: {contextThreshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={contextThreshold}
                onChange={(e) => setContextThreshold(parseFloat(e.target.value))}
                className="w-full"
                disabled={!includeContext}
              />
            </div>
          </div>
        </Card>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>안녕하세요! 무엇을 도와드릴까요?</p>
            {includeContext && (
              <p className="text-sm mt-2">지식 베이스를 활용한 답변을 제공합니다.</p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* 컨텍스트 정보 표시 */}
                {message.context && message.context.chunksUsed > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-sm opacity-75">
                      <div className="flex items-center gap-2 mb-2">
                        <span>📚 {message.context.chunksUsed}개 문서 참조</span>
                      </div>
                      
                      {/* 참조 소스 */}
                      {message.context.sources.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium">참조 문서:</div>
                          {message.context.sources.map((source, index) => (
                            <div key={index} className="text-xs">
                              • {source.filename} (관련도: {Math.round(source.relevance * 100)}%)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-50 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-gray-600">응답 생성 중...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            {isLoading ? '전송 중...' : '전송'}
          </Button>
        </div>
        
        {includeContext && (
          <div className="text-xs text-gray-500 mt-2">
            지식 베이스를 활용한 답변 • 최대 {maxContextChunks}개 청크 • 임계값 {contextThreshold}
          </div>
        )}
      </div>
    </div>
  );
}