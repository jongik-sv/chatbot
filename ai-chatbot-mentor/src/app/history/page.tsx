'use client';

import { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
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
    // 메인 채팅 페이지로 이동하면서 세션 ID 전달
    router.push(`/?sessionId=${session.id}`);
  };

  const handleBackToMain = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {view === 'detail' ? (
                  <button
                    onClick={handleBackToList}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleBackToMain}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
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
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {view === 'list' ? (
            <div className="max-w-4xl mx-auto">
              <ChatHistoryList
                userId={1}
                onSessionSelect={handleSessionSelect}
                className="bg-white shadow-sm rounded-lg"
              />
            </div>
          ) : selectedSession ? (
            <div className="max-w-4xl mx-auto">
              <SessionDetailView
                session={selectedSession}
                userId={1}
                onLoadSession={handleLoadSession}
                className="bg-white shadow-sm rounded-lg"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}