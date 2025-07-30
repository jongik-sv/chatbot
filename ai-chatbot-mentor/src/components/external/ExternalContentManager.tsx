'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Youtube, Globe, Calendar, 
  Download, Trash2, RefreshCw, Plus 
} from 'lucide-react';
import ExternalContentInput from './ExternalContentInput';
import ExternalContentViewer from './ExternalContentViewer';

interface ExternalContentItem {
  id: string;
  type: 'youtube' | 'website';
  url: string;
  title: string;
  summary: string;
  metadata: any;
  createdAt: string;
}

interface ExternalContentManagerProps {
  customGptId?: string;
  onContentSelected?: (content: ExternalContentItem) => void;
}

export default function ExternalContentManager({
  customGptId,
  onContentSelected
}: ExternalContentManagerProps) {
  const [contents, setContents] = useState<ExternalContentItem[]>([]);
  const [filteredContents, setFilteredContents] = useState<ExternalContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ExternalContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'youtube' | 'website'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 콘텐츠 검색
  const searchContents = async (query: string = searchQuery) => {
    if (!query.trim()) {
      setFilteredContents(contents);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/external-content/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          contentType: filterType === 'all' ? undefined : filterType,
          customGptId,
          limit: 50
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setFilteredContents(result.data.results);
      } else {
        console.error('검색 실패:', result.error);
        setFilteredContents([]);
      }
    } catch (error) {
      console.error('검색 오류:', error);
      setFilteredContents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 콘텐츠 필터링 및 정렬
  const applyFiltersAndSort = () => {
    let filtered = [...contents];

    // 타입 필터
    if (filterType !== 'all') {
      filtered = filtered.filter(content => content.type === filterType);
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredContents(filtered);
  };

  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      // 디바운싱
      const timeoutId = setTimeout(() => searchContents(query), 500);
      return () => clearTimeout(timeoutId);
    } else {
      applyFiltersAndSort();
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (newFilter: 'all' | 'youtube' | 'website') => {
    setFilterType(newFilter);
    if (searchQuery.trim()) {
      searchContents();
    } else {
      applyFiltersAndSort();
    }
  };

  // 정렬 변경 핸들러
  const handleSortChange = (newSortBy: 'date' | 'title' | 'type') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // 새 콘텐츠 추가 핸들러
  const handleContentAdded = (newContent: any) => {
    const contentItem: ExternalContentItem = {
      id: newContent.id,
      type: newContent.type,
      url: newContent.url,
      title: newContent.title,
      summary: newContent.summary,
      metadata: newContent.metadata,
      createdAt: newContent.createdAt
    };

    setContents(prev => [contentItem, ...prev]);
    setShowAddForm(false);

    // 자동으로 새 콘텐츠 선택
    setSelectedContent(contentItem);
  };

  // 콘텐츠 선택 핸들러
  const handleContentSelect = (content: ExternalContentItem) => {
    setSelectedContent(content);
    if (onContentSelected) {
      onContentSelected(content);
    }
  };

  // 새로고침
  const handleRefresh = () => {
    if (searchQuery.trim()) {
      searchContents();
    } else {
      loadContents();
    }
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    loadContents();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [contents, filterType, sortBy, sortOrder]);

  // 저장된 콘텐츠 로드
  const loadContents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/external-content');
      const data = await response.json();
      
      if (data.success) {
        const loadedContents = data.data.results.map((item: any) => ({
          id: item.id,
          type: item.type,
          url: item.url,
          title: item.title,
          summary: item.summary,
          metadata: item.metadata,
          createdAt: item.created_at || item.createdAt
        }));
        setContents(loadedContents);
      } else {
        console.error('콘텐츠 로드 실패:', data.error);
      }
    } catch (error) {
      console.error('콘텐츠 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">외부 콘텐츠 관리</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              콘텐츠 추가
            </button>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex gap-4 mb-4">
          {/* 검색 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="콘텐츠 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 타입 필터 */}
          <div className="flex gap-1 border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleFilterChange('youtube')}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                filterType === 'youtube'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Youtube className="w-4 h-4" />
              YouTube
            </button>
            <button
              onClick={() => handleFilterChange('website')}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                filterType === 'website'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Globe className="w-4 h-4" />
              웹사이트
            </button>
          </div>
        </div>

        {/* 정렬 옵션 */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">정렬:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange('date')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'date'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              날짜 {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortChange('title')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'title'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              제목 {sortBy === 'title' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortChange('type')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'type'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              유형 {sortBy === 'type' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
          <span className="text-gray-600 ml-auto">
            {filteredContents.length}개 결과
          </span>
        </div>
      </div>

      {/* 콘텐츠 추가 폼 */}
      {showAddForm && (
        <div className="p-4 bg-white border-b border-gray-200">
          <ExternalContentInput
            onContentProcessed={handleContentAdded}
            onError={(error) => console.error('콘텐츠 추가 실패:', error)}
            customGptId={customGptId}
          />
        </div>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex">
        {/* 콘텐츠 목록 */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">검색 중...</span>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Search className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-center">
                {searchQuery.trim() ? '검색 결과가 없습니다.' : '추가된 콘텐츠가 없습니다.'}
              </p>
              <p className="text-sm text-center mt-2">
                새로운 YouTube 비디오나 웹사이트를 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredContents.map((content) => (
                <div
                  key={content.id}
                  onClick={() => handleContentSelect(content)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedContent?.id === content.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {content.type === 'youtube' ? (
                      <Youtube className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    ) : (
                      <Globe className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate mb-1">
                        {content.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {content.summary}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(content.createdAt)}
                        </span>
                        <span className="truncate">
                          {new URL(content.url).hostname}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 콘텐츠 뷰어 */}
        <div className="w-1/2 bg-white">
          {selectedContent ? (
            <ExternalContentViewer
              content={selectedContent}
              onClose={() => setSelectedContent(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">콘텐츠를 선택하세요</p>
                <p className="text-sm">
                  왼쪽에서 콘텐츠를 클릭하면 상세 내용을 볼 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}