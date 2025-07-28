'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import ChatHistoryList from './ChatHistoryList';
import SessionDetailView from './SessionDetailView';

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

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
  onSessionSelect?: (session: ChatSession) => void;
  className?: string;
}

export default function ChatHistoryPanel({ 
  isOpen, 
  onClose, 
  userId = 1,
  onSessionSelect,
  className = '' 
}: ChatHistoryPanelProps) {
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  // 패널이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedSession(null);
      setView('list');
    }
  }, [isOpen]);

  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session);
    setView('detail');
    onSessionSelect?.(session);
  };

  const handleBackToList = () => {
    setSelectedSession(null);
    setView('list');
  };

  const handleLoadSession = (session: ChatSession) => {
    // 외부 콜백 호출 후 패널 닫기
    onSessionSelect?.(session);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 백드롭 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 패널 */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ${className}`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {view === 'detail' && (
              <button
                onClick={handleBackToList}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {view === 'list' ? '대화 히스토리' : selectedSession?.title}
            </h2>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="h-full overflow-hidden">
          {view === 'list' ? (
            <ChatHistoryList
              userId={userId}
              onSessionSelect={handleSessionSelect}
              className="h-full border-0 shadow-none"
            />
          ) : selectedSession ? (
            <SessionDetailView
              session={selectedSession}
              userId={userId}
              onLoadSession={handleLoadSession}
              className="h-full"
            />
          ) : null}
        </div>
      </div>
    </>
  );
}