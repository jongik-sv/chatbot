// components/models/GeminiModelList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { LLMModel } from '../../types';
import { ApiClient } from '../../lib/api';

interface GeminiModelListProps {
  onSelectModel?: (model: LLMModel) => void;
  selectedModel?: LLMModel | null;
  showDetails?: boolean;
}

export default function GeminiModelList({ 
  onSelectModel, 
  selectedModel, 
  showDetails = false 
}: GeminiModelListProps) {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // 모델 리스트 로드
  const loadModels = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ApiClient.getGeminiModels({
        forceRefresh,
        includeDetails: showDetails
      });
      
      setModels(response.models);
      setCacheStatus(response.cacheStatus);
      setApiStatus(response.apiStatus);
      setLastUpdated(response.timestamp);
    } catch (error) {
      console.error('Gemini 모델 로드 실패:', error);
      setError(error instanceof Error ? error.message : '모델 로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 캐시 초기화
  const clearCache = async () => {
    try {
      await ApiClient.clearGeminiModelCache();
      await loadModels(true); // 캐시 초기화 후 새로고침
    } catch (error) {
      console.error('캐시 초기화 실패:', error);
      setError(error instanceof Error ? error.message : '캐시 초기화에 실패했습니다.');
    }
  };

  // 컴포넌트 마운트 시 모델 로드
  useEffect(() => {
    loadModels();
  }, []);

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      loadModels();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR');
  };

  const formatRemainingTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}분 ${seconds}초`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Gemini 모델 ({models.length}/2)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => loadModels(true)}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {isLoading ? '새로고침 중...' : '새로고침'}
            </button>
            {cacheStatus?.cached && (
              <button
                onClick={clearCache}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                캐시 초기화
              </button>
            )}
          </div>
        </div>

        {/* 상태 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {lastUpdated && (
            <span>마지막 업데이트: {formatTime(lastUpdated)}</span>
          )}
          
          {cacheStatus && (
            <span className={`px-2 py-1 rounded text-xs ${
              cacheStatus.cached 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {cacheStatus.cached 
                ? `캐시됨 (${formatRemainingTime(cacheStatus.remainingTime)} 남음)`
                : '실시간 데이터'
              }
            </span>
          )}

          {apiStatus && (
            <span className={`px-2 py-1 rounded text-xs ${
              apiStatus.connected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              API: {apiStatus.status}
              {apiStatus.responseTime && ` (${apiStatus.responseTime}ms)`}
            </span>
          )}
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 모델 리스트 */}
      <div className="p-4">
        {isLoading && models.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">모델 목록을 불러오는 중...</span>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🤖</div>
            <p className="text-gray-600">최신 Gemini Flash/Pro 모델을 불러올 수 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => (
              <div
                key={model.id}
                onClick={() => onSelectModel?.(model)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedModel?.id === model.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                    <p className="text-sm text-gray-500">ID: {model.id}</p>
                  </div>
                  <div className="flex gap-2">
                    {model.multimodal && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                        멀티모달
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded ${
                      model.available 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {model.available ? '사용 가능' : '사용 불가'}
                    </span>
                  </div>
                </div>

                {model.description && (
                  <p className="text-sm text-gray-600 mb-2">{model.description}</p>
                )}

                {showDetails && (
                  <div className="text-xs text-gray-500 space-y-1">
                    {model.version && <div>버전: {model.version}</div>}
                    {model.inputTokenLimit && (
                      <div>입력 토큰 제한: {model.inputTokenLimit.toLocaleString()}</div>
                    )}
                    {model.outputTokenLimit && (
                      <div>출력 토큰 제한: {model.outputTokenLimit.toLocaleString()}</div>
                    )}
                    {model.supportedGenerationMethods && (
                      <div>지원 메서드: {model.supportedGenerationMethods.join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}