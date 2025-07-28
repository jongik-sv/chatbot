'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { DocumentDuplicateIcon, EyeIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

interface CodeArtifactProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export function CodeArtifact({
  content,
  language = 'javascript',
  showLineNumbers = true,
  theme = 'light',
  className = ''
}: CodeArtifactProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'raw'>('code');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  const getLanguageDisplayName = (lang: string) => {
    const languageMap: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      swift: 'Swift',
      kotlin: 'Kotlin',
      scala: 'Scala',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      sass: 'Sass',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      markdown: 'Markdown',
      sql: 'SQL',
      bash: 'Bash',
      powershell: 'PowerShell',
      dockerfile: 'Dockerfile'
    };
    return languageMap[lang.toLowerCase()] || lang.toUpperCase();
  };

  const codeStyle = theme === 'dark' ? vscDarkPlus : vs;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 코드 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <CodeBracketIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {getLanguageDisplayName(language || 'text')}
          </span>
          <span className="text-xs text-gray-500">
            {content.split('\n').length} 줄
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                viewMode === 'code'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <EyeIcon className="h-3 w-3 inline mr-1" />
              미리보기
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'raw'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CodeBracketIcon className="h-3 w-3 inline mr-1" />
              원본
            </button>
          </div>
          
          <button
            onClick={handleCopy}
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
            {copied ? '복사됨!' : '복사'}
          </button>
        </div>
      </div>

      {/* 코드 내용 */}
      <div className="relative">
        {viewMode === 'code' ? (
          <SyntaxHighlighter
            language={language}
            style={codeStyle}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: theme === 'dark' ? '#1e1e1e' : '#fafafa',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
            lineNumberStyle={{
              color: theme === 'dark' ? '#6e7681' : '#656d76',
              paddingRight: '1rem',
              minWidth: '2.5rem'
            }}
          >
            {content}
          </SyntaxHighlighter>
        ) : (
          <pre className="p-4 text-sm font-mono text-gray-800 bg-gray-50 overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>

      {/* 코드 통계 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {content.length} 문자, {content.split('\n').length} 줄
          </span>
          <span>
            {language && `언어: ${getLanguageDisplayName(language)}`}
          </span>
        </div>
      </div>
    </div>
  );
}