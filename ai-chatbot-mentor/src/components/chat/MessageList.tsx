'use client';

import { useEffect, useRef } from 'react';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { useChatContext } from '@/contexts/ChatContext';
import { formatChatTime } from '../../utils/dateUtils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface MessageListProps {
  messages: Message[];
  mentorId?: number;
}

export default function MessageList({ messages, mentorId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state } = useChatContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            새로운 대화를 시작하세요
          </h3>
          <p className="text-gray-500">
            AI 멘토와 함께 학습하고 성장해보세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
      <div className="p-4 space-y-4 min-h-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-3xl ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <UserIcon className="w-5 h-5" />
                  ) : (
                    <CpuChipIcon className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Message content */}
              <div className="flex flex-col">
                <div
                  className={`px-4 py-2 rounded-lg shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatChatTime(message.timestamp)}
                  </div>
                </div>
                
                {/* 피드백 버튼 (멘토 응답에만 표시) */}
                {message.role === 'assistant' && mentorId && state.currentSessionId && (
                  <div className="flex justify-end mt-1">
                    <FeedbackButton
                      mentorId={mentorId.toString()}
                      sessionId={state.currentSessionId.toString()}
                      messageId={message.id}
                      onFeedbackSubmitted={() => {
                        // 피드백 제출 후 처리 (선택사항)
                        console.log('피드백이 제출되었습니다.');
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}