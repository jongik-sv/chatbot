'use client';

import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  CalendarDaysIcon,
  UserIcon,
  CpuChipIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ApiClient } from '../../lib/api';
import HistoryManagement from './HistoryManagement';

interface ChatSession {
  id: number;
  title: string;
  mode: string;
  modelUsed?: string;
  mentorName?: string;
  messageCount: number;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryListProps {
  userId?: number;
  onSessionSelect?: (session: ChatSession) => void;
  selectedSessionId?: number;
  className?: string;
}

export default function ChatHistoryList({ 
  userId = 1, 
  onSessionSelect, 
  selectedSessionId,
  className = '' 
}: ChatHistoryListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showManagement, setShowManagement] = useState(false);

  // 페이지네이션
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadSessions(true);
  }, [userId, modeFilter, searchTerm]);

  const loadSessions = async (reset = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentOffset = reset ? 0 : offset;
      
      const response = await fetch(`/api/sessions?${new URLSearchParams({
        userId: userId.toString(),
        limit: limit.toString(),
        offset: currentOffset.toString(),
        ...(modeFilter && { mode: modeFilter }),
        ...(searchTerm && { search: searchTerm })
      })}`);

      if (!response.ok) {
        throw new Error('세션 목록을 불러올 수 없습니다.');
      }

      const data = await response.json();
      
      if (reset) {
        setSessions(data.sessions);
        setOffset(limit);
      } else {
        setSessions(prev => [...prev, ...data.sessions]);
        setOffset(prev => prev + limit);
      }
      
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error('세션 로딩 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('이 대화를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}?userId=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('세션 삭제에 실패했습니다.');
      }

      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('세션 삭제 실패:', error);
      setError(error instanceof Error ? error.message : '세션 삭제 실패');
    }
  };

  const handleEditTitle = async (sessionId: number) => {
    if (!editTitle.trim()) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editTitle,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('제목 수정에 실패했습니다.');
      }

      const data = await response.json();
      
      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: data.session.title }
            : session
        )
      );
      
      setEditingSessionId(null);
      setEditTitle('');
    } catch (error) {
      console.error('제목 수정 실패:', error);
      setError(error instanceof Error ? error.message : '제목 수정 실패');
    }
  };

  const startEdit = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'mentor':
        return <UserIcon className="w-4 h-4" />;
      case 'mbti':
        return <CpuChipIcon className="w-4 h-4" />;
      default:
        return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'mentor':
        return 'bg-purple-100 text-purple-800';
      case 'mbti':
        return 'bg-green-100 text-green-800';
      case 'document':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className} flex flex-col`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">대화 히스토리</h2>
          <button
            onClick={() => setShowManagement(true)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="히스토리 관리"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* 검색 및 필터 */}
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="대화 제목 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">모든 대화</option>
            <option value="chat">일반 채팅</option>
            <option value="mentor">멘토 상담</option>
            <option value="mbti">MBTI 분석</option>
            <option value="document">문서 분석</option>
          </select>
        </div>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 flex-shrink-0">
          <p className="text-sm text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800"
          >
            닫기
          </button>
        </div>
      )}

      {/* 세션 목록 */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>저장된 대화가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect?.(session)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedSessionId === session.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 제목 편집 */}
                    {editingSessionId === session.id ? (
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleEditTitle(session.id)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditTitle(session.id);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {session.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(session);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
                          title="제목 편집"
                        >
                          <PencilIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* 메타데이터 */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getModeColor(session.mode)}`}>
                        {getModeIcon(session.mode)}
                        <span className="ml-1">{session.mode.toUpperCase()}</span>
                      </span>
                      
                      <span className="text-xs text-gray-500">
                        메시지 {session.messageCount}개
                      </span>
                      
                      {session.mentorName && (
                        <span className="text-xs text-gray-500">
                          • {session.mentorName}
                        </span>
                      )}
                    </div>

                    {/* 마지막 메시지 */}
                    {session.lastMessage && (
                      <p className="text-xs text-gray-600 truncate mb-2">
                        <span className={`font-medium ${session.lastMessage.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                          {session.lastMessage.role === 'user' ? '나' : 'AI'}:
                        </span>
                        {' '}{session.lastMessage.content}
                      </p>
                    )}

                    {/* 날짜 */}
                    <div className="flex items-center text-xs text-gray-500">
                      <CalendarDaysIcon className="w-3 h-3 mr-1" />
                      {formatDate(session.updatedAt)}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 더 보기 버튼 */}
        {hasMore && !loading && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => loadSessions(false)}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              더 보기
            </button>
          </div>
        )}

        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="p-4 text-center">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">로딩 중...</span>
          </div>
        )}
      </div>

      {/* 히스토리 관리 모달 */}
      <HistoryManagement
        userId={userId}
        isOpen={showManagement}
        onClose={() => setShowManagement(false)}
      />
    </div>
  );
}