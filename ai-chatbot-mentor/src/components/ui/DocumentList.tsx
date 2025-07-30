// components/ui/DocumentList.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DocumentIcon, 
  MagnifyingGlassIcon, 
  TrashIcon, 
  EyeIcon,
  FunnelIcon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  filename: string;
  fileType: string;
  wordCount: number;
  language: string;
  summary: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  documentsByType: { [key: string]: number };
  documentsByLanguage: { [key: string]: number };
}

interface DocumentListProps {
  onDocumentSelect?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  refreshTrigger?: number;
  className?: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  onDocumentSelect,
  onDocumentDelete,
  refreshTrigger = 0,
  className = ''
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 및 필터링 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'filename' | 'fileSize' | 'wordCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '100', // 클라이언트에서 필터링하기 위해 더 많이 가져오기
        offset: '0'
      });

      if (selectedFileType !== 'all') {
        params.append('fileType', selectedFileType);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`/api/documents/upload?${params}`);
      
      if (!response.ok) {
        throw new Error('문서 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedFileType]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  const handleDeleteDocument = useCallback(async (documentId: string, filename: string) => {
    if (!confirm(`"${filename}" 문서를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('문서 삭제에 실패했습니다.');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      onDocumentDelete?.(documentId);
      
      // 통계 갱신
      fetchDocuments();
    } catch (err) {
      alert(err instanceof Error ? err.message : '문서 삭제 중 오류가 발생했습니다.');
    }
  }, [onDocumentDelete, fetchDocuments]);

  const handleViewDocument = useCallback(async (document: Document) => {
    onDocumentSelect?.(document);
  }, [onDocumentSelect]);

  // 정렬된 문서 목록
  const sortedDocuments = React.useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortBy === 'filename') {
        aValue = (aValue as string).toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // 페이지네이션 적용
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [documents, sortBy, sortOrder, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    // 서버 사이드에서는 기본 포맷 반환 (하이드레이션 불일치 방지)
    if (typeof window === 'undefined') {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return new Date(dateString).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeIcon = (fileType: string) => {
    return <DocumentIcon className="w-5 h-5 text-gray-600" />;
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 통계 섹션 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</div>
            <div className="text-sm text-gray-500">총 문서</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</div>
            <div className="text-sm text-gray-500">총 크기</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.documentsByType).length}
            </div>
            <div className="text-sm text-gray-500">파일 형식</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.documentsByLanguage).length}
            </div>
            <div className="text-sm text-gray-500">언어</div>
          </div>
        </div>
      )}

      {/* 검색 및 필터 섹션 */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="문서 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 파일 형식 필터 */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">모든 형식</option>
              <option value=".pdf">PDF</option>
              <option value=".docx">DOCX</option>
              <option value=".txt">TXT</option>
            </select>
          </div>
        </div>
      </div>

      {/* 문서 목록 */}
      <div className="bg-white shadow border rounded-lg overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '업로드된 문서가 없습니다.'}
          </div>
        ) : (
          <>
            {/* 테이블 헤더 */}
            <div className="hidden md:grid md:grid-cols-7 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-700">
              <button
                onClick={() => handleSort('filename')}
                className="text-left flex items-center space-x-1 hover:text-gray-900"
              >
                <span>파일명</span>
                <ChevronUpDownIcon className="w-4 h-4" />
              </button>
              <div>형식</div>
              <button
                onClick={() => handleSort('wordCount')}
                className="text-left flex items-center space-x-1 hover:text-gray-900"
              >
                <span>단어 수</span>
                <ChevronUpDownIcon className="w-4 h-4" />
              </button>
              <div>언어</div>
              <button
                onClick={() => handleSort('fileSize')}
                className="text-left flex items-center space-x-1 hover:text-gray-900"
              >
                <span>크기</span>
                <ChevronUpDownIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSort('createdAt')}
                className="text-left flex items-center space-x-1 hover:text-gray-900"
              >
                <span>업로드일</span>
                <ChevronUpDownIcon className="w-4 h-4" />
              </button>
              <div>작업</div>
            </div>

            {/* 문서 목록 */}
            <div className="divide-y divide-gray-200">
              {sortedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                    {/* 파일명 및 요약 */}
                    <div className="md:col-span-1">
                      <div className="flex items-center space-x-3">
                        {getFileTypeIcon(document.fileType)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {document.filename}
                          </p>
                          {document.summary && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {document.summary.length > 50 
                                ? document.summary.substring(0, 50) + '...'
                                : document.summary
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 파일 형식 */}
                    <div className="md:col-span-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {document.fileType.replace('.', '').toUpperCase()}
                      </span>
                    </div>

                    {/* 단어 수 */}
                    <div className="md:col-span-1">
                      <span className="text-sm text-gray-900">
                        {document.wordCount.toLocaleString()}
                      </span>
                    </div>

                    {/* 언어 */}
                    <div className="md:col-span-1">
                      <span className="text-sm text-gray-500">
                        {document.language === 'ko' ? '한국어' : 
                         document.language === 'en' ? '영어' : document.language}
                      </span>
                    </div>

                    {/* 파일 크기 */}
                    <div className="md:col-span-1">
                      <span className="text-sm text-gray-500">
                        {formatFileSize(document.fileSize)}
                      </span>
                    </div>

                    {/* 업로드일 */}
                    <div className="md:col-span-1">
                      <span className="text-sm text-gray-500">
                        {formatDate(document.createdAt)}
                      </span>
                    </div>

                    {/* 작업 버튼 */}
                    <div className="md:col-span-1">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDocument(document)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="문서 보기"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(document.id, document.filename)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="문서 삭제"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {documents.length}개 문서 중 {Math.min((currentPage - 1) * itemsPerPage + 1, documents.length)}-{Math.min(currentPage * itemsPerPage, documents.length)}번째
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentList;