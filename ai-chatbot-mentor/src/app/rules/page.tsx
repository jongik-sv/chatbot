/**
 * 룰 설정 페이지
 */

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import RuleManager from '../../components/rules/RuleManager';

export default function RulesPage() {
  return (
    <MainLayout>
      <div className="h-full bg-gray-50 overflow-y-auto">
        {/* 페이지 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                룰 관리
              </h1>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="container mx-auto py-8">
          <RuleManager />
        </div>
      </div>
    </MainLayout>
  );
}

export const metadata = {
  title: '룰 관리 - AI 멘토 챗봇',
  description: '대화 룰을 설정하고 관리합니다.'
};