'use client';

import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  UserIcon,
  SparklesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { ApiClient } from '@/lib/api';

interface ChatSession {
  id: number;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
  messageCount: number;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  };
}

export default function ChatsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getChatSessions({ 
        userId: 1, // 임시 사용자 ID
        limit: 50 
      });
      setSessions(response.sessions || []);
    } catch (err) {
      setError('채팅 목록을 불러오는데 실패했습니다.');
      console.error('채팅 목록 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'mentor':
        return <UserIcon className="h-5 w-5" />;
      case 'mbti':
        return <SparklesIcon className="h-5 w-5" />;
      case 'document':
      case 'rag':
        return <DocumentTextIcon className="h-5 w-5" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'mentor':
        return '커스텀 멘토';
      case 'mbti':
        return 'MBTI 멘토';
      case 'document':
      case 'rag':
        return '문서 기반';
      default:
        return '일반 채팅';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '방금 전';
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else if (diffInHours < 48) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">채팅 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadSessions}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">채팅 목록</h1>
            <p className="text-sm text-gray-500">
              최근 대화 세션들을 빠르게 확인하고 이어서 대화하세요
            </p>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 대화가 없습니다</h3>
            <p className="text-gray-500 mb-6">새로운 대화를 시작해보세요!</p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              새 채팅 시작
            </a>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <a
                key={session.id}
                href={`/chat/${session.id}`}
                className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center text-sm text-gray-500">
                    {getModeIcon(session.mode)}
                    <span className="ml-2">{getModeLabel(session.mode)}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {formatDate(session.updated_at)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {session.title}
                </h3>

                {/* Last Message Preview */}
                {session.lastMessage && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {session.lastMessage.content.replace(/\*\*/g, '').substring(0, 100)}
                    {session.lastMessage.content.length > 100 ? '...' : ''}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{session.messageCount}개 메시지</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full">
                    {session.mode === 'chat' ? '일반' : session.mode.toUpperCase()}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
        <div className="flex justify-center">
          <a
            href="/history"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            상세 히스토리 보기
          </a>
        </div>
      </div>
    </div>
  );
}