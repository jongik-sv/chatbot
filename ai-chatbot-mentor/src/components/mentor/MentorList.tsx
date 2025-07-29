// components/mentor/MentorList.tsx
'use client';

import React, { useState } from 'react';
import { Mentor } from '../../types';

interface MentorListProps {
  mentors: Mentor[];
  onSelect?: (mentor: Mentor) => void;
  onEdit?: (mentor: Mentor) => void;
  onDelete?: (mentor: Mentor) => void;
  onTogglePublic?: (mentor: Mentor) => void;
  currentUserId?: number;
  isLoading?: boolean;
}

export default function MentorList({
  mentors,
  onSelect,
  onEdit,
  onDelete,
  onTogglePublic,
  currentUserId,
  isLoading = false
}: MentorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'public'>('all');

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.expertise.some(exp => exp.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterType === 'all' ||
                         (filterType === 'mine' && mentor.userId === currentUserId) ||
                         (filterType === 'public' && mentor.isPublic);

    return matchesSearch && matchesFilter;
  });

  const isOwner = (mentor: Mentor) => currentUserId && mentor.userId === currentUserId;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">멘토 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="멘토 이름, 설명, 전문 분야로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="mine">내 멘토</option>
            <option value="public">공개 멘토</option>
          </select>
        </div>
      </div>

      {/* 멘토 목록 */}
      {filteredMentors.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">📚</div>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'all' 
              ? '검색 조건에 맞는 멘토가 없습니다.' 
              : '아직 생성된 멘토가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <div
              key={mentor.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* 헤더 */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {mentor.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {mentor.isPublic && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          공개
                        </span>
                      )}
                      {isOwner(mentor) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          내 멘토
                        </span>
                      )}
                      {mentor.mbtiType && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          {mentor.mbtiType}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  {isOwner(mentor) && (
                    <div className="flex items-center space-x-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(mentor)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onTogglePublic && (
                        <button
                          onClick={() => onTogglePublic(mentor)}
                          className="p-1 text-gray-400 hover:text-green-600 rounded"
                          title={mentor.isPublic ? '비공개로 변경' : '공개로 변경'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mentor.isPublic ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(mentor)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 설명 */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {mentor.description}
                </p>

                {/* 전문 분야 */}
                {mentor.expertise.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.slice(0, 3).map((exp, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {exp}
                        </span>
                      ))}
                      {mentor.expertise.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">
                          +{mentor.expertise.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 성격 특성 */}
                {mentor.personality.traits.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {mentor.personality.traits.slice(0, 3).map((trait, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                        >
                          {trait}
                        </span>
                      ))}
                      {mentor.personality.traits.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-500">
                          +{mentor.personality.traits.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 생성일 */}
                <div className="text-xs text-gray-400 mb-4">
                  생성일: {new Date(mentor.createdAt).toLocaleDateString('ko-KR')}
                </div>

                {/* 선택 버튼 */}
                {onSelect && (
                  <button
                    onClick={() => onSelect(mentor)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    이 멘토와 대화하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}