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
  '?„ì????˜ëŠ”', 'ì¹œê·¼??, '?„ë¬¸?ì¸', 'ì°½ì˜?ì¸', '?¼ë¦¬?ì¸',
  'ê³µê°?ì¸', 'ê²©ë ¤?˜ëŠ”', 'ì²´ê³„?ì¸', '? ì—°??, '?¸ë‚´???ˆëŠ”',
  '?´ì •?ì¸', '? ì¤‘??, 'ì§ê??ì¸', 'ë¶„ì„?ì¸', '?‘ë ¥?ì¸'
];

const COMMON_EXPERTISE = [
  '?„ë¡œê·¸ë˜ë°?, '?°ì´???¬ì´?¸ìŠ¤', '??ê°œë°œ', 'ëª¨ë°”??ê°œë°œ',
  '?¸ê³µì§€??, 'ë¨¸ì‹ ?¬ë‹', '?”ì??, 'UX/UI', 'ë§ˆì???,
  'ë¹„ì¦ˆ?ˆìŠ¤', 'ì°½ì—…', '?ê¸°ê³„ë°œ', '?¸ì–´?™ìŠµ', '?˜í•™',
  'ê³¼í•™', 'ë¬¸í•™', '??‚¬', 'ì² í•™', '?¬ë¦¬??
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
      alert('ë©˜í†  ?´ë¦„???…ë ¥?´ì£¼?¸ìš”.');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('ë©˜í†  ?¤ëª…???…ë ¥?´ì£¼?¸ìš”.');
      return;
    }
    
    if (!formData.systemPrompt.trim()) {
      alert('?œìŠ¤???„ë¡¬?„íŠ¸ë¥??…ë ¥?´ì£¼?¸ìš”.');
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
    
    let prompt = `?¹ì‹ ?€ "${name}"?¼ëŠ” ?´ë¦„??AI ë©˜í† ?…ë‹ˆ??\n\n`;
    prompt += `?¤ëª…: ${description}\n\n`;
    
    if (expertise.length > 0) {
      prompt += `?„ë¬¸ ë¶„ì•¼: ${expertise.join(', ')}\n\n`;
    }
    
    if (mbtiType) {
      prompt += `MBTI ? í˜•: ${mbtiType}\n\n`;
    }
    
    if (personality.traits.length > 0) {
      prompt += `?±ê²© ?¹ì„±:\n`;
      prompt += `- ?¹ì§•: ${personality.traits.join(', ')}\n`;
      if (personality.communicationStyle) {
        prompt += `- ?Œí†µ ?¤í??? ${personality.communicationStyle}\n`;
      }
      if (personality.teachingApproach) {
        prompt += `- êµìœ¡ ë°©ì‹: ${personality.teachingApproach}\n`;
      }
      if (personality.responseStyle) {
        prompt += `- ?‘ë‹µ ?¤í??? ${personality.responseStyle}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `?„ì˜ ?¹ì„±??ë°”íƒ•?¼ë¡œ ?¬ìš©?ì? ?í˜¸?‘ìš©?˜ë©°, ??ƒ ?„ì????˜ê³  ê±´ì„¤?ì¸ ì¡°ì–¸???œê³µ?˜ì„¸?? `;
    prompt += `?¬ìš©?ì˜ ì§ˆë¬¸???€???„ë¬¸?±ì„ ë°”íƒ•?¼ë¡œ ëª…í™•?˜ê³  ?´í•´?˜ê¸° ?¬ìš´ ?µë????œê³µ?˜ì„¸??`;
    
    setFormData(prev => ({ ...prev, systemPrompt: prompt }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {mentor ? 'ë©˜í†  ?˜ì •' : '??ë©˜í†  ?ì„±'}
        </h2>
        <p className="mt-2 text-gray-600">
          ê°œì¸?”ëœ AI ë©˜í† ë¥??ì„±?˜ì—¬ ë§ì¶¤??ì¡°ì–¸??ë°›ì•„ë³´ì„¸??
        </p>
      </div>

      {/* ???¤ë¹„ê²Œì´??*/}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'basic', label: 'ê¸°ë³¸ ?•ë³´' },
            { id: 'personality', label: '?±ê²© ?¤ì •' },
            { id: 'prompt', label: '?œìŠ¤???„ë¡¬?„íŠ¸' }
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
        {/* ê¸°ë³¸ ?•ë³´ ??*/}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ë©˜í†  ?´ë¦„ *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? ?„ë¡œê·¸ë˜ë°?ë©˜í† "
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ë©˜í†  ?¤ëª… *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="??ë©˜í† ê°€ ?´ë–¤ ?„ì???ì¤????ˆëŠ”ì§€ ?¤ëª…?´ì£¼?¸ìš”."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MBTI ? í˜• (? íƒ?¬í•­)
              </label>
              <select
                value={formData.mbtiType}
                onChange={(e) => setFormData(prev => ({ ...prev, mbtiType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">? íƒ?˜ì? ?ŠìŒ</option>
                {MBTI_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ?„ë¬¸ ë¶„ì•¼
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
                      Ã—
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
                  placeholder="?„ë¬¸ ë¶„ì•¼ ?…ë ¥"
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
                  ì¶”ê?
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
                ?¤ë¥¸ ?¬ìš©?ì? ê³µìœ  (ê³µê°œ ë©˜í† ë¡??¤ì •)
              </label>
            </div>
          </div>
        )}

        {/* ?±ê²© ?¤ì • ??*/}
        {activeTab === 'personality' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ?±ê²© ?¹ì„±
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
                      Ã—
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
                  placeholder="?±ê²© ?¹ì„± ?…ë ¥"
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
                  ì¶”ê?
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
                ?Œí†µ ?¤í???
              </label>
              <textarea
                value={formData.personality.communicationStyle}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, communicationStyle: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? ì¹œê·¼?˜ê³  ?´í•´?˜ê¸° ?¬ìš´ ë°©ì‹?¼ë¡œ ?Œí†µ?©ë‹ˆ??
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                êµìœ¡ ë°©ì‹
              </label>
              <textarea
                value={formData.personality.teachingApproach}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, teachingApproach: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? ?¨ê³„ë³„ë¡œ ì°¨ê·¼ì°¨ê·¼ ?¤ëª…?˜ë©° ?¤ìŠµ???µí•´ ?™ìŠµ???•ìŠµ?ˆë‹¤"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ?‘ë‹µ ?¤í???
              </label>
              <textarea
                value={formData.personality.responseStyle}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personality: { ...prev.personality, responseStyle: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?? ëª…í™•?˜ê³  êµ¬ì²´?ì¸ ?µë????œê³µ?©ë‹ˆ??
              />
            </div>
          </div>
        )}

        {/* ?œìŠ¤???„ë¡¬?„íŠ¸ ??*/}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                ?œìŠ¤???„ë¡¬?„íŠ¸ *
              </label>
              <button
                type="button"
                onClick={generateDefaultPrompt}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                ?ë™ ?ì„±
              </button>
            </div>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="ë©˜í† ???‰ë™ê³??‘ë‹µ ë°©ì‹???•ì˜?˜ëŠ” ?œìŠ¤???„ë¡¬?„íŠ¸ë¥??…ë ¥?˜ì„¸??.."
              required
            />
            <p className="text-sm text-gray-500">
              ?œìŠ¤???„ë¡¬?„íŠ¸??AI ë©˜í† ???±ê²©ê³??‰ë™ ë°©ì‹??ê²°ì •?©ë‹ˆ?? 
              ?„ì˜ ê¸°ë³¸ ?•ë³´?€ ?±ê²© ?¤ì •??ë°”íƒ•?¼ë¡œ ?ë™ ?ì„±?????ˆìŠµ?ˆë‹¤.
            </p>
          </div>
        )}

        {/* ë²„íŠ¼ */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            ì·¨ì†Œ
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? '?€??ì¤?..' : (mentor ? '?˜ì •' : '?ì„±')}
          </button>
        </div>
      </form>
    </div>
  );
}
