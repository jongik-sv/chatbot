'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';
// import DocumentUpload from '@/components/documents/DocumentUpload';
// import DocumentList from '@/components/documents/DocumentList';
import { ChatProvider } from '@/contexts/ChatContext';
import { DocumentIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/upload');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('문서 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = (document: any) => {
    setDocuments(prev => [document, ...prev]);
  };

  const handleDocumentSelect = (documentId: number, selected: boolean) => {
    setSelectedDocuments(prev => {
      if (selected) {
        return [...prev, documentId];
      } else {
        return prev.filter(id => id !== documentId);
      }
    });
  };

  const handleStartChat = () => {
    if (selectedDocuments.length === 0) {
      alert('대화할 문서를 먼저 선택해주세요.');
      return;
    }
    setShowChat(true);
  };

  const getSelectedDocumentTitles = () => {
    return documents
      .filter((doc: any) => selectedDocuments.includes(doc.id))
      .map((doc: any) => doc.filename)
      .join(', ');
  };

  if (showChat) {
    return (
      <MainLayout>
        <div className="h-full flex flex-col">
          {/* 헤더 */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← 문서 선택으로 돌아가기
                </button>
                
                <div className="flex items-center space-x-2">
                  <SparklesIcon className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-bold text-gray-900">문서 기반 채팅</h1>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                선택된 문서: {getSelectedDocumentTitles()}
              </div>
            </div>
          </div>

          {/* 채팅 인터페이스 */}
          <div className="flex-1 overflow-hidden">
            <ChatProvider>
              <ChatInterface 
                className="h-full"
                initialMode="document"
              />
            </ChatProvider>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DocumentIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">문서 기반 대화</h1>
            </div>

            <div className="flex items-center space-x-4">
              {selectedDocuments.length > 0 && (
                <button
                  onClick={handleStartChat}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  <span>선택한 문서와 대화하기 ({selectedDocuments.length}개)</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-600">
              문서를 업로드하고 선택한 후, 해당 문서의 내용을 기반으로 AI와 대화할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 문서 업로드 */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">문서 업로드</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">문서 업로드 기능은 별도 구현 예정</p>
                  <p className="text-sm text-gray-500 mt-2">현재는 RAG 시스템 백엔드만 구현됨</p>
                </div>
              </div>

              {/* RAG 시스템 설명 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  RAG (검색 증강 생성) 시스템
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• 업로드된 문서가 자동으로 분석되고 인덱싱됩니다</p>
                  <p>• 질문하면 관련 문서 내용을 검색하여 답변합니다</p>
                  <p>• 답변과 함께 참고한 문서의 출처가 표시됩니다</p>
                  <p>• 문서에 없는 내용은 추측하지 않고 정확하게 답변합니다</p>
                </div>
              </div>
            </div>

            {/* 문서 목록 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">업로드된 문서</h2>
                <span className="text-sm text-gray-500">
                  {documents.length}개 문서
                </span>
              </div>

              <div className="h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">문서 목록 로드 중...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <DocumentIcon className="w-12 h-12 mb-2" />
                    <p className="text-center">
                      아직 업로드된 문서가 없습니다.<br />
                      문서를 업로드해서 AI와 대화해보세요.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div 
                        key={doc.id}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={(e) => handleDocumentSelect(doc.id, e.target.checked)}
                          className="mr-3"
                        />
                        <DocumentIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{doc.filename}</p>
                          <p className="text-sm text-gray-500">{doc.fileType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}