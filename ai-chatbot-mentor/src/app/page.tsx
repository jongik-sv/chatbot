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
        <ChatInterface 
          className="h-full" 
          sessionId={sessionId ? parseInt(sessionId) : undefined}
        />
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
