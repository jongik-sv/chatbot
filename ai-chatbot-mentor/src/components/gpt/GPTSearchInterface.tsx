// components/gpt/GPTSearchInterface.tsx
'use client';

import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface SearchResult {
  query: string;
  totalChunks: number;
  chunks: Array<{
    id: string;
    content: string;
    score: number;
    source: string;
    documentId: string;
    rank: number;
  }>;
  sources: Array<{
    documentId: string;
    filename: string;
    relevance: number;
  }>;
  contextPrompt: string;
  searchParams: {
    maxChunks: number;
    threshold: number;
    knowledgeBaseId?: string;
  };
  timestamp: string;
}

interface GPTSearchInterfaceProps {
  gptId: string;
  gptName: string;
}

export default function GPTSearchInterface({
  gptId,
  gptName
}: GPTSearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [maxChunks, setMaxChunks] = useState(10);
  const [threshold, setThreshold] = useState(0.3);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  // 지식 베이스 검색
  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/gpts/${gptId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          maxChunks,
          threshold
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSearchResult(result.data);
      } else {
        setError(result.error || '검색에 실패했습니다');
      }
    } catch (error) {
      console.error('검색 오류:', error);
      setError('검색 중 오류가 발생했습니다');
    } finally {
      setIsSearching(false);
    }
  };

  // 통계 정보 로드
  const loadStats = async () => {
    try {
      const response = await fetch(`/api/gpts/${gptId}/search`);
      const result = await response.json();

      if (result.success) {
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('통계 로드 오류:', error);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };

  // 컴포넌트 마운트 시 통계 로드
  React.useEffect(() => {
    loadStats();
  }, [gptId]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{gptName} - 지식 베이스 검색</h2>
      </div>

      {/* 통계 정보 */}
      {stats && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">지식 베이스 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">지식 베이스</div>
              <div className="text-xl font-semibold">{stats.totalKnowledgeBases}개</div>
            </div>
            <div>
              <div className="text-gray-600">문서</div>
              <div className="text-xl font-semibold">{stats.totalDocuments}개</div>
            </div>
            <div>
              <div className="text-gray-600">청크</div>
              <div className="text-xl font-semibold">{stats.totalChunks}개</div>
            </div>
            <div>
              <div className="text-gray-600">평균 청크 크기</div>
              <div className="text-xl font-semibold">{stats.averageChunkSize}자</div>
            </div>
          </div>
        </Card>
      )}

      {/* 검색 설정 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">검색 설정</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">검색 쿼리</label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="검색할 내용을 입력하세요..."
                className="flex-1"
              />
              <Button
                onClick={performSearch}
                disabled={!searchQuery.trim() || isSearching}
              >
                {isSearching ? '검색 중...' : '검색'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                최대 결과 수: {maxChunks}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={maxChunks}
                onChange={(e) => setMaxChunks(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                관련성 임계값: {threshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {searchResult && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">검색 결과</h3>
              <div className="text-sm text-gray-600">
                "{searchResult.query}"에 대한 {searchResult.totalChunks}개 결과
              </div>
            </div>

            {/* 참조 소스 요약 */}
            {searchResult.sources.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">참조 문서</h4>
                <div className="space-y-1">
                  {searchResult.sources.map((source, index) => (
                    <div key={index} className="text-sm">
                      • {source.filename} (관련도: {Math.round(source.relevance * 100)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 결과 청크들 */}
            <div className="space-y-4">
              {searchResult.chunks.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  검색 결과가 없습니다. 다른 키워드로 시도해보세요.
                </div>
              ) : (
                searchResult.chunks.map((chunk) => (
                  <Card key={chunk.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          #{chunk.rank}
                        </span>
                        <span className="text-sm text-gray-600">
                          {chunk.source}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        관련도: {Math.round(chunk.score * 100)}%
                      </div>
                    </div>
                    <div className="text-gray-800 leading-relaxed">
                      {chunk.content}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* 컨텍스트 프롬프트 미리보기 */}
            {searchResult.contextPrompt && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">생성된 컨텍스트 프롬프트</h4>
                <div className="text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {searchResult.contextPrompt}
                </div>
              </div>
            )}

            {/* 검색 메타데이터 */}
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              검색 시간: {new Date(searchResult.timestamp).toLocaleString()} • 
              최대 결과: {searchResult.searchParams.maxChunks} • 
              임계값: {searchResult.searchParams.threshold}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}