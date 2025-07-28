// components/documents/DocumentList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  TrashIcon,
  CalendarIcon,
  DocumentIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: number;
  filename: string;
  file_type?: string;
  file_size?: number;
  content?: string;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  onView?: (document: Document) => void;
  className?: string;
}

export default function DocumentList({ 
  documents, 
  loading = false, 
  onDelete, 
  onView,
  className = '' 
}: DocumentListProps) {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
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

  const getFileTypeColor = (fileType?: string): string => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return 'bg-red-100 text-red-800';
      case 'txt':
        return 'bg-gray-100 text-gray-800';
      case 'docx':
      case 'doc':
        return 'bg-blue-100 text-blue-800';
      case 'md':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateContent = (content?: string, maxLength: number = 100): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="ml-4">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">업로드된 문서가 없습니다</h3>
        <p className="text-gray-500 mb-6">문서를 업로드하여 AI와 대화를 시작해보세요.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {documents.map((document) => (
        <div 
          key={document.id}
          className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 파일 정보 헤더 */}
              <div className="flex items-center mb-3">
                <DocumentIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {document.filename}
                </h3>
                {document.file_type && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-3 ${getFileTypeColor(document.file_type)}`}
                  >
                    {document.file_type.toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* 문서 내용 미리보기 */}
              {document.content && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {truncateContent(document.content, 150)}
                </p>
              )}

              {/* 메타데이터 */}
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {formatDate(document.created_at)}
                </div>
                {document.file_size && (
                  <div>
                    크기: {formatFileSize(document.file_size)}
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-2 ml-4">
              {onView && (
                <button
                  onClick={() => onView(document)}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="문서 보기"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm(`"${document.filename}" 문서를 삭제하시겠습니까?`)) {
                      onDelete(document.id);
                    }
                  }}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="문서 삭제"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}