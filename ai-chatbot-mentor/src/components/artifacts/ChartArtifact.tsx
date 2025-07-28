'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  Bar,
  Line,
  Pie,
  Doughnut,
  Radar,
  Scatter,
  Bubble
} from 'react-chartjs-2';
import { 
  ChartBarIcon, 
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ChartData } from '@/types';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartArtifactProps {
  content: string;
  className?: string;
}

export function ChartArtifact({
  content,
  className = ''
}: ChartArtifactProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      setChartData(parsed);
      setError(null);
    } catch (err) {
      setError('차트 데이터를 파싱할 수 없습니다.');
      setChartData(null);
    }
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  const handleDownload = () => {
    // 차트를 이미지로 다운로드하는 기능
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = url;
      link.click();
    }
  };

  const getChartTypeDisplayName = (type: string) => {
    const typeMap: Record<string, string> = {
      bar: '막대 차트',
      line: '선 차트',
      pie: '파이 차트',
      doughnut: '도넛 차트',
      radar: '레이더 차트',
      scatter: '산점도',
      bubble: '버블 차트'
    };
    return typeMap[type] || type;
  };

  const renderChart = () => {
    if (!chartData) return null;

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: chartData.options?.plugins?.title?.text || '차트',
        },
      },
      ...chartData.options
    };

    const chartProps = {
      data: chartData.data,
      options: commonOptions
    };

    switch (chartData.type) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'line':
        return <Line {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      case 'radar':
        return <Radar {...chartProps} />;
      case 'scatter':
        return <Scatter {...chartProps} />;
      case 'bubble':
        return <Bubble {...chartProps} />;
      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">지원되지 않는 차트 타입: {chartData.type}</p>
            </div>
          </div>
        );
    }
  };

  const getDatasetCount = () => {
    return chartData?.data?.datasets?.length || 0;
  };

  const getDataPointCount = () => {
    return chartData?.data?.labels?.length || 0;
  };

  if (error) {
    return (
      <div className={`bg-white border border-red-200 rounded-lg overflow-hidden ${className}`}>
        <div className="flex items-center justify-between px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">차트 오류</span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center text-red-600">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-red-900">차트를 표시할 수 없습니다</h3>
            <p className="mt-1 text-sm text-red-500">{error}</p>
          </div>
          
          <div className="mt-4">
            <details className="bg-red-50 rounded-lg p-3">
              <summary className="text-sm font-medium text-red-700 cursor-pointer">
                원본 데이터 보기
              </summary>
              <pre className="mt-2 text-xs text-red-600 overflow-auto">
                {content}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 차트 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {chartData ? getChartTypeDisplayName(chartData.type) : '차트'}
          </span>
          {chartData && (
            <span className="text-xs text-gray-500">
              {getDatasetCount()}개 데이터셋 · {getDataPointCount()}개 데이터 포인트
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
            PNG 다운로드
          </button>
          
          <button
            onClick={handleCopy}
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
            {copied ? '복사됨!' : '데이터 복사'}
          </button>
        </div>
      </div>

      {/* 차트 내용 */}
      <div className="p-4">
        <div className="h-96">
          {renderChart()}
        </div>
      </div>

      {/* 차트 정보 */}
      {chartData && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">차트 타입:</span> {getChartTypeDisplayName(chartData.type)}
            </div>
            <div>
              <span className="font-medium">데이터셋:</span> {getDatasetCount()}개
            </div>
            <div>
              <span className="font-medium">데이터 포인트:</span> {getDataPointCount()}개
            </div>
            <div>
              <span className="font-medium">생성 시간:</span> {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* 데이터 소스 */}
      <details className="border-t border-gray-200">
        <summary className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
          차트 데이터 소스 보기
        </summary>
        <div className="p-4 bg-gray-50">
          <pre className="text-xs text-gray-600 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(chartData, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}