'use client';

import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon,
  Cog6ToothIcon,
  SparklesIcon,
  GlobeAltIcon,
  ServerIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { ApiClient } from '@/lib/api';

interface SidebarProps {
  onClose: () => void;
}

interface RecentChat {
  id: number;
  title: string;
  updated_at: string;
  mode: string;
}

const navigation = [
  { name: '새 채팅', href: '/', icon: PlusIcon, current: false, description: '새로운 대화 시작' },
  { name: 'MBTI 멘토', href: '/mbti', icon: SparklesIcon, current: false, description: 'MBTI 기반 맞춤 멘토' },
  { name: '문서 기반 대화', href: '/documents', icon: DocumentTextIcon, current: false, description: '업로드한 문서로 대화' },
  { name: '외부 콘텐츠', href: '/external-content', icon: GlobeAltIcon, current: false, description: 'YouTube/웹사이트 콘텐츠 추가' },
  { name: 'MCP 관리', href: '/mcp-management', icon: ServerIcon, current: false, description: 'MCP 서버 상태 확인 및 관리' },
  { name: '룰 관리', href: '/rules', icon: BookOpenIcon, current: false, description: '대화 룰 설정 및 관리' },
  { name: '채팅 목록', href: '/chats', icon: ChatBubbleLeftRightIcon, current: true, description: '최근 대화 빠른 보기' },
  { name: '멘토 관리', href: '/mentors', icon: UserGroupIcon, current: false, description: '커스텀 멘토 생성/관리' },
  { name: '히스토리', href: '/history', icon: ClockIcon, current: false, description: '대화 검색 및 상세 관리' },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [loadingRecentChats, setLoadingRecentChats] = useState(true);

  useEffect(() => {
    loadRecentChats();
  }, []);

  const loadRecentChats = async () => {
    try {
      setLoadingRecentChats(true);
      const response = await ApiClient.getChatSessions({ 
        userId: 1, // 임시 사용자 ID
        limit: 4 
      });
      setRecentChats(response.sessions || []);
    } catch (error) {
      console.error('최근 대화 로딩 오류:', error);
    } finally {
      setLoadingRecentChats(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return '방금 전';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`;
    }
  };
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI 챗봇 멘토</h2>
        <button
          type="button"
          className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`
              group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${item.current
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <item.icon
              className={`
                mr-3 h-5 w-5 flex-shrink-0
                ${item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
              `}
            />
            {item.name}
          </a>
        ))}
      </nav>

      {/* Recent Chats */}
      <div className="px-4 py-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          최근 대화
        </h3>
        <div className="space-y-2">
          {loadingRecentChats ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              로딩 중...
            </div>
          ) : recentChats.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              최근 대화가 없습니다
            </div>
          ) : (
            recentChats.map((chat) => (
              <a
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="block px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <div className="truncate font-medium">{chat.title}</div>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>{formatTime(chat.updated_at)}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                    {chat.mode === 'chat' ? '일반' : 
                     chat.mode === 'mbti' ? 'MBTI' :
                     chat.mode === 'mentor' ? '멘토' :
                     chat.mode === 'document' || chat.mode === 'rag' ? '문서' : chat.mode}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
        {recentChats.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <a
              href="/chats"
              className="block px-3 py-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              모든 채팅 보기 →
            </a>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="px-4 py-4 border-t border-gray-200">
        <a
          href="/settings"
          className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          설정
        </a>
      </div>
    </div>
  );
}