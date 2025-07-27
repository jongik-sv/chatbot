// components/mbti/MBTICompatibility.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { HeartIcon, StarIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface CompatibilityData {
  userType: string;
  mentorType: string;
  compatibility: 'excellent' | 'good' | 'fair' | 'challenging';
  score: number;
  description: string;
  tips: string[];
}

interface MBTICompatibilityProps {
  userType: string;
  mentorType: string;
  showDetails?: boolean;
  className?: string;
}

const MBTICompatibility: React.FC<MBTICompatibilityProps> = ({
  userType,
  mentorType,
  showDetails = true,
  className = ''
}) => {
  const [compatibility, setCompatibility] = useState<CompatibilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userType && mentorType) {
      fetchCompatibility();
    }
  }, [userType, mentorType]);

  const fetchCompatibility = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/mbti/compatibility?userType=${userType}&mentorType=${mentorType}`
      );
      
      if (!response.ok) {
        throw new Error('호환성 분석에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setCompatibility(data.compatibility);
      } else {
        throw new Error(data.error || '호환성 분석 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (level: string): string => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'challenging': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCompatibilityText = (level: string): string => {
    switch (level) {
      case 'excellent': return '매우 좋음';
      case 'good': return '좋음';
      case 'fair': return '보통';
      case 'challenging': return '도전적';
      default: return '알 수 없음';
    }
  };

  const getCompatibilityIcon = (level: string) => {
    switch (level) {
      case 'excellent': return <HeartIcon className="w-5 h-5" />;
      case 'good': return <StarIcon className="w-5 h-5" />;
      case 'fair': return <LightBulbIcon className="w-5 h-5" />;
      case 'challenging': return <LightBulbIcon className="w-5 h-5" />;
      default: return <LightBulbIcon className="w-5 h-5" />;
    }
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">호환성 분석 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (!compatibility) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getCompatibilityColor(compatibility.compatibility)}`}>
            {getCompatibilityIcon(compatibility.compatibility)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">MBTI 호환성</h3>
            <p className="text-sm text-gray-600">
              {userType} ↔ {mentorType}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCompatibilityColor(compatibility.compatibility)}`}>
            {getCompatibilityText(compatibility.compatibility)}
          </div>
        </div>
      </div>

      {/* 점수 바 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">호환성 점수</span>
          <span className="text-lg font-bold text-gray-900">{compatibility.score}/100</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(compatibility.score)}`}
            style={{ width: `${compatibility.score}%` }}
          />
        </div>
      </div>

      {/* 설명 */}
      <div className="mb-4">
        <p className="text-gray-700">{compatibility.description}</p>
      </div>

      {/* 상세 정보 */}
      {showDetails && compatibility.tips.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <LightBulbIcon className="w-4 h-4 mr-2 text-yellow-500" />
            상호작용 팁
          </h4>
          
          <ul className="space-y-2">
            {compatibility.tips.map((tip, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></span>
                <span className="text-sm text-gray-600">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MBTICompatibility;