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
  '?��????�는', '친근??, '?�문?�인', '창의?�인', '?�리?�인',
  '공감?�인', '격려?�는', '체계?�인', '?�연??, '?�내???�는',
  '?�정?�인', '?�중??, '직�??�인', '분석?�인', '?�력?�인'
];

const COMMON_EXPERTISE = [
  '?�로그래�?, '?�이???�이?�스', '??개발', '모바??개발',
  '?�공지??, '머신?�닝', '?�자??, 'UX/UI', '마�???,
  '비즈?�스', '창업', '?�기계발', '?�어?�습', '?�학',
  '과학', '문학', '??��', '철학', '?�리??
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
      alert('멘토 ?�름???�력?�주?�요.');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('멘토 ?�명???�력?�주?�요.');
      return;
    }
    
    if (!formData.systemPrompt.trim()) {
      alert('?�스???�롬?�트�??�력?�주?�요.');
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
    
    let prompt = `?�신?� "${name}"?�는 ?�름??AI 멘토?�니??\n\n`;
    prompt += `?�명: ${description}\n\n`;
    
    if (expertise.length > 0) {
      prompt += `?�문 분야: ${expertise.join(', ')}\n\n`;
    }
    
    if (mbtiType) {
      prompt += `MBTI ?�형: ${mbtiType}\n\n`;
    }
    
    if (personality.traits.length > 0) {
      prompt += `?�격 ?�성:\n`;
      prompt += `- ?�징: ${personality.traits.join(', ')}\n`;
      if (personality.communicationStyle) {
        prompt += `- ?�통 ?��??? ${personality.communicationStyle}\n`;
      }
      if (personality.teachingApproach) {
        prompt += `- 교육 방식: ${personality.teachingApproach}\n`;
      }
      if (personality.responseStyle) {
        prompt += `- ?�답 ?��??? ${personality.responseStyle}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `?�의 ?�성??바탕?�로 ?�용?��? ?�호?�용?�며, ??�� ?��????�고 건설?�인 조언???�공?�세?? `;
    prompt += `?�용?�의 질문???�???�문?�을 바탕?�로 명확?�고 ?�해?�기 ?�운 ?��????�공?�세??`;
    
    setFormData(prev => ({ ...prev, systemPrompt: prompt }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {mentor ? '멘토 ?�정' : '??멘토 ?�성'}
        </h2>
        <p className="mt-2 text-gray-600">
          개인?�된 AI 멘토�??�성?�여 맞춤??조언??받아보세??
        </p>
      </div>

      {/* ???�비게이??*/}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'basic', label: '기본 ?�보' },
            { id: 'personality', label: '?�격 ?�정' },
            { id: 'prompt', label: '?�스???�롬?�트' }
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
        {/* 기본 ?�보 ??*/}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                멘토 ?�름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? ?�로그래�?멘토"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                멘토 ?�명 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="??멘토가 ?�떤 ?��???�????�는지 ?�명?�주?�요."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MBTI ?�형 (?�택?�항)
              </label>
              <select
                value={formData.mbtiType}
                onChange={(e) => setFormData(prev => ({ ...prev, mbtiType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">?�택?��? ?�음</option>
                {MBTI_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ?�문 분야
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
                  placeholder="?�문 분야 ?�력"
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
                  추�?
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
                ?�른 ?�용?��? 공유 (공개 멘토�??�정)
              </label>
            </div>
          </div>
        )}

        {/* ?�격 ?�정 ??*/}
        {activeTab === 'personality' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ?�격 ?�성
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
                  placeholder="?�격 ?�성 ?�력"
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
                  추�?
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
                ?�통 ?��???
              </label>
              <textarea
                value={formData.personality.communicationStyle}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, communicationStyle: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? 친근?�고 ?�해?�기 ?�운 방식?�로 ?�통?�니??
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? ?�계별로 차근차근 ?�명?�며 ?�습???�해 ?�습???�습?�다"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ?�답 ?��???
              </label>
              <textarea
                value={formData.personality.responseStyle}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, responseStyle: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? 명확?�고 구체?�인 ?��????�공?�니??
              />
            </div>
          </div>
        )}

        {/* ?�스???�롬?�트 ??*/}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                ?�스???�롬?�트 *
              </label>
              <button
                type="button"
                onClick={generateDefaultPrompt}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                ?�동 ?�성
              </button>
            </div>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="멘토???�동�??�답 방식???�의?�는 ?�스???�롬?�트�??�력?�세??.."
              required
            />
            <p className="text-sm text-gray-500">
              ?�스???�롬?�트??AI 멘토???�격�??�동 방식??결정?�니?? 
              ?�의 기본 ?�보?� ?�격 ?�정??바탕?�로 ?�동 ?�성?????�습?�다.
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
            {isLoading ? '?�??�?..' : (mentor ? '?�정' : '?�성')}
          </button>
        </div>
      </form>
    </div>
  );
}
