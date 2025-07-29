'use client';

import React, { useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { DocumentDuplicateIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MonacoCodeEditorProps {
  content: string;
  language?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  height?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  className?: string;
}

export function MonacoCodeEditor({
  content,
  language = 'javascript',
  theme = 'light',
  readOnly = true,
  height = '400px',
  onChange,
  onSave,
  className = ''
}: MonacoCodeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);

  // 디버깅을 위한 로그
  console.log('MonacoCodeEditor props:', {
    contentLength: content?.length || 0,
    language,
    height,
    hasContent: !!content
  });

  // Monaco Editor 언어 맵핑
  const getMonacoLanguage = (lang: string) => {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'java': 'java',
      'cs': 'csharp',
      'csharp': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'ruby': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'rust': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'kotlin': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'markdown': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'powershell': 'powershell',
      'dockerfile': 'dockerfile'
    };
    return languageMap[lang.toLowerCase()] || 'plaintext';
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedContent : content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedContent);
    }
    if (onChange) {
      onChange(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newValue = value || '';
    setEditedContent(newValue);
    if (onChange && !readOnly && !isEditing) {
      onChange(newValue);
    }
  }, [onChange, readOnly, isEditing]);

  const monacoOptions = {
    readOnly: readOnly && !isEditing,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    folding: true,
    selectOnLineNumbers: true,
    matchBrackets: 'always' as const,
    theme: theme === 'dark' ? 'vs-dark' : 'light',
    fontSize: 14,
    lineHeight: 22,
    padding: { top: 10 },
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    overviewRulerLanes: 0
  };

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 컨트롤 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            Monaco Editor
          </span>
          <span className="text-xs text-gray-500">
            {language?.toUpperCase()}
          </span>
          {isEditing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              편집 중
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {readOnly && !isEditing && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              title="편집"
            >
              <PencilIcon className="h-3 w-3 mr-1" />
              편집
            </button>
          )}
          
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                title="저장"
              >
                <CheckIcon className="h-3 w-3 mr-1" />
                저장
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                title="취소"
              >
                <XMarkIcon className="h-3 w-3 mr-1" />
                취소
              </button>
            </>
          )}
          
          <button
            onClick={handleCopy}
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="복사"
          >
            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
            {copied ? '복사됨!' : '복사'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="relative" style={{ height: height === '100%' ? 'calc(100% - 80px)' : height }}>
        <Editor
          height="100%"
          language={getMonacoLanguage(language || 'javascript')}
          value={isEditing ? editedContent : content}
          onChange={handleEditorChange}
          options={monacoOptions}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }
          onMount={(editor, monaco) => {
            console.log('Monaco Editor mounted:', {
              editorValue: editor.getValue(),
              language: editor.getModel()?.getLanguageId(),
              hasContent: !!editor.getValue()
            });
          }}
        />
      </div>

      {/* 상태 표시줄 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {(isEditing ? editedContent : content).length} 문자, {(isEditing ? editedContent : content).split('\n').length} 줄
          </span>
          <span>
            Monaco Editor • {getMonacoLanguage(language || 'javascript')}
          </span>
        </div>
      </div>
    </div>
  );
}