'use client';

import { useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
import TypingIndicator from './TypingIndicator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('ollama-llama2');

  const availableModels = [
    { id: 'ollama-llama2', name: 'Llama 2 (Ollama)', type: 'ollama' },
    { id: 'ollama-codellama', name: 'Code Llama (Ollama)', type: 'ollama' },
    { id: 'gemini-pro', name: 'Gemini Pro', type: 'gemini' },
    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', type: 'gemini' },
  ];

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: API 호출 구현
      // 임시 응답
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `안녕하세요! "${content}"에 대한 답변입니다. 현재는 임시 응답이며, 실제 AI 모델 연동은 다음 단계에서 구현됩니다.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Model Selector */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <ModelSelector
          models={availableModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
        {isLoading && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="메시지를 입력하세요..."
        />
      </div>
    </div>
  );
}