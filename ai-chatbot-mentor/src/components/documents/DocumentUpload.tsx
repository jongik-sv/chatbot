// components/documents/DocumentUpload.tsx
'use client';

import React, { useState, useRef } from 'react';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Progress } from '@/components/ui/progress';

interface UploadedFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (files: File[]) => void;
  onUploadStart?: () => void;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  className?: string;
}

export default function DocumentUpload({
  onUploadComplete,
  onUploadStart,
  maxFileSize = 10,
  acceptedTypes = ['.pdf', '.txt', '.docx', '.md'],
  className = ''
}: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const newUploadedFiles: UploadedFile[] = [];

    Array.from(files).forEach(file => {
      // 파일 크기 검증
      if (file.size > maxFileSize * 1024 * 1024) {
        newUploadedFiles.push({
          file,
          status: 'error',
          progress: 0,
          error: `파일 크기가 ${maxFileSize}MB를 초과합니다.`
        });
        return;
      }

      // 파일 타입 검증
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        newUploadedFiles.push({
          file,
          status: 'error',
          progress: 0,
          error: `지원하지 않는 파일 형식입니다. (${acceptedTypes.join(', ')})`
        });
        return;
      }

      validFiles.push(file);
      newUploadedFiles.push({
        file,
        status: 'uploading',
        progress: 0
      });
    });

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    if (validFiles.length > 0) {
      onUploadStart?.();
      uploadFiles(validFiles);
    }
  };

  const uploadFiles = async (files: File[]) => {
    const uploadPromises = files.map(async (file, index) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // 업로드 진행률 시뮬레이션 (실제로는 XMLHttpRequest 사용 권장)
        const updateProgress = (progress: number) => {
          setUploadedFiles(prev =>
            prev.map(uploadedFile =>
              uploadedFile.file === file
                ? { ...uploadedFile, progress }
                : uploadedFile
            )
          );
        };

        // 진행률 업데이트 시뮬레이션
        for (let progress = 0; progress <= 90; progress += 10) {
          updateProgress(progress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        updateProgress(100);

        if (!response.ok) {
          throw new Error('업로드 실패');
        }

        const result = await response.json();
        
        setUploadedFiles(prev =>
          prev.map(uploadedFile =>
            uploadedFile.file === file
              ? { ...uploadedFile, status: 'success' as const }
              : uploadedFile
          )
        );

        // 개별 파일 업로드 성공 시 콜백 호출
        onUploadComplete?.([file]);

      } catch (error) {
        setUploadedFiles(prev =>
          prev.map(uploadedFile =>
            uploadedFile.file === file
              ? { 
                  ...uploadedFile, 
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : '업로드 실패'
                }
              : uploadedFile
          )
        );
      }
    });

    await Promise.all(uploadPromises);
  };

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(uploadedFile => uploadedFile.file !== fileToRemove));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 업로드 영역 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudArrowUpIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          파일을 드래그하거나 클릭하여 업로드
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          지원 형식: {acceptedTypes.join(', ')} (최대 {maxFileSize}MB)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">업로드 파일 ({uploadedFiles.length})</h4>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              모두 제거
            </button>
          </div>

          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center p-3 bg-white border border-gray-200 rounded-lg"
              >
                <DocumentTextIcon className="h-5 w-5 text-gray-600 mr-3 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.file.size)}
                    </span>
                  </div>

                  {uploadedFile.status === 'uploading' && (
                    <div className="space-y-1">
                      <Progress value={uploadedFile.progress} className="h-1" />
                      <p className="text-xs text-gray-500">
                        업로드 중... {uploadedFile.progress}%
                      </p>
                    </div>
                  )}

                  {uploadedFile.status === 'success' && (
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      <p className="text-xs text-green-600">업로드 완료</p>
                    </div>
                  )}

                  {uploadedFile.status === 'error' && (
                    <p className="text-xs text-red-600">{uploadedFile.error}</p>
                  )}
                </div>

                <button
                  onClick={() => removeFile(uploadedFile.file)}
                  className="ml-3 p-1 text-gray-600 hover:text-gray-800"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}