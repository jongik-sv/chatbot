'use client';

import React, { useState } from 'react';
import { Globe, Youtube, Search, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ExternalContentInputProps {
  onContentProcessed?: (result: any) => void;
  onError?: (error: string) => void;
  customGptId?: string;
}

interface ProcessingState {
  isProcessing: boolean;
  currentUrl: string;
  progress: string;
  type: 'youtube' | 'website' | null;
}

export default function ExternalContentInput({
  onContentProcessed,
  onError,
  customGptId
}: ExternalContentInputProps) {
  const [url, setUrl] = useState('');
  const [detectedType, setDetectedType] = useState<'youtube' | 'website' | 'unknown' | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    currentUrl: '',
    progress: '',
    type: null
  });
  const [useJavaScript, setUseJavaScript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL 유형 감지
  const detectUrlType = async (inputUrl: string) => {
    if (!inputUrl) {
      setDetectedType(null);
      return;
    }

    try {
      const response = await fetch('/api/external-content/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inputUrl }),
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API 응답이 JSON이 아닙니다:', contentType);
        setDetectedType('unknown');
        if (onError) {
          onError('서버에서 올바르지 않은 응답을 반환했습니다.');
        }
        return;
      }

      const result = await response.json();
      
      if (response.ok && result.success) {
        setDetectedType(result.data.contentType);
      } else {
        setDetectedType('unknown');
        const errorMessage = result.error || result.details || 'URL 감지에 실패했습니다.';
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error) {
      console.error('URL 감지 실패:', error);
      setDetectedType('unknown');
      const errorMessage = error instanceof Error ? error.message : 'URL 감지 중 오류가 발생했습니다.';
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // URL 변경 핸들러
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // 디바운싱으로 URL 타입 감지
    if (newUrl.trim()) {
      const timeoutId = setTimeout(() => detectUrlType(newUrl.trim()), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setDetectedType(null);
    }
  };

  // 콘텐츠 처리
  const handleProcessContent = async () => {
    if (!url.trim() || detectedType === 'unknown' || processing.isProcessing) {
      return;
    }

    setProcessing({
      isProcessing: true,
      currentUrl: url.trim(),
      progress: '콘텐츠 분석 중...',
      type: detectedType
    });

    try {
      const response = await fetch('/api/external-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          customGptId,
          options: {
            useJavaScript,
            timeout: 30000,
            addToKnowledgeBase: true,
            generateEmbedding: true
          }
        }),
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 반환했습니다.');
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.details || '콘텐츠 처리에 실패했습니다.');
      }
      
      if (result.success) {
        setProcessing(prev => ({ ...prev, progress: '처리 완료!' }));
        
        // 성공 콜백 호출
        if (onContentProcessed) {
          onContentProcessed(result.data);
        }

        // UI 리셋
        setTimeout(() => {
          setUrl('');
          setDetectedType(null);
          setProcessing({
            isProcessing: false,
            currentUrl: '',
            progress: '',
            type: null
          });
        }, 2000);

      } else {
        throw new Error(result.error || '콘텐츠 처리 실패');
      }

    } catch (error) {
      console.error('콘텐츠 처리 실패:', error);
      
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // 네트워크 오류 감지
      if (errorMessage.toLowerCase().includes('network') || 
          errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      // 서버 오류 감지
      if (errorMessage.includes('서버') || errorMessage.includes('Server')) {
        errorMessage = '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      }
      
      console.error('처리된 오류 메시지:', errorMessage);
      
      setProcessing({
        isProcessing: false,
        currentUrl: '',
        progress: '',
        type: null
      });

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // URL 초기화
  const handleClearUrl = () => {
    setUrl('');
    setDetectedType(null);
    setProcessing({
      isProcessing: false,
      currentUrl: '',
      progress: '',
      type: null
    });
  };

  // 예시 URL 입력
  const handleExampleUrl = (exampleUrl: string) => {
    setUrl(exampleUrl);
    detectUrlType(exampleUrl);
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">외부 콘텐츠 추가</h3>
      </div>

      {/* URL 입력 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          URL 입력
        </label>
        <div className="relative">
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="YouTube URL 또는 웹사이트 URL을 입력하세요..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={processing.isProcessing}
          />
          {url && (
            <button
              onClick={handleClearUrl}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={processing.isProcessing}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* URL 타입 표시 */}
      {detectedType && (
        <div className="flex items-center gap-2 text-sm">
          {detectedType === 'youtube' && (
            <>
              <Youtube className="w-4 h-4 text-red-500" />
              <span className="text-red-600 font-medium">YouTube 비디오</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </>
          )}
          {detectedType === 'website' && (
            <>
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600 font-medium">웹사이트</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </>
          )}
          {detectedType === 'unknown' && (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-600">지원하지 않는 URL 형식</span>
            </>
          )}
        </div>
      )}

      {/* 옵션 설정 */}
      {detectedType === 'website' && (
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useJavaScript}
              onChange={(e) => setUseJavaScript(e.target.checked)}
              disabled={processing.isProcessing}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">JavaScript 렌더링 사용</span>
            <span className="text-xs text-gray-500">(동적 콘텐츠가 있는 사이트)</span>
          </label>
        </div>
      )}

      {/* 처리 중 상태 */}
      {processing.isProcessing && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-800">
              {processing.progress}
            </div>
            <div className="text-xs text-blue-600 truncate">
              {processing.currentUrl}
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={handleProcessContent}
          disabled={!url.trim() || detectedType === 'unknown' || processing.isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {processing.isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              콘텐츠 추가
            </>
          )}
        </button>
      </div>

      {/* 예시 URL */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">예시 URL:</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExampleUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
            disabled={processing.isProcessing}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
          >
            YouTube 비디오
          </button>
          <button
            onClick={() => handleExampleUrl('https://ko.wikipedia.org/wiki/인공지능')}
            disabled={processing.isProcessing}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
          >
            위키피디아
          </button>
          <button
            onClick={() => handleExampleUrl('https://github.com/microsoft/TypeScript')}
            disabled={processing.isProcessing}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
          >
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
}