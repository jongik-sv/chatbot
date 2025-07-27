// components/mbti/MBTISelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { UserIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface MBTIType {
  type: string;
  name: string;
  nickname: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  communicationStyle: string;
  mentorStyle: string;
  preferredTopics: string[];
  avoidTopics: string[];
}

interface MBTISelectorProps {
  onMBTISelect?: (mbtiType: string) => void;
  selectedMBTI?: string;
  showRecommendations?: boolean;
  className?: string;
}

const MBTISelector: React.FC<MBTISelectorProps> = ({
  onMBTISelect,
  selectedMBTI,
  showRecommendations = true,
  className = ''
}) => {
  const [mbtiTypes, setMbtiTypes] = useState<MBTIType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(selectedMBTI || '');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchMBTITypes();
  }, []);

  const fetchMBTITypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mbti/types');
      
      if (!response.ok) {
        throw new Error('MBTI 유형을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setMbtiTypes(data.types);
      } else {
        throw new Error(data.error || 'MBTI 유형 조회 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMBTISelect = (mbtiType: string) => {
    setSelectedType(mbtiType);
    onMBTISelect?.(mbtiType);
  };

  const getMBTIGroupColor = (type: string): string => {
    const firstLetter = type.charAt(0);
    const lastLetter = type.charAt(3);
    
    // NT (분석가) - 보라색
    if ((firstLetter === 'I' || firstLetter === 'E') && type.includes('NT')) {
      return 'bg-purple-100 border-purple-300 hover:bg-purple-200';
    }
    // NF (외교관) - 초록색
    if ((firstLetter === 'I' || firstLetter === 'E') && type.includes('NF')) {
      return 'bg-green-100 border-green-300 hover:bg-green-200';
    }
    // SJ (관리자) - 파란색
    if ((firstLetter === 'I' || firstLetter === 'E') && type.includes('SJ')) {
      return 'bg-blue-100 border-blue-300 hover:bg-blue-200';
    }
    // SP (탐험가) - 노란색
    if ((firstLetter === 'I' || firstLetter === 'E') && type.includes('SP')) {
      return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200';
    }
    
    return 'bg-gray-100 border-gray-300 hover:bg-gray-200';
  };

  const getMBTIGroupName = (type: string): string => {
    if (type.includes('NT')) return '분석가';
    if (type.includes('NF')) return '외교관';
    if (type.includes('SJ')) return '관리자';
    if (type.includes('SP')) return '탐험가';
    return '';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">MBTI 유형을 불러오는 중...</span>
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
          onClick={fetchMBTITypes}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // MBTI 그룹별로 분류
  const mbtiGroups = {
    '분석가 (NT)': mbtiTypes.filter(type => type.type.includes('NT')),
    '외교관 (NF)': mbtiTypes.filter(type => type.type.includes('NF')),
    '관리자 (SJ)': mbtiTypes.filter(type => type.type.includes('SJ')),
    '탐험가 (SP)': mbtiTypes.filter(type => type.type.includes('SP'))
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 */}
      <div className="text-center">
        <UserIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">MBTI 성격 유형 선택</h2>
        <p className="text-gray-600">
          당신의 MBTI 성격 유형을 선택하면 맞춤형 멘토를 추천해드립니다.
        </p>
      </div>

      {/* MBTI 그룹별 표시 */}
      {Object.entries(mbtiGroups).map(([groupName, types]) => (
        <div key={groupName} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
            {groupName}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {types.map((mbtiType) => (
              <div key={mbtiType.type} className="relative">
                <button
                  onClick={() => handleMBTISelect(mbtiType.type)}
                  className={`
                    w-full p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${getMBTIGroupColor(mbtiType.type)}
                    ${selectedType === mbtiType.type 
                      ? 'ring-2 ring-blue-500 border-blue-500' 
                      : ''
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {mbtiType.type}
                    </span>
                    {selectedType === mbtiType.type && (
                      <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-800">{mbtiType.name}</p>
                    <p className="text-sm text-gray-600">{mbtiType.nickname}</p>
                  </div>
                </button>

                {/* 상세 정보 버튼 */}
                <button
                  onClick={() => setShowDetails(showDetails === mbtiType.type ? null : mbtiType.type)}
                  className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
                >
                  <InformationCircleIcon className="w-4 h-4" />
                </button>

                {/* 상세 정보 패널 */}
                {showDetails === mbtiType.type && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-w-md">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">설명</h4>
                        <p className="text-sm text-gray-600">{mbtiType.description}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">강점</h4>
                        <div className="flex flex-wrap gap-1">
                          {mbtiType.strengths.slice(0, 3).map((strength, index) => (
                            <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">멘토링 스타일</h4>
                        <p className="text-sm text-gray-600">{mbtiType.mentorStyle}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 선택된 MBTI 요약 */}
      {selectedType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          {(() => {
            const selected = mbtiTypes.find(type => type.type === selectedType);
            return selected ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      {selected.type} - {selected.name}
                    </h3>
                    <p className="text-blue-700">{selected.nickname}</p>
                  </div>
                </div>
                
                <p className="text-blue-800">{selected.description}</p>
                
                <div className="flex items-center space-x-2 text-sm text-blue-700">
                  <span className="font-medium">그룹:</span>
                  <span className="bg-blue-200 px-2 py-1 rounded">
                    {getMBTIGroupName(selected.type)}
                  </span>
                </div>

                {showRecommendations && (
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-sm text-blue-700">
                      🎯 이 성격 유형에 맞는 멘토를 추천해드리겠습니다!
                    </p>
                  </div>
                )}
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default MBTISelector;