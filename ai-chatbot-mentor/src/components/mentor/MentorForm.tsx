// components/mentor/MentorForm.tsx
'use client';

import React, { useState } from 'react';
import { Mentor, MentorPersonality } from '../../types';

interface MentorFormProps {
  mentor?: Mentor;
  onSubmit: (mentorData: MentorFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface MentorFormData {
  name: string;
  description: string;
  personality: MentorPersonality;
  expertise: string[];
  mbtiType?: string;
  systemPrompt: string;
  isPublic: boolean;
}

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const COMMON_TRAITS = [
  '도움이 되는', '친근한', '전문적인', '창의적인', '논리적인',
  '공감적인', '격려하는', '체계적인', '유연한', '인내심 있는',
  '열정적인', '신중한', '직관적인', '분석적인', '협력적인'
];

const COMMON_EXPERTISE = [
  '프로그래밍', '데이터 사이언스', '웹 개발', '모바일 개발',
  '인공지능', '머신러닝', '디자인', 'UX/UI', '마케팅',
  '비즈니스', '창업', '자기계발', '언어학습', '수학',
  '과학', '문학', '역사', '철학', '심리학'
];

export default function MentorForm({ mentor, onSubmit, onCancel, isLoading = false }: MentorFormProps) {
  const [formData, setFormData] = useState<MentorFormData>({
    name: mentor?.name || '',
    description: mentor?.description || '',
    personality: mentor?.personality || {
      traits: [],
      communicationStyle: '',
      teachingApproach: '',
      responseStyle: ''
    },
    expertise: mentor?.expertise || [],
    mbtiType: mentor?.mbtiType || '',
    systemPrompt: mentor?.systemPrompt || '',
    isPublic: mentor?.isPublic || false
  });

  const [newTrait, setNewTrait] = useState('');
  const [newExpertise, setNewExpertise] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'personality' | 'prompt'>('basic');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('멘토 이름을 입력해주세요.');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('멘토 설명을 입력해주세요.');
      return;
    }
    
    if (!formData.systemPrompt.trim()) {
      alert('시스템 프롬프트를 입력해주세요.');
      return;
    }

    await onSubmit(formData);
  };

  const addTrait = (trait: string) => {
    if (trait && !formData.personality.traits.includes(trait)) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          traits: [...prev.personality.traits, trait]
        }
      }));
    }
  };

  const removeTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: prev.personality.traits.filter(t => t !== trait)
      }
    }));
  };

  const addExpertise = (expertise: string) => {
    if (expertise && !formData.expertise.includes(expertise)) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, expertise]
      }));
    }
  };

  const removeExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter(e => e !== expertise)
    }));
  };

  const generateDefaultPrompt = () => {
    const { name, description, personality, expertise, mbtiType } = formData;
    
    let prompt = `당신은 "${name}"라는 이름의 AI 멘토입니다.\n\n`;
    prompt += `설명: ${description}\n\n`;
    
    if (expertise.length > 0) {
      prompt += `전문 분야: ${expertise.join(', ')}\n\n`;
    }
    
    if (mbtiType) {
      prompt += `MBTI 유형: ${mbtiType}\n\n`;
    }
    
    if (personality.traits.length > 0) {
      prompt += `성격 특성:\n`;
      prompt += `- 특징: ${personality.traits.join(', ')}\n`;
      if (personality.communicationStyle) {
        prompt += `- 소통 스타일: ${personality.communicationStyle}\n`;
      }
      if (personality.teachingApproach) {
        prompt += `- 교육 방식: ${personality.teachingApproach}\n`;
      }
      if (personality.responseStyle) {
        prompt += `- 응답 스타일: ${personality.responseStyle}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `위의 특성을 바탕으로 사용자와 상호작용하며, 항상 도움이 되고 건설적인 조언을 제공하세요. `;
    prompt += `사용자의 질문에 대해 전문성을 바탕으로 명확하고 이해하기 쉬운 답변을 제공하세요.`;
    
    setFormData(prev => ({ ...prev, systemPrompt: prompt }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {mentor ? '멘토 수정' : '새 멘토 생성'}
        </h2>
        <p className="mt-2 text-gray-600">
          개인화된 AI 멘토를 생성하여 맞춤형 조언을 받아보세요.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'basic', label: '기본 정보' },
            { id: 'personality', label: '성격 설정' },
            { id: 'prompt', label: '시스템 프롬프트' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* 기본 정보 탭 */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                멘토 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 프로그래밍 멘토"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                멘토 설명 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이 멘토가 어떤 도움을 줄 수 있는지 설명해주세요."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MBTI 유형 (선택사항)
              </label>
              <select
                value={formData.mbtiType}
                onChange={(e) => setFormData(prev => ({ ...prev, mbtiType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하지 않음</option>
                {MBTI_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전문 분야
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.expertise.map((exp, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {exp}
                    <button
                      type="button"
                      onClick={() => removeExpertise(exp)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="전문 분야 입력"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExpertise(newExpertise);
                      setNewExpertise('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    addExpertise(newExpertise);
                    setNewExpertise('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {COMMON_EXPERTISE.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => addExpertise(exp)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    disabled={formData.expertise.includes(exp)}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                다른 사용자와 공유 (공개 멘토로 설정)
              </label>
            </div>
          </div>
        )}

        {/* 성격 설정 탭 */}
        {activeTab === 'personality' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                성격 특성
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.personality.traits.map((trait, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {trait}
                    <button
                      type="button"
                      onClick={() => removeTrait(trait)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="성격 특성 입력"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTrait(newTrait);
                      setNewTrait('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    addTrait(newTrait);
                    setNewTrait('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {COMMON_TRAITS.map(trait => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => addTrait(trait)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    disabled={formData.personality.traits.includes(trait)}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                소통 스타일
              </label>
              <textarea
                value={formData.personality.communicationStyle}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, communicationStyle: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 친근하고 이해하기 쉬운 방식으로 소통합니다"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                교육 방식
              </label>
              <textarea
                value={formData.personality.teachingApproach}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, teachingApproach: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 단계별로 차근차근 설명하며 실습을 통해 학습을 돕습니다"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                응답 스타일
              </label>
              <textarea
                value={formData.personality.responseStyle}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, responseStyle: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 명확하고 구체적인 답변을 제공합니다"
              />
            </div>
          </div>
        )}

        {/* 시스템 프롬프트 탭 */}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                시스템 프롬프트 *
              </label>
              <button
                type="button"
                onClick={generateDefaultPrompt}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                자동 생성
              </button>
            </div>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="멘토의 행동과 응답 방식을 정의하는 시스템 프롬프트를 입력하세요..."
              required
            />
            <p className="text-sm text-gray-500">
              시스템 프롬프트는 AI 멘토의 성격과 행동 방식을 결정합니다. 
              위의 기본 정보와 성격 설정을 바탕으로 자동 생성할 수 있습니다.
            </p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? '저장 중...' : (mentor ? '수정' : '생성')}
          </button>
        </div>
      </form>
    </div>
  );
}