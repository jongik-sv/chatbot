// app/dashboard/page.tsx
'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { MentorPerformanceDashboard } from '@/components/mentor/MentorPerformanceDashboard';

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="h-full bg-gray-50 overflow-y-auto">
        {/* 페이지 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                멘토 성능 대시보드
              </h1>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-gray-600">
              멘토들의 성능을 분석하고 개선사항을 확인하세요.
            </p>
          </div>
          
          <MentorPerformanceDashboard />
        </div>
      </div>
    </MainLayout>
  );
}