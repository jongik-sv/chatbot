import MainLayout from '@/components/layout/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';
import { ChatProvider } from '@/contexts/ChatContext';

export default function Home() {
  return (
    <ChatProvider>
      <MainLayout>
        <ChatInterface className="h-full" />
      </MainLayout>
    </ChatProvider>
  );
}
