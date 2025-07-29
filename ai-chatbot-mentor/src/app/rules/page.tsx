/**
 * 룰 설정 페이지
 */

import React from 'react';
import RuleManager from '../../components/rules/RuleManager';

export default function RulesPage() {
  return (
    <div className=\"container mx-auto py-8\">
      <RuleManager />
    </div>
  );
}

export const metadata = {
  title: '룰 관리 - AI 멘토 챗봇',
  description: '대화 룰을 설정하고 관리합니다.'
};