'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';
import DocumentUpload from '@/components/documents/DocumentUpload';
import DocumentList from '@/components/documents/DocumentList';
import { ChatProvider } from '@/contexts/ChatContext';
import { DocumentIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDocument, setViewDocument] = useState<any>(null);
  const [viewDocumentLoading, setViewDocumentLoading] = useState(false);
  const [viewDocumentError, setViewDocumentError] = useState<string>('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('문서 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (files: File[]) => {
    // 업로드 완료 후 문서 목록 새로고침
    loadDocuments();
  };

  const handleDocumentDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setDocuments(prev => prev.filter((doc: any) => doc.id !== id));
        setSelectedDocuments(prev => prev.filter(docId => docId !== id));
      } else {
        alert(result.error || '문서 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('문서 삭제 오류:', error);
      alert('문서 삭제에 실패했습니다.');
    }
  };

  const handleDocumentView = async (document: any) => {
    try {
      setViewDocumentLoading(true);
      setViewDocumentError('');
      
      const response = await fetch(`/api/documents/${document.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setViewDocument(data);
      } else {
        setViewDocumentError(data.error || '문서를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('문서 조회 오류:', error);
      setViewDocumentError('문서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setViewDocumentLoading(false);
    }
  };

  const handleCloseDocumentView = () => {
    setViewDocument(null);
    setViewDocumentError('');
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
                selectedDocumentIds={selectedDocuments}
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
                <DocumentUpload 
                  onUploadComplete={handleUploadComplete}
                  maxFileSize={10}
                  acceptedTypes={['.pdf', '.txt', '.docx', '.md']}
                />
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
                <DocumentList
                  documents={documents}
                  loading={loading}
                  onDelete={handleDocumentDelete}
                  onView={handleDocumentView}
                />
                
                {/* 문서 선택 체크박스 */}
                {!loading && documents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">대화할 문서 선택:</h3>
                    <div className="space-y-3 max-h-32 overflow-y-auto">
                      {documents.map((doc: any) => (
                        <label 
                          key={doc.id} 
                          className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={(e) => handleDocumentSelect(doc.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-gray-900 font-medium truncate flex-1">
                            {doc.filename}
                          </span>
                          {selectedDocuments.includes(doc.id) && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              선택됨
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    
                    {selectedDocuments.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-md">
                        <p className="text-xs text-blue-700">
                          <strong>{selectedDocuments.length}개 문서</strong>가 선택되었습니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 문서 뷰어 모달 */}
      {(viewDocument || viewDocumentLoading || viewDocumentError) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {viewDocument?.filename || '문서 보기'}
              </h2>
              <button
                onClick={handleCloseDocumentView}
                className="text-gray-600 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-hidden">
              {viewDocumentLoading && (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">문서를 불러오는 중...</span>
                </div>
              )}

              {viewDocumentError && (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">{viewDocumentError}</p>
                  </div>
                </div>
              )}

              {viewDocument && !viewDocumentLoading && !viewDocumentError && (
                <div className="flex flex-col h-full p-6">
                  {/* 문서 메타데이터 */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg flex-shrink-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">파일 타입:</span>
                        <p className="text-gray-900">{viewDocument.fileType?.toUpperCase()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">파일 크기:</span>
                        <p className="text-gray-900">
                          {viewDocument.metadata?.fileSize ? 
                            `${Math.round(viewDocument.metadata.fileSize / 1024)} KB` : 
                            'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">단어 수:</span>
                        <p className="text-gray-900">{viewDocument.metadata?.wordCount || 0}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">언어:</span>
                        <p className="text-gray-900">{viewDocument.metadata?.language || 'unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 문서 내용 */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex-shrink-0">문서 내용</h3>
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg min-h-0">
                      <div 
                        className="p-6 overflow-y-scroll"
                        style={{
                          height: '400px',
                          maxHeight: '60vh',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#9CA3AF #F3F4F6'
                        }}
                      >
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            width: 12px;
                          }
                          div::-webkit-scrollbar-track {
                            background: #F3F4F6;
                            border-radius: 6px;
                          }
                          div::-webkit-scrollbar-thumb {
                            background: #9CA3AF;
                            border-radius: 6px;
                            border: 2px solid #F3F4F6;
                          }
                          div::-webkit-scrollbar-thumb:hover {
                            background: #6B7280;
                          }
                        `}</style>
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                          {viewDocument.content || '문서 내용이 없습니다.'}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}