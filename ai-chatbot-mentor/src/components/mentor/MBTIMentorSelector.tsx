// components/mentor/MBTIMentorSelector.tsx
'use client';

import React, { useState } from 'react';
import { Mentor } from '../../types';

interface MBTIMentorSelectorProps {
  onSelectMBTI: (mbtiType: string) => void;
  onCreateCustomMentor: () => void;
  isLoading?: boolean;
}

const MBTI_TYPES = [
  {
    type: 'INTJ',
    name: '건축가',
    description: '전략적이고 체계적인 사고를 가진 멘토',
    traits: ['전략적', '독립적', '체계적', '미래지향적'],
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    type: 'INTP',
    name: '논리술사',
    description: '논리적이고 창의적인 사고를 가진 멘토',
    traits: ['논리적', '창의적', '분석적', '호기심 많은'],
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    type: 'ENTJ',
    name: '통솔자',
    description: '리더십과 결단력을 가진 멘토',
    traits: ['리더십', '결단력', '효율적', '목표지향적'],
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    type: 'ENTP',
    name: '변론가',
    description: '혁신적이고 도전적인 사고를 가진 멘토',
    traits: ['혁신적', '도전적', '유연한', '창의적'],
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    type: 'INFJ',
    name: '옹호자',
    description: '통찰력과 공감능력을 가진 멘토',
    traits: ['통찰력', '공감적', '이상주의적', '신중한'],
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    type: 'INFP',
    name: '중재자',
    description: '창의적이고 이상주의적인 멘토',
    traits: ['창의적', '이상주의적', '개방적', '적응적'],
    color: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    type: 'ENFJ',
    name: '선도자',
    description: '카리스마와 영감을 주는 멘토',
    traits: ['카리스마', '영감을 주는', '협력적', '이타적'],
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    type: 'ENFP',
    name: '활동가',
    description: '열정적이고 창의적인 멘토',
    traits: ['열정적', '창의적', '사교적', '영감을 주는'],
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    type: 'ISTJ',
    name: '현실주의자',
    description: '신뢰할 수 있고 체계적인 멘토',
    traits: ['신뢰할 수 있는', '체계적', '실용적', '책임감 있는'],
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  {
    type: 'ISFJ',
    name: '수호자',
    description: '따뜻하고 배려심 깊은 멘토',
    traits: ['따뜻한', '배려심 깊은', '신중한', '협력적'],
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    type: 'ESTJ',
    name: '경영자',
    description: '조직적이고 실용적인 멘토',
    traits: ['조직적', '실용적', '결단력 있는', '효율적'],
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    type: 'ESFJ',
    name: '집정관',
    description: '사교적이고 협력적인 멘토',
    traits: ['사교적', '협력적', '배려심 있는', '조화로운'],
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    type: 'ISTP',
    name: '장인',
    description: '실용적이고 적응력 있는 멘토',
    traits: ['실용적', '적응력 있는', '논리적', '독립적'],
    color: 'bg-slate-100 text-slate-800 border-slate-200'
  },
  {
    type: 'ISFP',
    name: '모험가',
    description: '예술적이고 유연한 멘토',
    traits: ['예술적', '유연한', '개방적', '친근한'],
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    type: 'ESTP',
    name: '사업가',
    description: '활동적이고 실용적인 멘토',
    traits: ['활동적', '실용적', '사교적', '적응적'],
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    type: 'ESFP',
    name: '연예인',
    description: '활발하고 친근한 멘토',
    traits: ['활발한', '친근한', '낙관적', '유연한'],
    color: 'bg-rose-100 text-rose-800 border-rose-200'
  }
];

export default function MBTIMentorSelector({ 
  onSelectMBTI, 
  onCreateCustomMentor, 
  isLoading = false 
}: MBTIMentorSelectorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSelectMBTI = (mbtiType: string) => {
    setSelectedType(mbtiType);
    onSelectMBTI(mbtiType);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          MBTI 기반 멘토 선택
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          당신의 성격 유형에 맞는 멘토를 선택하거나, 직접 커스텀 멘토를 만들어보세요.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCreateCustomMentor}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            커스텀 멘토 생성
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">멘토를 생성하는 중...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MBTI_TYPES.map((mbti) => (
          <div
            key={mbti.type}
            className={`bg-white rounded-lg shadow-md border-2 hover:shadow-lg transition-all cursor-pointer ${
              selectedType === mbti.type ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
            }`}
            onClick={() => handleSelectMBTI(mbti.type)}
          >
            <div className="p-6">
              {/* MBTI 타입 헤더 */}
              <div className="text-center mb-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${mbti.color}`}>
                  {mbti.type}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">
                  {mbti.name}
                </h3>
              </div>

              {/* 설명 */}
              <p className="text-gray-600 text-sm text-center mb-4">
                {mbti.description}
              </p>

              {/* 특성 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">주요 특성:</h4>
                <div className="flex flex-wrap gap-1">
                  {mbti.traits.map((trait, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* 선택 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectMBTI(mbti.type);
                }}
                className={`w-full mt-4 px-4 py-2 rounded-md transition-colors ${
                  selectedType === mbti.type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isLoading}
              >
                {selectedType === mbti.type ? '선택됨' : '이 멘토 선택'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 설명 */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          MBTI 멘토 시스템이란?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🎯 개인화된 멘토링</h4>
            <p>각 MBTI 유형의 특성에 맞는 커뮤니케이션 스타일과 교육 방식을 제공합니다.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🤝 최적의 상호작용</h4>
            <p>당신의 성격 유형을 이해하고 가장 효과적인 방식으로 조언을 제공합니다.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">📚 전문적인 지식</h4>
            <p>각 유형별 강점을 활용한 전문적이고 체계적인 학습 가이드를 제공합니다.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🔄 지속적인 개선</h4>
            <p>대화를 통해 점점 더 개인화된 멘토링을 받을 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}