'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';
import { ChatProvider } from '@/contexts/ChatContext';
import { ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.sessionId;
    if (id && typeof id === 'string') {
      const parsedId = parseInt(id);
      if (!isNaN(parsedId) && parsedId > 0) {
        setSessionId(parsedId);
      } else {
        setError('잘못된 세션 ID입니다.');
        return;
      }
    } else {
      setError('세션 ID가 필요합니다.');
      return;
    }
    setLoading(false);
  }, [params.sessionId]);

  const handleBackToMain = () => {
    router.push('/');
  };

  const handleBackToHistory = () => {
    router.push('/history');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">대화를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">세션을 불러올 수 없습니다</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={handleBackToHistory}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              히스토리로 돌아가기
            </button>
            
            <button
              onClick={handleBackToMain}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              메인 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return null; // 리다이렉트 중
  }

  return (
    <ChatProvider>
      <MainLayout>
        <ChatInterface 
          className="h-full" 
          sessionId={sessionId}
        />
      </MainLayout>
    </ChatProvider>
  );
}