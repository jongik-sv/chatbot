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
      <div className="h-full bg-gray-50 overflow-y-auto">
        {/* 페이지 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                GPT 관리
              </h1>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="container mx-auto px-4 py-8">
          <GPTManager userId={userId} />
        </div>
      </div>
    </MainLayout>
  );
}