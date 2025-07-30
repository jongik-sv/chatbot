'use client';

import React, { useState, useEffect } from 'react';
import { MBTIType, MBTIProfile, MBTICompatibility } from '@/types';
import { StarIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface MBTIMentorSelectorProps {
  userMBTI?: MBTIType;
  onMentorSelect: (mentorType: MBTIType, compatibility?: MBTICompatibility) => void;
  selectedMentorType?: MBTIType;
  showCompatibility?: boolean;
}

interface MentorRecommendation {
  mentorType: MBTIType;
  profile: MBTIProfile;
  compatibility: MBTICompatibility;
  systemPrompt: string;
}

export default function MBTIMentorSelector({ 
  userMBTI, 
  onMentorSelect, 
  selectedMentorType,
  showCompatibility = true 
}: MBTIMentorSelectorProps) {
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([]);
  const [allProfiles, setAllProfiles] = useState<Record<MBTIType, MBTIProfile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'recommended' | 'all'>('recommended');

  useEffect(() => {
    fetchMBTIProfiles();
    if (userMBTI) {
      fetchRecommendations();
    }
  }, [userMBTI]);

  const fetchMBTIProfiles = async () => {
    try {
      const response = await fetch('/api/mbti/types');
      const data = await response.json();
      
      if (data.success) {
        const profilesMap: Record<MBTIType, MBTIProfile> = {};
        data.types.forEach((type: any) => {
          profilesMap[type.type as MBTIType] = {
            type: type.type,
            name: type.name,
            nickname: type.nickname,
            description: type.description,
            strengths: type.strengths,
            weaknesses: type.weaknesses,
            communicationStyle: type.communicationStyle,
            learningPreferences: type.preferredTopics || [],
            motivations: type.preferredTopics || [],
            stressors: type.avoidTopics || [],
            workStyle: type.mentorStyle || '',
            decisionMaking: '',
            relationshipStyle: '',
            cognitiveStack: {
              dominant: '',
              auxiliary: '',
              tertiary: '',
              inferior: ''
            }
          };
        });
        setAllProfiles(profilesMap);
      }
    } catch (error) {
      console.error('MBTI 프로필 조회 실패:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!userMBTI) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/mbti/recommend?userType=${userMBTI}&count=6`);
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || '추천 멘토를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError('추천 멘토를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMentorSelect = (mentorType: MBTIType) => {
    const recommendation = recommendations.find(r => r.mentorType === mentorType);
    onMentorSelect(mentorType, recommendation?.compatibility);
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCompatibilityStars = (score: number) => {
    const fullStars = Math.floor(score / 2);
    const hasHalfStar = score % 2 >= 1;
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarSolidIcon key={i} className="w-4 h-4 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-yellow-400" />);
      } else {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-gray-500" />);
      }
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">멘토 추천을 분석하는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <SparklesIcon className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">MBTI 멘토 선택</h2>
        <p className="text-gray-600">
          {userMBTI 
            ? `${userMBTI} 유형에 맞는 멘토를 추천해드립니다.` 
            : '원하는 MBTI 멘토를 선택하세요.'
          }
        </p>
      </div>

      {/* 보기 모드 선택 */}
      {userMBTI && (
        <div className="flex justify-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('recommended')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'recommended' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            추천 멘토
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'all' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체 멘토
          </button>
        </div>
      )}

      {/* 추천 멘토 표시 */}
      {(viewMode === 'recommended' || !userMBTI) && recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <StarSolidIcon className="w-5 h-5 text-yellow-500 mr-2" />
            추천 멘토
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((recommendation, index) => (
              <div
                key={recommendation.mentorType}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedMentorType === recommendation.mentorType
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => handleMentorSelect(recommendation.mentorType)}
              >
                {/* 추천 순위 */}
                <div className="absolute top-2 right-2">
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                    #{index + 1}
                  </span>
                </div>

                {/* 선택 표시 */}
                {selectedMentorType === recommendation.mentorType && (
                  <div className="absolute top-2 left-2">
                    <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                  </div>
                )}

                {/* 멘토 정보 */}
                <div className="space-y-3 mt-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {recommendation.mentorType}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {recommendation.profile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {recommendation.profile.nickname}
                    </p>
                  </div>

                  {/* 호환성 점수 */}
                  {showCompatibility && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">호환성</span>
                        <div className="flex items-center space-x-1">
                          {getCompatibilityStars(recommendation.compatibility.compatibilityScore)}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full text-center ${
                        getCompatibilityColor(recommendation.compatibility.compatibilityScore)
                      }`}>
                        {recommendation.compatibility.compatibilityScore}/10
                      </div>
                    </div>
                  )}

                  {/* 주요 강점 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">주요 특징</h5>
                    <div className="flex flex-wrap gap-1">
                      {recommendation.profile.strengths.slice(0, 2).map((strength, idx) => (
                        <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 호환성 장점 */}
                  {showCompatibility && recommendation.compatibility.strengths.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">호환성 장점</h5>
                      <p className="text-xs text-gray-600">
                        {recommendation.compatibility.strengths[0]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 멘토 표시 */}
      {viewMode === 'all' && Object.keys(allProfiles).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">전체 MBTI 멘토</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Object.values(allProfiles).map((profile) => (
              <button
                key={profile.type}
                onClick={() => handleMentorSelect(profile.type)}
                className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                  selectedMentorType === profile.type
                    ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="font-bold text-sm">{profile.type}</div>
                <div className="text-xs text-gray-600 mt-1">{profile.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 멘토 상세 정보 */}
      {selectedMentorType && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                선택된 멘토: {selectedMentorType}
              </h3>
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            
            {(() => {
              const selectedProfile = allProfiles[selectedMentorType];
              const selectedRecommendation = recommendations.find(r => r.mentorType === selectedMentorType);
              
              return selectedProfile ? (
                <div className="space-y-3">
                  <p className="text-gray-700">{selectedProfile.description}</p>
                  
                  {selectedRecommendation && showCompatibility && (
                    <div className="bg-white rounded-lg p-4 border">
                      <h4 className="font-semibold text-gray-800 mb-2">호환성 분석</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>호환성 점수:</span>
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {getCompatibilityStars(selectedRecommendation.compatibility.compatibilityScore)}
                            </div>
                            <span className="font-bold">
                              {selectedRecommendation.compatibility.compatibilityScore}/10
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">상호작용 팁:</h5>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {selectedRecommendation.compatibility.communicationTips.slice(0, 2).map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}