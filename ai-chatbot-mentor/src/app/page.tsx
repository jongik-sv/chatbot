import MainLayout from '@/components/layout/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <MainLayout>
      <ChatInterface className="h-full" />
    </MainLayout>
  );
}
