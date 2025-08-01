'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';
import { ChatProvider } from '@/contexts/ChatContext';

function HomeContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  return (
    <ChatProvider>
      <MainLayout>
        <div className="h-full flex flex-col overflow-hidden">
          <ChatInterface 
            className="flex-1" 
            sessionId={sessionId ? parseInt(sessionId) : undefined}
          />
        </div>
      </MainLayout>
    </ChatProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
