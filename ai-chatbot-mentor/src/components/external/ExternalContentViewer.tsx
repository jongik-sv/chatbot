'use client';

import React, { useState } from 'react';
import { 
  Youtube, Globe, Calendar, User, Hash, Image as ImageIcon, 
  ExternalLink, Copy, Download, Maximize2, Minimize2, Clock 
} from 'lucide-react';

interface ExternalContentData {
  id: string;
  type: 'youtube' | 'website';
  url: string;
  title: string;
  content: string;
  summary: string;
  metadata: any;
  createdAt: string | Date;
  contentLength?: number;
}

interface ExternalContentViewerProps {
  content: ExternalContentData;
  onClose?: () => void;
  showFullContent?: boolean;
}

export default function ExternalContentViewer({
  content,
  onClose,
  showFullContent = false
}: ExternalContentViewerProps) {
  const [expanded, setExpanded] = useState(showFullContent);
  const [activeTab, setActiveTab] = useState<'summary' | 'content' | 'metadata'>('summary');

  // 콘텐츠 복사
  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content.content);
      // TODO: 토스트 알림 추가
      console.log('콘텐츠가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  // 콘텐츠 다운로드
  const handleDownloadContent = () => {
    const blob = new Blob([content.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 원본 URL 열기
  const handleOpenOriginal = () => {
    window.open(content.url, '_blank');
  };

  // 시간 포맷팅
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('ko-KR');
  };

  // YouTube 메타데이터 렌더링
  const renderYouTubeMetadata = () => {
    const { videoId, channelName, thumbnailUrl, keywords } = content.metadata;
    
    return (
      <div className="space-y-3">
        {/* 썸네일 */}
        {thumbnailUrl && (
          <div className="flex justify-center">
            <img 
              src={thumbnailUrl} 
              alt={content.title}
              className="w-full max-w-md rounded-lg shadow-md"
            />
          </div>
        )}
        
        {/* 비디오 정보 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-500" />
            <span className="font-medium">비디오 ID:</span>
            <span className="font-mono text-gray-600">{videoId}</span>
          </div>
          
          {channelName && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">채널:</span>
              <span className="text-gray-600">{channelName}</span>
            </div>
          )}
        </div>

        {/* 키워드 */}
        {keywords && keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">키워드:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 10).map((keyword: string, index: number) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 웹사이트 메타데이터 렌더링
  const renderWebsiteMetadata = () => {
    const { author, publishedDate, wordCount, language, tags } = content.metadata;
    
    return (
      <div className="space-y-3">
        {/* 사이트 정보 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {author && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">작성자:</span>
              <span className="text-gray-600">{author}</span>
            </div>
          )}
          
          {publishedDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">발행일:</span>
              <span className="text-gray-600">{publishedDate}</span>
            </div>
          )}
          
          {wordCount && (
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="font-medium">단어 수:</span>
              <span className="text-gray-600">{wordCount.toLocaleString()}</span>
            </div>
          )}
          
          {language && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="font-medium">언어:</span>
              <span className="text-gray-600">{language}</span>
            </div>
          )}
        </div>

        {/* 태그 */}
        {tags && tags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">태그:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 10).map((tag: string, index: number) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${expanded ? 'fixed inset-4 z-50 shadow-2xl' : 'shadow-md'}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {content.type === 'youtube' ? (
            <Youtube className="w-5 h-5 text-red-500" />
          ) : (
            <Globe className="w-5 h-5 text-blue-500" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">{content.title}</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(content.createdAt)}
              </span>
              {content.contentLength && (
                <span>{content.contentLength.toLocaleString()} 글자</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenOriginal}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="원본 열기"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopyContent}
            className="p-1 text-gray-500 hover:text-green-600 transition-colors"
            title="내용 복사"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadContent}
            className="p-1 text-gray-500 hover:text-purple-600 transition-colors"
            title="다운로드"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={expanded ? "축소" : "확대"}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
              title="닫기"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'summary'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          요약
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'content'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          전체 내용
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'metadata'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          상세 정보
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className={`p-4 ${expanded ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : 'max-h-96 overflow-y-auto'}`}>
        {activeTab === 'summary' && (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">{content.summary}</p>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
              {content.content}
            </pre>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div>
            {content.type === 'youtube' && renderYouTubeMetadata()}
            {content.type === 'website' && renderWebsiteMetadata()}
          </div>
        )}
      </div>
    </div>
  );
}