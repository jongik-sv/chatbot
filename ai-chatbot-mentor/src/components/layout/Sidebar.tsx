'use client';

import { 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onClose: () => void;
}

const navigation = [
  { name: '새 채팅', href: '/', icon: PlusIcon, current: false },
  { name: 'MBTI 멘토', href: '/mbti', icon: SparklesIcon, current: false },
  { name: '문서 기반 대화', href: '/documents', icon: DocumentTextIcon, current: false },
  { name: '채팅 목록', href: '/chats', icon: ChatBubbleLeftRightIcon, current: true },
  { name: '멘토 관리', href: '/mentors', icon: UserGroupIcon, current: false },
  { name: '히스토리', href: '/history', icon: ClockIcon, current: false },
];

const recentChats = [
  { id: 1, title: 'JavaScript 학습 계획', time: '2분 전' },
  { id: 2, title: 'React 컴포넌트 설계', time: '1시간 전' },
  { id: 3, title: 'Next.js 프로젝트 구조', time: '3시간 전' },
  { id: 4, title: 'TypeScript 타입 정의', time: '1일 전' },
];

export default function Sidebar({ onClose }: SidebarProps) {
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
          {recentChats.map((chat) => (
            <a
              key={chat.id}
              href={`/chat/${chat.id}`}
              className="block px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <div className="truncate font-medium">{chat.title}</div>
              <div className="text-xs text-gray-500">{chat.time}</div>
            </a>
          ))}
        </div>
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