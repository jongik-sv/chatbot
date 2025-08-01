'use client';

import { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import ChatHistoryList from '../../components/history/ChatHistoryList';
import SessionDetailView from '../../components/history/SessionDetailView';

interface ChatSession {
  id: number;
  title: string;
  mode: string;
  modelUsed?: string;
  mentorName?: string;
  messageCount: number;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedSession(null);
    setView('list');
  };

  const handleLoadSession = (session: ChatSession) => {
    // 동적 라우트로 이동하여 세션 로드
    router.push(`/chat/${session.id}`);
  };

  const handleBackToMain = () => {
    router.push('/');
  };

  return (
    <MainLayout>
      <div className="h-full bg-gray-50 flex flex-col">
        {/* 헤더 */}
        <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {view === 'detail' && (
                  <button
                    onClick={handleBackToList}
                    className="p-2 text-gray-600 hover:text-gray-700 rounded-md"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {view === 'list' ? '대화 히스토리' : selectedSession?.title}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {view === 'list' 
                      ? '검색, 필터링, 상세 분석으로 대화 기록을 체계적으로 관리하세요. (💡 빠른 접근은 채팅 목록 이용)'
                      : '대화 내용을 확인하고 이어서 채팅할 수 있습니다.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 flex-1 overflow-hidden">
          {view === 'list' ? (
            <div className="max-w-4xl mx-auto h-full">
              <ChatHistoryList
                userId={1}
                onSessionSelect={handleSessionSelect}
                className="bg-white shadow-sm rounded-lg h-full"
              />
            </div>
          ) : selectedSession ? (
            <div className="max-w-4xl mx-auto h-full">
              <SessionDetailView
                session={selectedSession}
                userId={1}
                onLoadSession={handleLoadSession}
                className="bg-white shadow-sm rounded-lg h-full"
              />
            </div>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
}