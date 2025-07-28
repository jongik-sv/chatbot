// app/gpts/page.tsx
'use client';

import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import GPTManager from '../../components/gpt/GPTManager';

export default function GPTsPage() {
  // 실제 구현에서는 인증된 사용자 ID를 가져와야 합니다
  const userId = 1; // 임시 사용자 ID

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <GPTManager userId={userId} />
      </div>
    </MainLayout>
  );
}