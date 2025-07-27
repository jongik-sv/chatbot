// components/mentor/MentorSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Mentor } from '../../types';
import { ApiClient } from '../../lib/api';
import MBTIMentorSelector from './MBTIMentorSelector';

interface MentorSelectorProps {
  onSelectMentor: (mentor: Mentor | null) => void;
  currentUserId?: number;
  selectedMentor?: Mentor | null;
}

type ViewMode = 'list' | 'mbti' | 'create';

export default function MentorSelector({ 
  onSelectMentor, 
  currentUserId, 
  selectedMentor 
}: MentorSelectorProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 멘토 목록 로드
  const loadMentors = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.getMentors({ userId: currentUserId });
      setMentors(response.data);
    } catch (error) {
      console.error('Failed to load mentors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      loadMentors();
    }
  }, [viewMode, currentUserId]);

  // MBTI 멘토 생성
  const handleSelectMBTI = async (mbtiType: string) => {
    setIsLoading(true);
    try {
      // MBTI 기반 멘토 생성 API 호출 (MentorService에서 구현된 기능 사용)
      const mentorData = {
        name: `${mbtiType} 멘토`,
        description: `${mbtiType} 성격 유형에 맞는 개인화된 멘토입니다.`,
        personality: {
          traits: getMBTITraits(mbtiType),
          communicationStyle: getMBTICommunicationStyle(mbtiType),
          teachingApproach: getMBTITeachingApproach(mbtiType),
          responseStyle: getMBTIResponseStyle(mbtiType)
        },
        expertise: ['MBTI 상담', '성격 분석', '자기계발'],
        mbtiType,
        systemPrompt: getMBTISystemPrompt(mbtiType),
        isPublic: false,
        userId: currentUserId
      };

      const response = await ApiClient.createMentor(mentorData);
      onSelectMentor(response.data);
      setViewMode('list');
    } catch (error) {
      console.error('Failed to create MBTI mentor:', error);
      alert('MBTI 멘토 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 멘토 선택
  const handleSelectMentor = (mentor: Mentor) => {
    onSelectMentor(mentor);
  };

  // 멘토 선택 해제
  const handleDeselectMentor = () => {
    onSelectMentor(null);
  };

  // 검색 필터링
  const filteredMentors = mentors.filter(mentor =>
    mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.expertise.some(exp => exp.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (viewMode === 'mbti') {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            멘토 목록으로 돌아가기
          </button>
        </div>
        <MBTIMentorSelector
          onSelectMBTI={handleSelectMBTI}
          onCreateCustomMentor={() => setViewMode('create')}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">멘토 선택</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('mbti')}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              MBTI 멘토
            </button>
          </div>
        </div>

        {/* 현재 선택된 멘토 */}
        {selectedMentor && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-blue-600 font-medium">선택된 멘토:</span>
                <span className="ml-2 text-blue-800 font-semibold">{selectedMentor.name}</span>
                {selectedMentor.mbtiType && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {selectedMentor.mbtiType}
                  </span>
                )}
              </div>
              <button
                onClick={handleDeselectMentor}
                className="text-blue-600 hover:text-blue-800"
                title="멘토 선택 해제"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            placeholder="멘토 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">멘토 목록을 불러오는 중...</span>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🤖</div>
            <p className="text-gray-600">
              {searchTerm ? '검색 결과가 없습니다.' : '사용 가능한 멘토가 없습니다.'}
            </p>
            <button
              onClick={() => setViewMode('mbti')}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              MBTI 멘토 생성하기
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* 멘토 선택 해제 옵션 */}
            <div
              onClick={handleDeselectMentor}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                !selectedMentor
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">일반 채팅</div>
                  <div className="text-sm text-gray-500">멘토 없이 일반 AI와 대화</div>
                </div>
              </div>
            </div>

            {/* 멘토 목록 */}
            {filteredMentors.map((mentor) => (
              <div
                key={mentor.id}
                onClick={() => handleSelectMentor(mentor)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMentor?.id === mentor.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white text-sm font-semibold">
                      {mentor.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900 truncate">
                        {mentor.name}
                      </div>
                      {mentor.mbtiType && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                          {mentor.mbtiType}
                        </span>
                      )}
                      {mentor.isPublic && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          공개
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {mentor.description}
                    </div>
                    {mentor.expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {mentor.expertise.slice(0, 3).map((exp, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {exp}
                          </span>
                        ))}
                        {mentor.expertise.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                            +{mentor.expertise.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// MBTI 유형별 헬퍼 함수들
function getMBTITraits(mbtiType: string): string[] {
  const traits: Record<string, string[]> = {
    'INTJ': ['전략적', '독립적', '체계적', '미래지향적'],
    'ENFP': ['열정적', '창의적', '사교적', '영감을 주는'],
    'ISTJ': ['신뢰할 수 있는', '체계적', '실용적', '책임감 있는'],
    'ESFJ': ['따뜻한', '배려심 깊은', '협력적', '조화로운']
  };
  return traits[mbtiType] || ['도움이 되는', '친근한', '전문적인'];
}

function getMBTICommunicationStyle(mbtiType: string): string {
  const styles: Record<string, string> = {
    'INTJ': '논리적이고 직접적인 방식으로 소통합니다',
    'ENFP': '따뜻하고 격려하는 방식으로 소통합니다',
    'ISTJ': '명확하고 체계적인 방식으로 소통합니다',
    'ESFJ': '친근하고 배려심 있는 방식으로 소통합니다'
  };
  return styles[mbtiType] || '친근하고 이해하기 쉬운 방식으로 소통합니다';
}

function getMBTITeachingApproach(mbtiType: string): string {
  const approaches: Record<string, string> = {
    'INTJ': '큰 그림을 제시하고 체계적인 계획을 통해 목표 달성을 돕습니다',
    'ENFP': '창의적인 아이디어와 다양한 가능성을 제시하며 동기부여를 돕습니다',
    'ISTJ': '단계별로 명확한 지침을 제시하며 실용적인 방법을 가르칩니다',
    'ESFJ': '개인의 상황을 고려하여 맞춤형 학습을 지원합니다'
  };
  return approaches[mbtiType] || '단계별로 차근차근 설명하며 실습을 통해 학습을 돕습니다';
}

function getMBTIResponseStyle(mbtiType: string): string {
  const styles: Record<string, string> = {
    'INTJ': '간결하고 핵심적인 조언을 제공합니다',
    'ENFP': '긍정적이고 영감을 주는 답변을 제공합니다',
    'ISTJ': '구체적이고 실용적인 답변을 제공합니다',
    'ESFJ': '따뜻하고 격려하는 답변을 제공합니다'
  };
  return styles[mbtiType] || '명확하고 구체적인 답변을 제공합니다';
}

function getMBTISystemPrompt(mbtiType: string): string {
  const prompts: Record<string, string> = {
    'INTJ': '당신은 INTJ 성격의 멘토로서, 전략적 사고와 장기적 관점으로 조언을 제공합니다. 효율성과 체계성을 중시하며, 사용자가 목표를 달성할 수 있는 구체적인 계획을 제시합니다.',
    'ENFP': '당신은 ENFP 성격의 멘토로서, 열정과 창의성으로 사용자에게 영감을 줍니다. 다양한 가능성을 제시하고 사용자의 잠재력을 발견하도록 도우며, 항상 긍정적이고 격려하는 태도를 유지합니다.',
    'ISTJ': '당신은 ISTJ 성격의 멘토로서, 신뢰할 수 있고 체계적인 조언을 제공합니다. 실용적이고 검증된 방법을 추천하며, 단계별로 명확한 지침을 제시합니다.',
    'ESFJ': '당신은 ESFJ 성격의 멘토로서, 따뜻하고 배려심 있는 조언을 제공합니다. 사용자의 감정과 상황을 고려하며, 협력적이고 조화로운 해결책을 제시합니다.'
  };
  
  return prompts[mbtiType] || `당신은 ${mbtiType} 성격의 멘토입니다. 이 성격 유형의 특성을 반영하여 사용자에게 도움이 되는 조언을 제공하세요.`;
}