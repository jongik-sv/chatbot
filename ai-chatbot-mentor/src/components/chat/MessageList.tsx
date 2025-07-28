'use client';

import { useEffect, useRef, useState } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      setCopied(false);
    }
  };
  return (
    <div className="relative flex items-center justify-end">
      <button
        onClick={handleCopy}
        className={`p-1 rounded-full border border-transparent hover:bg-gray-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400`}
        title="복사"
        style={{ height: 28, width: 28 }}
      >
        <DocumentDuplicateIcon className="h-5 w-5 text-gray-400 hover:text-blue-500" />
      </button>
      {copied && (
        <span className="absolute bottom-full mb-1 right-0 text-xs bg-gray-800 text-white rounded px-2 py-0.5 shadow z-10 whitespace-nowrap animate-fade-in-out">
          복사됨!
        </span>
      )}
    </div>
  );
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
    <div className="p-4 space-y-4">
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
                <div className="relative">
  <div className="whitespace-pre-wrap break-words flex-1 pr-10 min-w-[6rem] max-w-[40vw] sm:max-w-[36rem]" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
    {message.content}
  </div>
  {/* 복사 버튼을 메시지 박스 오른쪽 아래에 고정 */}
  <div className="absolute bottom-1 right-2 z-10">
    <CopyButton text={message.content} />
  </div>
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
  );
}