'use client';

import { useEffect, useRef, useState } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { useChatContext } from '@/contexts/ChatContext';
import { formatChatTime } from '../../utils/dateUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MCPToolsDisplay from './MCPToolsDisplay';

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
            className={`flex ${message.role === 'assistant' ? 'max-w-5xl' : 'max-w-3xl'} ${
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
                  <div className={`flex-1 pr-10 min-w-[6rem] ${message.role === 'assistant' ? 'max-w-[60vw] sm:max-w-[54rem]' : 'max-w-[40vw] sm:max-w-[36rem]'}`} style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
                    {message.role === 'assistant' ? (
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                          // 코드 블록 스타일링
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const childrenStr = String(children).trim();
                            
                            // 인라인 코드에서 단순 텍스트나 기술 용어는 강조 스타일로 처리
                            if (inline) {
                              // 파일 확장자만 있는 경우 (예: .html, .js, .css)
                              if (/^\.[a-zA-Z0-9]+$/.test(childrenStr)) {
                                return <span className="font-semibold text-blue-600">{children}</span>;
                              }
                              
                              // 기술 용어나 라이브러리 이름 (밑줄 포함, 알파벳+숫자+밑줄 조합)
                              if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(childrenStr) && childrenStr.length > 2) {
                                return <span className="font-semibold text-blue-600">{children}</span>;
                              }
                              
                              // 짧은 단순 텍스트 (3글자 이하)는 일반 텍스트로 처리
                              if (childrenStr.length <= 3 && !/[{}();=<>/\\]/.test(childrenStr)) {
                                return <span className="font-semibold text-blue-600">{children}</span>;
                              }
                              
                              // 실제 코드처럼 보이는 경우만 코드 스타일 적용
                              if (childrenStr.includes('(') || childrenStr.includes('{') || childrenStr.includes('=') || 
                                  childrenStr.includes(';') || childrenStr.includes('<') || childrenStr.includes('>') ||
                                  childrenStr.includes('/') || childrenStr.includes('\\') || childrenStr.includes('function') ||
                                  childrenStr.includes('class ') || childrenStr.includes('const ') || childrenStr.includes('let ')) {
                                return (
                                  <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              
                              // 그 외는 강조 텍스트로 처리 (기술 용어나 중요한 단어)
                              return <span className="font-semibold text-blue-600">{children}</span>;
                            }
                            
                            // 블록 코드는 기존대로 처리
                            return (
                              <pre className="bg-gray-800 text-gray-100 rounded-lg p-4 overflow-x-auto my-2">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            );
                          },
                          // 인용문 스타일링
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-blue-400 pl-4 italic my-2 text-gray-700">
                              {children}
                            </blockquote>
                          ),
                          // 리스트 스타일링
                          ul: ({ children }) => (
                            <ul className="list-disc ml-6 my-2">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal ml-6 my-2">
                              {children}
                            </ol>
                          ),
                          // 링크 스타일링
                          a: ({ href, children }) => (
                            <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          // 헤딩 스타일링
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold my-3 text-gray-900">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-bold my-2 text-gray-900">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-md font-semibold my-2 text-gray-900">
                              {children}
                            </h3>
                          ),
                          // 테이블 스타일링
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border border-gray-300">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-gray-300 px-4 py-2">
                              {children}
                            </td>
                          ),
                          // 강조 텍스트
                          strong: ({ children }) => (
                            <strong className="font-bold text-gray-900">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-gray-700">
                              {children}
                            </em>
                          ),
                          // 단락 스타일링
                          p: ({ children }) => (
                            <div className="my-2 leading-relaxed">
                              {children}
                            </div>
                          )
                        }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    )}
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
              
              {/* MCP 도구 사용 표시 (사용자 메시지에 표시) */}
              {message.role === 'user' && message.metadata?.mcpTools && (
                <div className="mt-2">
                  <MCPToolsDisplay mcpTools={message.metadata.mcpTools} />
                </div>
              )}

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