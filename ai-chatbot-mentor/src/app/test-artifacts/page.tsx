'use client';

import React, { useState } from 'react';
import { ArtifactPanel } from '@/components/artifacts';
import { Artifact } from '@/types';

const sampleArtifacts: Artifact[] = [
  {
    id: 1,
    sessionId: 1,
    messageId: 1,
    type: 'code',
    title: 'React 컴포넌트 예제',
    content: `import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">카운터: {count}</h2>
      <div className="mt-4 space-x-2">
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          증가
        </button>
        <button 
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          감소
        </button>
      </div>
    </div>
  );
}`,
    language: 'typescript',
    createdAt: new Date()
  },
  {
    id: 2,
    sessionId: 1,
    messageId: 2,
    type: 'document',
    title: '프로젝트 문서',
    content: `# AI 챗봇 프로젝트

## 개요
이 프로젝트는 **멀티모달 AI 챗봇**을 구현하는 것을 목표로 합니다.

## 주요 기능
- 텍스트, 이미지, 음성 입력 지원
- 다양한 LLM 모델 지원 (Ollama, Google Gemini)
- 아티팩트 시스템
- 멘토 관리 시스템

## 기술 스택
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: SQLite
- **AI**: Ollama, Google Gemini API

## 설치 방법
\`\`\`bash
npm install
npm run dev
\`\`\`

> **참고**: 환경 변수 설정이 필요합니다.`,
    createdAt: new Date()
  },
  {
    id: 3,
    sessionId: 1,
    messageId: 3,
    type: 'chart',
    title: '사용자 통계',
    content: JSON.stringify({
      type: 'bar',
      data: {
        labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        datasets: [
          {
            label: '신규 사용자',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: '활성 사용자',
            data: [8, 15, 7, 12, 9, 11],
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '월별 사용자 통계'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    }, null, 2),
    createdAt: new Date()
  },
  {
    id: 4,
    sessionId: 1,
    messageId: 4,
    type: 'mermaid',
    title: '시스템 아키텍처',
    content: `flowchart TD
    A[사용자] --> B[Next.js Frontend]
    B --> C[API Gateway]
    C --> D[LLM Service]
    C --> E[Database]
    C --> F[File Storage]
    
    D --> G[Ollama]
    D --> H[Google Gemini]
    
    E --> I[(SQLite)]
    F --> J[로컬 파일]
    
    B --> K[아티팩트 패널]
    B --> L[채팅 인터페이스]
    B --> M[멘토 관리]`,
    createdAt: new Date()
  }
];

export default function TestArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>(sampleArtifacts);

  const handleUpdate = (artifactId: number, updates: Partial<Artifact>) => {
    setArtifacts(prev => 
      prev.map(artifact => 
        artifact.id === artifactId 
          ? { ...artifact, ...updates }
          : artifact
      )
    );
    console.log('아티팩트 업데이트:', artifactId, updates);
  };

  const handleDelete = (artifactId: number) => {
    setArtifacts(prev => prev.filter(artifact => artifact.id !== artifactId));
    console.log('아티팩트 삭제:', artifactId);
  };

  const handleDownload = (artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title}.${artifact.type === 'code' ? artifact.language || 'txt' : artifact.type}`;
    link.click();
    URL.revokeObjectURL(url);
    console.log('아티팩트 다운로드:', artifact.title);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      console.log('클립보드에 복사됨');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">아티팩트 시스템 테스트</h1>
          <p className="mt-2 text-gray-600">
            다양한 타입의 아티팩트를 테스트해볼 수 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <ArtifactPanel
            artifacts={artifacts}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onCopy={handleCopy}
            className="h-96"
          />
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">아티팩트 목록</h2>
          <div className="space-y-2">
            {artifacts.map(artifact => (
              <div key={artifact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{artifact.title}</span>
                  <span className="ml-2 text-sm text-gray-500">({artifact.type})</span>
                </div>
                <div className="text-sm text-gray-600">
                  {artifact.content.length} 문자
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}