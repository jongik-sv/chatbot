'use client';

import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  UserIcon,
  CpuChipIcon,
  CalendarDaysIcon,
  PlayIcon,
  ClockIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  contentType: string;
  metadata?: any;
  createdAt: string;
}

interface ChatSession {
  id: number;
  title: string;
  mode: string;
  modelUsed?: string;
  mentorName?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SessionDetailViewProps {
  session: ChatSession;
  userId?: number;
  onLoadSession?: (session: ChatSession) => void;
  className?: string;
}

export default function SessionDetailView({ 
  session, 
  userId = 1,
  onLoadSession,
  className = '' 
}: SessionDetailViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadMessages();
  }, [session.id]);

  useEffect(() => {
    // 메시지 필터링
    if (searchTerm.trim()) {
      const filtered = messages.filter(message =>
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [messages, searchTerm]);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/messages?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('메시지를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMinutes = Math.round((endTime - startTime) / (1000 * 60));
    
    if (diffMinutes < 1) return '1분 미만';
    if (diffMinutes < 60) return `${diffMinutes}분`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}시간 ${minutes}분`;
  };

  const getModeInfo = (mode: string) => {
    switch (mode) {
      case 'mentor':
        return {
          icon: <UserIcon className="w-5 h-5" />,
          label: '멘토 상담',
          color: 'bg-purple-100 text-purple-800'
        };
      case 'mbti':
        return {
          icon: <CpuChipIcon className="w-5 h-5" />,
          label: 'MBTI 분석',
          color: 'bg-green-100 text-green-800'
        };
      case 'document':
        return {
          icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
          label: '문서 분석',
          color: 'bg-orange-100 text-orange-800'
        };
      default:
        return {
          icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
          label: '일반 채팅',
          color: 'bg-blue-100 text-blue-800'
        };
    }
  };

  const renderMessageContent = (message: Message) => {
    // 메타데이터에서 아티팩트나 특별한 콘텐츠 처리
    if (message.metadata?.artifacts) {
      return (
        <div className="space-y-2">
          <p>{message.content}</p>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-600">📎 생성된 아티팩트가 포함되어 있습니다.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap break-words">
        {message.content}
      </div>
    );
  };

  const modeInfo = getModeInfo(session.mode);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 세션 정보 헤더 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="space-y-3">
          {/* 모드 및 기본 정보 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${modeInfo.color}`}>
                {modeInfo.icon}
                <span className="ml-2">{modeInfo.label}</span>
              </span>
            </div>
            
            <button
              onClick={() => onLoadSession?.(session)}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              <span>이어서 채팅</span>
            </button>
          </div>

          {/* 세션 메타데이터 */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <CalendarDaysIcon className="w-4 h-4" />
              <span>시작: {formatDate(session.createdAt)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-4 h-4" />
              <span>
                시간: {filteredMessages.length > 0 
                  ? formatDuration(session.createdAt, filteredMessages[filteredMessages.length - 1]?.createdAt || session.updatedAt)
                  : '정보 없음'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>메시지: {session.messageCount}개</span>
            </div>
            
            {session.modelUsed && (
              <div className="flex items-center space-x-1">
                <CpuChipIcon className="w-4 h-4" />
                <span>모델: {session.modelUsed}</span>
              </div>
            )}
          </div>

          {session.mentorName && (
            <div className="bg-purple-50 rounded-md p-2">
              <p className="text-sm text-purple-800">
                <UserIcon className="w-4 h-4 inline mr-1" />
                멘토: {session.mentorName}
              </p>
            </div>
          )}

          {/* 검색 */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="메시지 내용 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {searchTerm && (
            <p className="text-xs text-gray-600">
              {filteredMessages.length}개의 메시지가 검색되었습니다.
            </p>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">메시지 로딩 중...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchTerm ? '검색 결과가 없습니다.' : '메시지가 없습니다.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                } rounded-lg px-4 py-2`}>
                  <div className="mb-1">
                    {renderMessageContent(message)}
                  </div>
                  
                  <div className={`text-xs ${
                    message.role === 'user' 
                      ? 'text-blue-100' 
                      : 'text-gray-500'
                  } mt-1`}>
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}