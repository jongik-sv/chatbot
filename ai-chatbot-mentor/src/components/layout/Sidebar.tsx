'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  AdjustmentsHorizontalIcon,
  UserCircleIcon
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
  { name: '새 채팅', href: '/', icon: PlusIcon, description: '새로운 대화 시작' },
  { name: 'MBTI 멘토', href: '/mbti', icon: SparklesIcon, description: 'MBTI 기반 맞춤 멘토' },
  { name: '콘텐츠 관리', href: '/content-management', icon: DocumentTextIcon, description: '문서/웹사이트 콘텐츠 관리' },
  { name: '대화 목록', href: '/conversations', icon: ChatBubbleLeftRightIcon, description: '대화 검색 및 관리' },
  { name: 'MCP 관리', href: '/mcp-management', icon: ServerIcon, description: 'MCP 서버 상태 확인 및 관리' },
  { name: '룰 관리', href: '/rules', icon: AdjustmentsHorizontalIcon, description: '대화 룰 설정 및 관리' },
  { name: '멘토 관리', href: '/mentors', icon: UserGroupIcon, description: '커스텀 멘토 생성/관리' },
];

const footerNavigation = [
  { name: '설정', href: '/settings', icon: Cog6ToothIcon, description: '시스템 설정 및 환경 구성' },
  { name: '사용자 프로필', href: '/profile', icon: UserCircleIcon, description: '프로필 정보 및 계정 관리' },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [loadingRecentChats, setLoadingRecentChats] = useState(true);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/chat/');
    }
    return pathname.startsWith(href);
  };

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
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <a
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              {item.name}
            </a>
          );
        })}
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
                className={`
                  block px-3 py-2 text-sm rounded-md transition-colors
                  ${pathname === `/chat/${chat.id}` 
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
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
              href="/conversations"
              className="block px-3 py-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              모든 대화 보기 →
            </a>
          </div>
        )}
      </div>

      {/* Footer Icons */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex justify-center space-x-4">
          {footerNavigation.map((item) => {
            const active = isActive(item.href);
            return (
              <a
                key={item.name}
                href={item.href}
                title={item.description}
                className={`
                  p-2 rounded-md transition-colors
                  ${active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
              </a>
            );
          })}
        </div>
      </div>

    </div>
  );
}