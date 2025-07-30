'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  DocumentTextIcon, 
  GlobeAltIcon, 
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  DocumentArrowUpIcon,
  VideoCameraIcon 
} from '@heroicons/react/24/solid';

interface ContentItem {
  id: string;
  title: string;
  type: 'document' | 'website' | 'youtube';
  url?: string;
  filename?: string;
  fileSize?: number;
  content?: string;
  summary?: string;
  createdAt: string;
  metadata?: any;
}

export default function ContentManagement() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'all' | 'document' | 'website' | 'youtube'>('all');

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      setLoading(true);
      
      // 문서 목록 로드
      const documentsResponse = await fetch('/api/documents');
      const documentsData = await documentsResponse.json();
      
      // 외부 콘텐츠 목록 로드
      const externalResponse = await fetch('/api/external-content');
      const externalData = await externalResponse.json();
      
      // 데이터 통합 및 표준화
      const documents: ContentItem[] = (documentsData.data || []).map((doc: any) => ({
        id: `doc-${doc.id}`,
        title: doc.filename || '제목 없음',
        type: 'document' as const,
        filename: doc.filename,
        fileSize: doc.file_size || 0,
        content: doc.content,
        summary: doc.content?.substring(0, 200) + '...',
        createdAt: doc.created_at,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
      }));

      const externals: ContentItem[] = (externalData.data?.results || []).map((ext: any) => ({
        id: `ext-${ext.id}`,
        title: ext.title || '제목 없음',
        type: ext.type === 'youtube' ? 'youtube' : 'website' as const,
        url: ext.url,
        summary: ext.summary,
        createdAt: ext.createdAt,
        metadata: ext.metadata || {}
      }));

      setContents([...documents, ...externals]);
    } catch (error) {
      console.error('콘텐츠 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContents = contents.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || content.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'document':
        return DocumentArrowUpIcon;
      case 'youtube':
        return VideoCameraIcon;
      case 'website':
        return GlobeAltIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'document':
        return '문서';
      case 'youtube':
        return 'YouTube';
      case 'website':
        return '웹사이트';
      default:
        return '알 수 없음';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStartConversation = (content: ContentItem) => {
    if (content.type === 'document') {
      const docId = content.id.replace('doc-', '');
      window.location.href = `/documents/${docId}`;
    } else {
      // 외부 콘텐츠의 경우 RAG 모드로 대화 시작
      window.location.href = `/chat?mode=rag&contentId=${content.id}`;
    }
  };

  const deleteContent = async (content: ContentItem) => {
    if (!confirm(`'${content.title}'을(를) 삭제하시겠습니까?`)) return;

    try {
      if (content.type === 'document') {
        const docId = content.id.replace('doc-', '');
        await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' });
      } else {
        const extId = content.id.replace('ext-', '');
        await fetch(`/api/external-content?id=${extId}`, { method: 'DELETE' });
      }
      
      await loadContents();
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <MainLayout>
      <div className="h-full bg-gray-50 p-4 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">콘텐츠 관리</h1>
          <p className="text-gray-600">문서 업로드, 웹사이트 및 YouTube 콘텐츠를 통합 관리하세요</p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              문서 업로드
            </button>
            <button
              onClick={() => setShowUrlModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <GlobeAltIcon className="h-5 w-5 mr-2" />
              웹 주소 추가
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: 'all', label: '전체', count: contents.length },
              { key: 'document', label: '문서', count: contents.filter(c => c.type === 'document').length },
              { key: 'website', label: '웹사이트', count: contents.filter(c => c.type === 'website').length },
              { key: 'youtube', label: 'YouTube', count: contents.filter(c => c.type === 'youtube').length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
              <input
                type="text"
                placeholder="콘텐츠 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-500">콘텐츠를 로딩 중...</div>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">콘텐츠가 없습니다</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? '검색 조건에 맞는 콘텐츠가 없습니다' : '문서를 업로드하거나 웹 주소를 추가해보세요'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => {
              const IconComponent = getContentIcon(content.type);
              return (
                <div key={content.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${
                          content.type === 'document' ? 'bg-blue-100' :
                          content.type === 'youtube' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <IconComponent className={`h-6 w-6 ${
                            content.type === 'document' ? 'text-blue-600' :
                            content.type === 'youtube' ? 'text-red-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div className="ml-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            content.type === 'document' ? 'bg-blue-100 text-blue-800' :
                            content.type === 'youtube' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {getContentTypeLabel(content.type)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteContent(content)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {content.title}
                    </h3>
                    
                    {content.summary && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {content.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{formatDate(content.createdAt)}</span>
                      {content.fileSize && (
                        <span>{formatFileSize(content.fileSize)}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartConversation(content)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        대화하기
                      </button>
                      <button
                        onClick={() => setSelectedContent(content)}
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
                      콘텐츠
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      크기
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContents.map((content) => {
                    const IconComponent = getContentIcon(content.type);
                    return (
                      <tr key={content.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg ${
                              content.type === 'document' ? 'bg-blue-100' :
                              content.type === 'youtube' ? 'bg-red-100' : 'bg-green-100'
                            }`}>
                              <IconComponent className={`h-5 w-5 ${
                                content.type === 'document' ? 'text-blue-600' :
                                content.type === 'youtube' ? 'text-red-600' : 'text-green-600'
                              }`} />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                {content.title}
                              </div>
                              {content.summary && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {content.summary}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            content.type === 'document' ? 'bg-blue-100 text-blue-800' :
                            content.type === 'youtube' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {getContentTypeLabel(content.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(content.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {content.fileSize ? formatFileSize(content.fileSize) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartConversation(content)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              대화하기
                            </button>
                            <button
                              onClick={() => setSelectedContent(content)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              보기
                            </button>
                            <button
                              onClick={() => deleteContent(content)}
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

      {/* Document Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">문서 업로드</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-600 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <DocumentUploadModal
              onSuccess={() => {
                setShowUploadModal(false);
                loadContents();
              }}
              onCancel={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}

      {/* URL Input Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">웹 주소 추가</h3>
              <button
                onClick={() => setShowUrlModal(false)}
                className="p-1 text-gray-600 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <UrlInputModal
              onSuccess={() => {
                setShowUrlModal(false);
                loadContents();
              }}
              onCancel={() => setShowUrlModal(false)}
            />
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}

// Document Upload Modal Component
function DocumentUploadModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // XMLHttpRequest를 사용하여 업로드 진행률 추적
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201 || xhr.status === 200) {
          onSuccess();
        } else {
          const errorResponse = JSON.parse(xhr.responseText);
          setError(errorResponse.error || '업로드 중 오류가 발생했습니다.');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        setError('네트워크 오류가 발생했습니다.');
        setUploading(false);
      });

      xhr.open('POST', '/api/documents/upload');
      xhr.send(formData);

    } catch (error) {
      setError(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.docx,.txt,.doc,.pptx,.xlsx"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center space-y-4">
          <DocumentArrowUpIcon className="w-12 h-12 text-gray-600" />
          
          {file ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">문서를 업로드하세요</p>
              <p className="text-xs text-gray-500">파일을 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-xs text-gray-600">
                지원 형식: PDF, DOCX, TXT, DOC, PPTX, XLSX (최대 50MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>업로드 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '업로드'}
        </button>
      </div>
    </div>
  );
}

// URL Input Modal Component
function UrlInputModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectUrlType = (url: string): 'youtube' | 'website' | 'unknown' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return 'website';
    }
    return 'unknown';
  };

  const handleProcess = async () => {
    if (!url.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }

    const urlType = detectUrlType(url);
    if (urlType === 'unknown') {
      setError('올바른 URL 형식이 아닙니다. http:// 또는 https://로 시작하는 URL을 입력해주세요.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/external-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          saveToDatabase: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '콘텐츠 처리 중 오류가 발생했습니다.');
      }

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : '콘텐츠 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const getUrlTypeLabel = (url: string) => {
    const type = detectUrlType(url);
    switch (type) {
      case 'youtube':
        return 'YouTube 비디오';
      case 'website':
        return '웹사이트';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="url-input" className="block text-sm font-medium text-gray-700">
          웹 주소 (URL)
        </label>
        <input
          id="url-input"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="https://example.com 또는 YouTube 링크"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={processing}
        />
        {url && (
          <p className="text-xs text-gray-500">
            감지된 타입: {getUrlTypeLabel(url) || '알 수 없음'}
          </p>
        )}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-1">지원하는 콘텐츠</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• YouTube 비디오 (자막 텍스트 추출)</li>
          <li>• 웹사이트 (본문 텍스트 추출)</li>
          <li>• 블로그, 뉴스 기사, 위키 페이지 등</li>
        </ul>
      </div>

      {processing && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <p className="text-sm text-yellow-800">콘텐츠를 처리하고 있습니다... (최대 1분 소요)</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={processing}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleProcess}
          disabled={!url.trim() || processing}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {processing ? '처리 중...' : '추가'}
        </button>
      </div>
    </div>
  );
}