// components/ui/DocumentUpload.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DocumentUploadProps {
  onUploadSuccess?: (document: unknown) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // bytes
  acceptedTypes?: string[];
  className?: string;
}

interface UploadStatus {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['.pdf', '.docx', '.txt'],
  className = ''
}) => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = useCallback(() => {
    setUploadStatus({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      success: false
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // 파일 크기 검사
    if (file.size > maxFileSize) {
      return `파일 크기가 너무 큽니다. 최대 ${Math.round(maxFileSize / 1024 / 1024)}MB까지 지원합니다.`;
    }

    // 파일 형식 검사
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `지원하지 않는 파일 형식입니다. ${acceptedTypes.join(', ')} 파일만 지원합니다.`;
    }

    // 파일명 유효성 검사
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    const pathTraversal = /\.\./;
    if (dangerousChars.test(file.name) || pathTraversal.test(file.name)) {
      return '파일명에 유효하지 않은 문자가 포함되어 있습니다.';
    }

    return null;
  }, [maxFileSize, acceptedTypes]);

  const uploadFile = useCallback(async (file: File) => {
    // 파일 검증
    const validationError = validateFile(file);
    if (validationError) {
      setUploadStatus(prev => ({ ...prev, error: validationError }));
      onUploadError?.(validationError);
      return;
    }

    setUploadStatus(prev => ({
      ...prev,
      file,
      uploading: true,
      progress: 0,
      error: null,
      success: false
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      // XMLHttpRequest를 사용하여 업로드 진행률 추적
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadStatus(prev => ({ ...prev, progress }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          setUploadStatus(prev => ({
            ...prev,
            uploading: false,
            progress: 100,
            success: true
          }));
          onUploadSuccess?.(response.document);
        } else {
          const errorResponse = JSON.parse(xhr.responseText);
          const errorMessage = errorResponse.error || '업로드 중 오류가 발생했습니다.';
          setUploadStatus(prev => ({
            ...prev,
            uploading: false,
            error: errorMessage
          }));
          onUploadError?.(errorMessage);
        }
      });

      xhr.addEventListener('error', () => {
        const errorMessage = '네트워크 오류가 발생했습니다.';
        setUploadStatus(prev => ({
          ...prev,
          uploading: false,
          error: errorMessage
        }));
        onUploadError?.(errorMessage);
      });

      xhr.open('POST', '/api/documents/upload');
      xhr.send(formData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.';
      setUploadStatus(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }));
      onUploadError?.(errorMessage);
    }
  }, [validateFile, onUploadSuccess, onUploadError]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    uploadFile(file);
  }, [uploadFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    if (!uploadStatus.uploading) {
      fileInputRef.current?.click();
    }
  }, [uploadStatus.uploading]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploadStatus.uploading ? 'pointer-events-none opacity-60' : ''}
          ${uploadStatus.success ? 'border-green-400 bg-green-50' : ''}
          ${uploadStatus.error ? 'border-red-400 bg-red-50' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploadStatus.uploading}
        />

        <div className="flex flex-col items-center space-y-4">
          <DocumentArrowUpIcon className="w-12 h-12 text-gray-400" />
          
          {uploadStatus.uploading ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                업로드 중... {uploadStatus.progress}%
              </p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
              {uploadStatus.file && (
                <p className="text-xs text-gray-500">
                  {uploadStatus.file.name} ({formatFileSize(uploadStatus.file.size)})
                </p>
              )}
            </div>
          ) : uploadStatus.success ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-800">
                업로드 완료!
              </p>
              {uploadStatus.file && (
                <p className="text-xs text-green-600">
                  {uploadStatus.file.name}
                </p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetUpload();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                다른 파일 업로드
              </button>
            </div>
          ) : uploadStatus.error ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-800">
                업로드 실패
              </p>
              <p className="text-xs text-red-600">
                {uploadStatus.error}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetUpload();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                문서를 업로드하세요
              </p>
              <p className="text-xs text-gray-500">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-xs text-gray-400">
                지원 형식: {acceptedTypes.join(', ')} (최대 {Math.round(maxFileSize / 1024 / 1024)}MB)
              </p>
            </div>
          )}
        </div>

        {(uploadStatus.error || uploadStatus.success) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetUpload();
            }}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;