'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ExternalContentManager } from '@/components/external';

export default function ExternalContentPage() {
  return (
    <MainLayout>
      <div className="h-full bg-gray-50 overflow-y-auto">
        {/* 페이지 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                외부 콘텐츠 관리
              </h1>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="h-full">
          <ExternalContentManager />
        </div>
      </div>
    </MainLayout>
  );
}