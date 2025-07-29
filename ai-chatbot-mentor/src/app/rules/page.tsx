/**
 * 룰 설정 페이지
 */

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import RuleManager from '../../components/rules/RuleManager';

export default function RulesPage() {
  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
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