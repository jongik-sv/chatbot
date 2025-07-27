// components/mbti/MBTIRecommendations.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import MBTICompatibility from './MBTICompatibility';

interface MentorRecommendation {
  mentorType: string;
  characteristics: {
    type: string;
    name: string;
    nickname: string;
    description: string;
    strengths: string[];
    communicationStyle: string;
    mentorStyle: string;
    preferredTopics: string[];
  };
  compatibility: {
    compatibility: 'excellent' | 'good' | 'fair' | 'challenging';
    score: number;
    description: string;
    tips: string[];
  };
  systemPrompt: string;
}

interface MBTIRecommendationsProps {
  userType: string;
  onMentorSelect?: (mentorType: string, systemPrompt: string) => void;
  maxRecommendations?: number;
  className?: string;
}

const MBTIRecommendations: React.FC<MBTIRecommendationsProps> = ({
  userType,
  onMentorSelect,
  maxRecommendations = 3,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [expandedMentor, setExpandedMentor] = useState<string | null>(null);

  useEffect(() => {
    if (userType) {
      fetchRecommendations();
    }
  }, [userType, maxRecommendations]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/mbti/recommend?userType=${userType}&count=${maxRecommendations}`
      );
      
      if (!response.ok) {
        throw new Error('멘토 추천에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        throw new Error(data.error || '멘토 추천 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMentorSelect = (recommendation: MentorRecommendation) => {
    setSelectedMentor(recommendation.mentorType);
    onMentorSelect?.(recommendation.mentorType, recommendation.systemPrompt);
  };

  const getCompatibilityColor = (level: string): string => {
    switch (level) {
      case 'excellent': return 'border-green-300 bg-green-50';
      case 'good': return 'border-blue-300 bg-blue-50';
      case 'fair': return 'border-yellow-300 bg-yellow-50';
      case 'challenging': return 'border-red-300 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRankBadge = (index: number): string => {
    switch (index) {
      case 0: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 1: return 'bg-gray-100 text-gray-800 border-gray-300';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getRankText = (index: number): string => {
    switch (index) {
      case 0: return '최고 추천';
      case 1: return '2순위';
      case 2: return '3순위';
      default: return `${index + 1}순위`;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">멘토 추천 분석 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <InformationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchRecommendations}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">추천할 수 있는 멘토가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 */}
      <div className="text-center">
        <SparklesIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {userType} 성격에 맞는 추천 멘토
        </h2>
        <p className="text-gray-600">
          당신의 성격 유형과 가장 잘 맞는 멘토들을 추천해드립니다.
        </p>
      </div>

      {/* 추천 멘토 목록 */}
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <div
            key={recommendation.mentorType}
            className={`
              border-2 rounded-lg p-6 transition-all duration-200 cursor-pointer
              ${getCompatibilityColor(recommendation.compatibility.compatibility)}
              ${selectedMentor === recommendation.mentorType 
                ? 'ring-2 ring-blue-500 border-blue-500' 
                : 'hover:shadow-md'
              }
            `}
            onClick={() => handleMentorSelect(recommendation)}
          >
            {/* 멘토 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                {/* 순위 배지 */}
                <div className={`
                  px-3 py-1 rounded-full text-xs font-medium border
                  ${getRankBadge(index)}
                `}>
                  {getRankText(index)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {recommendation.characteristics.type}
                    </h3>
                    <span className="text-lg text-gray-700">
                      {recommendation.characteristics.name}
                    </span>
                    {selectedMentor === recommendation.mentorType && (
                      <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 font-medium mb-2">
                    {recommendation.characteristics.nickname}
                  </p>
                  
                  <p className="text-gray-700">
                    {recommendation.characteristics.description}
                  </p>
                </div>
              </div>

              {/* 호환성 점수 */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {recommendation.compatibility.score}
                </div>
                <div className="text-sm text-gray-600">점</div>
              </div>
            </div>

            {/* 멘토 특성 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">강점</h4>
                <div className="flex flex-wrap gap-1">
                  {recommendation.characteristics.strengths.slice(0, 3).map((strength, idx) => (
                    <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">선호 주제</h4>
                <div className="flex flex-wrap gap-1">
                  {recommendation.characteristics.preferredTopics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 멘토링 스타일 */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">멘토링 스타일</h4>
              <p className="text-sm text-gray-600">{recommendation.characteristics.mentorStyle}</p>
            </div>

            {/* 확장/축소 버튼 */}
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedMentor(
                    expandedMentor === recommendation.mentorType 
                      ? null 
                      : recommendation.mentorType
                  );
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {expandedMentor === recommendation.mentorType ? '숨기기' : '상세 보기'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMentorSelect(recommendation);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                <span>이 멘토와 대화하기</span>
              </button>
            </div>

            {/* 확장된 상세 정보 */}
            {expandedMentor === recommendation.mentorType && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                <MBTICompatibility
                  userType={userType}
                  mentorType={recommendation.mentorType}
                  showDetails={true}
                />

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">소통 스타일</h4>
                  <p className="text-sm text-gray-600">
                    {recommendation.characteristics.communicationStyle}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">모든 강점</h4>
                  <div className="flex flex-wrap gap-1">
                    {recommendation.characteristics.strengths.map((strength, idx) => (
                      <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">모든 선호 주제</h4>
                  <div className="flex flex-wrap gap-1">
                    {recommendation.characteristics.preferredTopics.map((topic, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 선택된 멘토 요약 */}
      {selectedMentor && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          {(() => {
            const selected = recommendations.find(r => r.mentorType === selectedMentor);
            return selected ? (
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-bold text-blue-900">
                    {selected.characteristics.type} 멘토를 선택했습니다
                  </h3>
                  <p className="text-blue-700">
                    {selected.characteristics.name} ({selected.characteristics.nickname})
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    호환성: {selected.compatibility.score}점 - {selected.compatibility.description}
                  </p>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default MBTIRecommendations;