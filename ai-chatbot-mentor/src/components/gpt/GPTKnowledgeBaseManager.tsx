// components/gpt/GPTKnowledgeBaseManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DocumentUpload } from '../ui/DocumentUpload';
import { DocumentList } from '../ui/DocumentList';
import { ExternalContentInput, ExternalContentManager } from '../external';

interface Document {
  id: number;
  filename: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  content?: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  documents?: Document[];
  embeddingModel: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface GPTKnowledgeBaseManagerProps {
  gptId: string;
  gptName: string;
  userId: number;
  onKnowledgeBaseUpdate?: () => void;
}

export default function GPTKnowledgeBaseManager({
  gptId,
  gptName,
  userId,
  onKnowledgeBaseUpdate
}: GPTKnowledgeBaseManagerProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string>('');
  const [newKBName, setNewKBName] = useState('');
  const [newKBDescription, setNewKBDescription] = useState('');
  const [isCreatingKB, setIsCreatingKB] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'documents' | 'external'>('documents');

  // 지식 베이스 목록 로드
  const loadKnowledgeBases = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/gpts/${gptId}/knowledge-base`);
      const result = await response.json();
      
      if (result.success) {
        setKnowledgeBases(result.data.knowledgeBases || []);
      } else {
        setError(result.error || '지식 베이스 로드 실패');
      }
    } catch (error) {
      console.error('지식 베이스 로드 오류:', error);
      setError('지식 베이스를 불러오는 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 사용 가능한 문서 목록 로드
  const loadAvailableDocuments = async () => {
    try {
      const response = await fetch(`/api/documents?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setAvailableDocuments(result.data || []);
      }
    } catch (error) {
      console.error('문서 목록 로드 오류:', error);
    }
  };

  // 새 지식 베이스 생성
  const createKnowledgeBase = async () => {
    if (!newKBName.trim()) {
      setError('지식 베이스 이름을 입력해주세요');
      return;
    }

    try {
      setIsCreatingKB(true);
      const response = await fetch(`/api/gpts/${gptId}/knowledge-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKBName,
          description: newKBDescription,
          createdBy: userId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setNewKBName('');
        setNewKBDescription('');
        await loadKnowledgeBases();
        onKnowledgeBaseUpdate?.();
      } else {
        setError(result.error || '지식 베이스 생성 실패');
      }
    } catch (error) {
      console.error('지식 베이스 생성 오류:', error);
      setError('지식 베이스 생성 중 오류가 발생했습니다');
    } finally {
      setIsCreatingKB(false);
    }
  };

  // 문서를 지식 베이스에 추가
  const addDocumentToKnowledgeBase = async (documentId: number, knowledgeBaseId: string) => {
    try {
      const response = await fetch(`/api/gpts/${gptId}/knowledge-base/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          knowledgeBaseId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadKnowledgeBases();
        onKnowledgeBaseUpdate?.();
      } else {
        setError(result.error || '문서 추가 실패');
      }
    } catch (error) {
      console.error('문서 추가 오류:', error);
      setError('문서 추가 중 오류가 발생했습니다');
    }
  };

  // 문서를 지식 베이스에서 제거
  const removeDocumentFromKnowledgeBase = async (documentId: number, knowledgeBaseId: string) => {
    try {
      const response = await fetch(`/api/gpts/${gptId}/knowledge-base/documents`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          knowledgeBaseId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadKnowledgeBases();
        onKnowledgeBaseUpdate?.();
      } else {
        setError(result.error || '문서 제거 실패');
      }
    } catch (error) {
      console.error('문서 제거 오류:', error);
      setError('문서 제거 중 오류가 발생했습니다');
    }
  };

  // 문서 업로드 완료 후 처리
  const handleDocumentUploaded = async () => {
    await loadAvailableDocuments();
  };

  // 외부 콘텐츠 처리 완료 후 처리
  const handleExternalContentProcessed = async (content: any) => {
    // 외부 콘텐츠가 성공적으로 처리되면 지식 베이스 새로고침
    await loadKnowledgeBases();
    onKnowledgeBaseUpdate?.();
    setError(''); // 이전 에러 제거
  };

  // 외부 콘텐츠 에러 처리
  const handleExternalContentError = (errorMessage: string) => {
    setError(`외부 콘텐츠 처리 실패: ${errorMessage}`);
  };

  useEffect(() => {
    loadKnowledgeBases();
    loadAvailableDocuments();
  }, [gptId, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">지식 베이스를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{gptName} - 지식 베이스 관리</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 새 지식 베이스 생성 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">새 지식 베이스 생성</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">이름</label>
            <Input
              value={newKBName}
              onChange={(e) => setNewKBName(e.target.value)}
              placeholder="지식 베이스 이름을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">설명 (선택사항)</label>
            <Input
              value={newKBDescription}
              onChange={(e) => setNewKBDescription(e.target.value)}
              placeholder="지식 베이스 설명을 입력하세요"
            />
          </div>
          <Button 
            onClick={createKnowledgeBase}
            disabled={isCreatingKB || !newKBName.trim()}
          >
            {isCreatingKB ? '생성 중...' : '지식 베이스 생성'}
          </Button>
        </div>
      </Card>

      {/* 콘텐츠 추가 탭 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">콘텐츠 추가</h3>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'documents'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              문서 업로드
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'external'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              외부 콘텐츠
            </button>
          </div>
        </div>

        {activeTab === 'documents' && (
          <div>
            <DocumentUpload
              onUploadComplete={handleDocumentUploaded}
              acceptedTypes={['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
            />
          </div>
        )}

        {activeTab === 'external' && (
          <div>
            <ExternalContentInput
              onContentProcessed={handleExternalContentProcessed}
              onError={handleExternalContentError}
              customGptId={gptId}
            />
          </div>
        )}
      </Card>

      {/* 지식 베이스 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">지식 베이스 목록</h3>
        {knowledgeBases.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-gray-500">
              아직 생성된 지식 베이스가 없습니다.
            </div>
          </Card>
        ) : (
          knowledgeBases.map((kb) => (
            <Card key={kb.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium">{kb.name}</h4>
                  {kb.description && (
                    <p className="text-gray-600 text-sm">{kb.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    문서 {kb.documents?.length || 0}개 • {kb.embeddingModel} 모델
                  </p>
                </div>
              </div>

              {/* 지식 베이스의 문서 목록 */}
              <div className="space-y-2">
                <h5 className="font-medium">연결된 문서</h5>
                {kb.documents && kb.documents.length > 0 ? (
                  <div className="space-y-2">
                    {kb.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{doc.filename}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({doc.file_type}) • {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : '크기 불명'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDocumentFromKnowledgeBase(doc.id, kb.id)}
                        >
                          제거
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">연결된 문서가 없습니다.</div>
                )}

                {/* 사용 가능한 문서에서 추가 */}
                <div className="mt-4">
                  <h6 className="text-sm font-medium mb-2">문서 추가</h6>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableDocuments
                      .filter(doc => !kb.documentIds.includes(doc.id.toString()))
                      .map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="text-sm">{doc.filename}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({doc.file_type})
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addDocumentToKnowledgeBase(doc.id, kb.id)}
                          >
                            추가
                          </Button>
                        </div>
                      ))}
                  </div>
                  {availableDocuments.filter(doc => !kb.documentIds.includes(doc.id.toString())).length === 0 && (
                    <div className="text-gray-500 text-sm">추가할 수 있는 문서가 없습니다.</div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}