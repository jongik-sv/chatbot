'use client';

import React, { useState, useEffect } from 'react';
import { Artifact } from '@/types';
import { CodeArtifact } from './CodeArtifact';
import { DocumentArtifact } from './DocumentArtifact';
import { ChartArtifact } from './ChartArtifact';
import { MermaidArtifact } from './MermaidArtifact';
import { 
  XMarkIcon, 
  DocumentDuplicateIcon, 
  ArrowDownTrayIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ArtifactPanelProps {
  artifacts: Artifact[];
  onUpdate?: (artifactId: number, updates: Partial<Artifact>) => void;
  onDelete?: (artifactId: number) => void;
  onDownload?: (artifact: Artifact) => void;
  onCopy?: (content: string) => void;
  className?: string;
}

export function ArtifactPanel({
  artifacts,
  onUpdate,
  onDelete,
  onDownload,
  onCopy,
  className = ''
}: ArtifactPanelProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    if (artifacts.length > 0 && !selectedArtifact) {
      setSelectedArtifact(artifacts[0]);
    }
  }, [artifacts, selectedArtifact]);

  useEffect(() => {
    if (selectedArtifact) {
      setEditedContent(selectedArtifact.content);
      setEditedTitle(selectedArtifact.title);
    }
  }, [selectedArtifact]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (selectedArtifact && onUpdate) {
      onUpdate(selectedArtifact.id, {
        title: editedTitle,
        content: editedContent
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (selectedArtifact) {
      setEditedContent(selectedArtifact.content);
      setEditedTitle(selectedArtifact.title);
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (selectedArtifact && onCopy) {
      onCopy(selectedArtifact.content);
    }
  };

  const handleDownload = () => {
    if (selectedArtifact && onDownload) {
      onDownload(selectedArtifact);
    }
  };

  const handleDelete = () => {
    if (selectedArtifact && onDelete) {
      onDelete(selectedArtifact.id);
      const remainingArtifacts = artifacts.filter(a => a.id !== selectedArtifact.id);
      setSelectedArtifact(remainingArtifacts.length > 0 ? remainingArtifacts[0] : null);
    }
  };

  if (artifacts.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">아티팩트 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            AI가 생성한 코드, 문서, 차트 등이 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 아티팩트 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {artifacts.filter(artifact => artifact && artifact.id).map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => setSelectedArtifact(artifact)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 ${
                selectedArtifact?.id === artifact.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  artifact.type === 'code' ? 'bg-green-500' :
                  artifact.type === 'document' ? 'bg-blue-500' :
                  artifact.type === 'chart' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`} />
                <span className="truncate max-w-32">{artifact.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedArtifact && (
        <>
          {/* 아티팩트 헤더 */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-lg font-medium bg-white border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedArtifact.title}
                  </h3>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {selectedArtifact.type}
                  {selectedArtifact.language && ` (${selectedArtifact.language})`}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="편집"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="복사"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="다운로드"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="삭제"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 아티팩트 내용 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isEditing ? (
              <div className="h-full">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full p-4 border-none resize-none focus:outline-none font-mono text-sm"
                  placeholder="내용을 입력하세요..."
                />
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                {selectedArtifact.type === 'code' && (
                  <CodeArtifact
                    content={selectedArtifact.content}
                    language={selectedArtifact.language}
                    className="h-full"
                    artifactId={selectedArtifact.id.toString()}
                    sessionId={selectedArtifact.sessionId?.toString()}
                    useFileServer={true}
                  />
                )}
                {selectedArtifact.type === 'document' && (
                  <DocumentArtifact content={selectedArtifact.content} />
                )}
                {selectedArtifact.type === 'chart' && (
                  <ChartArtifact content={selectedArtifact.content} />
                )}
                {selectedArtifact.type === 'mermaid' && (
                  <MermaidArtifact content={selectedArtifact.content} />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}