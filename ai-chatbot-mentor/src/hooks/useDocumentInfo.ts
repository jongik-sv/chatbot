// hooks/useDocumentInfo.ts - 문서 정보 관리 로직
import { useState, useEffect } from 'react';

interface DocumentInfo {
  name: string;
  id?: number;
}

export function useDocumentInfo(selectedDocumentIds?: number[]) {
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);

  // 문서 기반 대화인 경우 문서 정보 로드
  useEffect(() => {
    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      loadDocumentInfo(selectedDocumentIds[0]);
    }
  }, [selectedDocumentIds]);

  const fetchDocumentNames = async (documentIds: number[]) => {
    try {
      // 첫 번째 문서의 정보만 가져오기 (대부분 하나의 문서만 사용)
      const documentId = documentIds[0];
      const response = await fetch(`/api/documents/${documentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.document) {
          setDocumentInfo({ 
            name: data.document.filename, 
            id: data.document.id 
          });
        }
      }
    } catch (error) {
      console.error('문서 정보 가져오기 실패:', error);
    }
  };

  const loadDocumentInfo = async (documentId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (response.ok) {
        const document = await response.json();
        setDocumentInfo({
          name: document.filename || '문서',
          id: documentId
        });
      }
    } catch (error) {
      console.error('문서 정보 로드 실패:', error);
    }
  };

  return {
    documentInfo,
    setDocumentInfo,
    fetchDocumentNames,
    loadDocumentInfo
  };
}