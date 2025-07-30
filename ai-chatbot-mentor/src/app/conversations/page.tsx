'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Squares2X2Icon, 
  ListBulletIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ApiClient } from '@/lib/api';

import { 
  Server, 
  HelpCircle, 
  Activity,
  Settings,
  Home,
  ArrowLeft
} from 'lucide-react';

interface ChatSession {
  id: number;
  title: string;
  mode: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  artifact_count?: number;
  artifact_types?: string[];
  last_message?: string;
  user_id: number;
}

interface ConversationFilters {
  search: string;
  mode: 'all' | 'chat' | 'mbti' | 'mentor' | 'document' | 'rag';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  sortBy: 'updated' | 'created' | 'title' | 'messages';
  sortOrder: 'desc' | 'asc';
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ConversationFilters>({
    search: '',
    mode: 'all',
    dateRange: 'all',
    sortBy: 'updated',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadConversations();
  }, [filters]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      const response = await ApiClient.getChatSessions({
        userId: 1, // 임시 사용자 ID
        limit: 100,
        search: filters.search || undefined,
        mode: filters.mode === 'all' ? undefined : filters.mode,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      let sessions = response.sessions || [];

      // 날짜 필터링
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        sessions = sessions.filter(session => 
          new Date(session.updated_at) >= filterDate
        );
      }

      // 아티팩트 정보 추가 (Mock 데이터)
      sessions = sessions.map(session => ({
        ...session,
        artifact_count: Math.floor(Math.random() * 5),
        artifact_types: ['code', 'text', 'image'].slice(0, Math.floor(Math.random() * 3) + 1)
      }));

      setConversations(sessions);
    } catch (error) {
      console.error('대화 목록 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: number) => {
    if (!confirm('이 대화를 삭제하시겠습니까?')) return;

    try {
      await ApiClient.deleteChatSession(id, 1); // 임시 사용자 ID
      await loadConversations();
    } catch (error) {
      console.error('대화 삭제 오류:', error);
      alert('대화 삭제 중 오류가 발생했습니다.');
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'chat': return '일반';
      case 'mbti': return 'MBTI';
      case 'mentor': return '멘토';
      case 'document':
      case 'rag': return '문서';
      default: return mode;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'chat': return ChatBubbleLeftRightIcon;
      case 'mbti': return SparklesIcon;
      case 'mentor': return SparklesIcon;
      case 'document':
      case 'rag': return DocumentTextIcon;
      default: return ChatBubbleLeftRightIcon;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'chat': return 'bg-blue-100 text-blue-800';
      case 'mbti': return 'bg-purple-100 text-purple-800';
      case 'mentor': return 'bg-green-100 text-green-800';
      case 'document':
      case 'rag': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getArtifactTypeLabel = (types: string[]) => {
    const labels = types.map(type => {
      switch (type) {
        case 'code': return '코드';
        case 'text': return '텍스트';
        case 'image': return '이미지';
        default: return type;
      }
    });
    return labels.join(', ');
  };

  return (
    <MainLayout>
      <div className="h-full bg-gray-50 p-4 overflow-auto">

        {/* 페이지 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                대화 목록
              </h1>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Search and View Mode */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
              <input
                type="text"
                placeholder="대화 검색..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">모드</label>
              <select
                value={filters.mode}
                onChange={(e) => setFilters(prev => ({ ...prev, mode: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="all">전체</option>
                <option value="chat">일반 대화</option>
                <option value="mbti">MBTI 멘토</option>
                <option value="mentor">멘토</option>
                <option value="document">문서 기반</option>
                <option value="rag">RAG</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="all">전체</option>
                <option value="today">오늘</option>
                <option value="week">최근 1주일</option>
                <option value="month">최근 1개월</option>
                <option value="year">최근 1년</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="updated">최근 업데이트</option>
                <option value="created">생성 시간</option>
                <option value="title">제목</option>
                <option value="messages">메시지 수</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">순서</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversations Display */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-500">대화 목록을 로딩 중...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">대화가 없습니다</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.mode !== 'all' || filters.dateRange !== 'all' 
                ? '검색 조건에 맞는 대화가 없습니다' 
                : '새로운 대화를 시작해보세요'}
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              새 대화 시작
            </a>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {conversations.map((conversation) => {
              const ModeIcon = getModeIcon(conversation.mode);
              return (
                <div key={conversation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <ModeIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getModeColor(conversation.mode)}`}>
                            {getModeLabel(conversation.mode)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteConversation(conversation.id)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {conversation.title}
                    </h3>
                    
                    {conversation.last_message && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {conversation.last_message}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(conversation.updated_at)}
                      </span>
                      <span className="flex items-center">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                        {conversation.message_count}개 메시지
                      </span>
                    </div>

                    {conversation.artifact_count && conversation.artifact_count > 0 && (
                      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center text-xs text-yellow-800">
                          <TagIcon className="h-3 w-3 mr-1" />
                          아티팩트 {conversation.artifact_count}개
                          {conversation.artifact_types && (
                            <span className="ml-2">({getArtifactTypeLabel(conversation.artifact_types)})</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <a
                        href={`/chat/${conversation.id}`}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                        대화 이어가기
                      </a>
                      <button
                        onClick={() => {/* TODO: 대화 상세 보기 */}}
                        className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대화
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      모드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      메시지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      아티팩트
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최근 업데이트
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations.map((conversation) => {
                    const ModeIcon = getModeIcon(conversation.mode);
                    return (
                      <tr key={conversation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="p-2 rounded-lg bg-gray-100">
                              <ModeIcon className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                {conversation.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {conversation.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getModeColor(conversation.mode)}`}>
                            {getModeLabel(conversation.mode)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {conversation.message_count}개
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {conversation.artifact_count && conversation.artifact_count > 0 ? (
                            <div>
                              <div className="font-medium">{conversation.artifact_count}개</div>
                              {conversation.artifact_types && (
                                <div className="text-xs text-gray-500">
                                  {getArtifactTypeLabel(conversation.artifact_types)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600">없음</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(conversation.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <a
                              href={`/chat/${conversation.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              이어가기
                            </a>
                            <button
                              onClick={() => {/* TODO: 대화 상세 보기 */}}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              보기
                            </button>
                            <button
                              onClick={() => deleteConversation(conversation.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}