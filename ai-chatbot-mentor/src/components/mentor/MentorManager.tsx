// components/mentor/MentorManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Mentor } from '../../types';
import { ApiClient } from '../../lib/api';
import MentorForm, { MentorFormData } from './MentorForm';
import MentorList from './MentorList';

interface MentorManagerProps {
  currentUserId?: number;
  onSelectMentor?: (mentor: Mentor) => void;
  showSelectButton?: boolean;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function MentorManager({ 
  currentUserId, 
  onSelectMentor, 
  showSelectButton = false 
}: MentorManagerProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 멘토 목록 로드
  const loadMentors = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.getMentors({ userId: currentUserId });
      setMentors(response.data);
    } catch (error) {
      console.error('Failed to load mentors:', error);
      alert('멘토 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMentors();
  }, [currentUserId]);

  // 멘토 생성
  const handleCreateMentor = async (mentorData: MentorFormData) => {
    setIsSubmitting(true);
    try {
      const response = await ApiClient.createMentor({
        ...mentorData,
        userId: currentUserId
      });
      
      setMentors(prev => [response.data, ...prev]);
      setViewMode('list');
      alert('멘토가 성공적으로 생성되었습니다!');
    } catch (error) {
      console.error('Failed to create mentor:', error);
      alert(error instanceof Error ? error.message : '멘토 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 멘토 수정
  const handleUpdateMentor = async (mentorData: MentorFormData) => {
    if (!editingMentor || !currentUserId) return;

    setIsSubmitting(true);
    try {
      const response = await ApiClient.updateMentor(editingMentor.id, {
        ...mentorData,
        userId: currentUserId
      });
      
      setMentors(prev => prev.map(m => m.id === editingMentor.id ? response.data : m));
      setViewMode('list');
      setEditingMentor(null);
      alert('멘토가 성공적으로 수정되었습니다!');
    } catch (error) {
      console.error('Failed to update mentor:', error);
      alert(error instanceof Error ? error.message : '멘토 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 멘토 삭제
  const handleDeleteMentor = async (mentor: Mentor) => {
    if (!currentUserId) return;
    
    if (!confirm(`"${mentor.name}" 멘토를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await ApiClient.deleteMentor(mentor.id, currentUserId);
      setMentors(prev => prev.filter(m => m.id !== mentor.id));
      alert('멘토가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete mentor:', error);
      alert(error instanceof Error ? error.message : '멘토 삭제에 실패했습니다.');
    }
  };

  // 멘토 공개/비공개 토글
  const handleTogglePublic = async (mentor: Mentor) => {
    if (!currentUserId) return;

    try {
      const response = await ApiClient.updateMentor(mentor.id, {
        isPublic: !mentor.isPublic,
        userId: currentUserId
      });
      
      setMentors(prev => prev.map(m => m.id === mentor.id ? response.data : m));
      
      const status = response.data.isPublic ? '공개' : '비공개';
      alert(`멘토가 ${status}로 설정되었습니다.`);
    } catch (error) {
      console.error('Failed to toggle mentor visibility:', error);
      alert(error instanceof Error ? error.message : '설정 변경에 실패했습니다.');
    }
  };

  // 멘토 편집 시작
  const handleEditMentor = (mentor: Mentor) => {
    setEditingMentor(mentor);
    setViewMode('edit');
  };

  // 취소
  const handleCancel = () => {
    setViewMode('list');
    setEditingMentor(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {viewMode === 'list' && (
        <div>
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">멘토 관리</h1>
              <p className="text-gray-600 mt-1">
                개인화된 AI 멘토를 생성하고 관리하세요.
              </p>
            </div>
            <button
              onClick={() => setViewMode('create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              새 멘토 생성
            </button>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">전체 멘토</p>
                  <p className="text-2xl font-semibold text-gray-900">{mentors.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">공개 멘토</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mentors.filter(m => m.isPublic).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">내 멘토</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mentors.filter(m => m.userId === currentUserId).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 멘토 목록 */}
          <MentorList
            mentors={mentors}
            onSelect={showSelectButton ? onSelectMentor : undefined}
            onEdit={handleEditMentor}
            onDelete={handleDeleteMentor}
            onTogglePublic={handleTogglePublic}
            currentUserId={currentUserId}
            isLoading={isLoading}
          />
        </div>
      )}

      {viewMode === 'create' && (
        <MentorForm
          onSubmit={handleCreateMentor}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      )}

      {viewMode === 'edit' && editingMentor && (
        <MentorForm
          mentor={editingMentor}
          onSubmit={handleUpdateMentor}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}