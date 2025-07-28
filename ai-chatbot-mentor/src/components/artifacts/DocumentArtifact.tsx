'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  CodeBracketIcon,
  DocumentDuplicateIcon 
} from '@heroicons/react/24/outline';

interface DocumentArtifactProps {
  content: string;
  className?: string;
}

export function DocumentArtifact({
  content,
  className = ''
}: DocumentArtifactProps) {
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const getReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = getWordCount(text);
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 문서 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">문서</span>
          <span className="text-xs text-gray-500">
            {getWordCount(content)} 단어 · 약 {getReadingTime(content)}분 읽기
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                viewMode === 'rendered'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <EyeIcon className="h-3 w-3 inline mr-1" />
              미리보기
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'source'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CodeBracketIcon className="h-3 w-3 inline mr-1" />
              소스
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

      {/* 문서 내용 */}
      <div className="relative">
        {viewMode === 'rendered' ? (
          <div className="p-6 prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  return !inline && language ? (
                    <SyntaxHighlighter
                      style={vs}
                      language={language}
                      PreTag="div"
                      customStyle={{
                        margin: '1rem 0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code 
                      className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return (
                    <thead className="bg-gray-50">
                      {children}
                    </thead>
                  );
                },
                th({ children }) {
                  return (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">
                      {children}
                    </td>
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 text-blue-900 italic">
                      {children}
                    </blockquote>
                  );
                },
                h1({ children }) {
                  return (
                    <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200">
                      {children}
                    </h1>
                  );
                },
                h2({ children }) {
                  return (
                    <h2 className="text-xl font-semibold text-gray-900 mt-5 mb-3">
                      {children}
                    </h2>
                  );
                },
                h3({ children }) {
                  return (
                    <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
                      {children}
                    </h3>
                  );
                },
                ul({ children }) {
                  return (
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      {children}
                    </ol>
                  );
                },
                a({ href, children }) {
                  return (
                    <a 
                      href={href}
                      className="text-blue-600 hover:text-blue-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="p-4 text-sm font-mono text-gray-800 bg-gray-50 overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>

      {/* 문서 통계 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {content.length} 문자, {getWordCount(content)} 단어
          </span>
          <span>
            예상 읽기 시간: {getReadingTime(content)}분
          </span>
        </div>
      </div>
    </div>
  );
}