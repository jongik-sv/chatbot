// app/dashboard/page.tsx
'use client';

import React from 'react';
import { MentorPerformanceDashboard } from '@/components/mentor/MentorPerformanceDashboard';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">멘토 성능 대시보드</h1>
          <p className="mt-2 text-gray-600">
            멘토들의 성능을 분석하고 개선사항을 확인하세요.
          </p>
        </div>
        
        <MentorPerformanceDashboard />
      </div>
    </div>
  );
}