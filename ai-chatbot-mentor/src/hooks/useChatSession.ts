// hooks/useChatSession.ts - 세션 관리 로직
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiClient } from '../lib/api';
import { Message as MessageType } from '../types';
import { useChatContext } from '../contexts/ChatContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface RagInfo {
  projectId: string;
  projectName: string;
  documentIds: string[];
  documentTitles: string[];
}

export function useChatSession(sessionId?: number, initialMode?: string) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMode, setSessionMode] = useState<string>(initialMode || 'chat');
  const [ragInfo, setRagInfo] = useState<RagInfo | null>(null);
  const { state, dispatch, switchModel } = useChatContext();
  
  // URL 파라미터로 RAG 정보가 설정되었는지 추적하는 ref
  const ragInfoFromUrl = useRef(false);

  // URL 파라미터에서 RAG 정보 읽기 (컴포넌트 마운트 시 1회만)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const projectId = searchParams.get('projectId');
    const projectName = searchParams.get('projectName');
    const documentIds = searchParams.get('documentIds');
    const documentTitles = searchParams.get('documentTitles');

    if (mode === 'rag' && projectId) {
      setSessionMode('rag');
      
      // documentIds와 documentTitles가 있으면 파싱 시도
      let parsedDocumentIds: string[] = [];
      let parsedDocumentTitles: string[] = [];
      
      if (documentIds) {
        try {
          parsedDocumentIds = JSON.parse(documentIds);
        } catch (error) {
          console.warn('documentIds JSON 파싱 오류:', error);
          parsedDocumentIds = [];
        }
      }
      
      if (documentTitles) {
        try {
          parsedDocumentTitles = JSON.parse(documentTitles);
        } catch (error) {
          console.warn('documentTitles JSON 파싱 오류:', error);
          parsedDocumentTitles = [];
        }
      }
      
      const ragInfoData = {
        projectId,
        projectName: decodeURIComponent(projectName || ''),
        documentIds: parsedDocumentIds,
        documentTitles: parsedDocumentTitles
      };
      
      setRagInfo(ragInfoData);
      ragInfoFromUrl.current = true; // URL 파라미터로 설정했음을 표시
    }
  }, []); // 의존성 배열을 빈 배열로 변경하여 마운트 시에만 실행

  // 기존 세션이 있으면 로드 (URL 파라미터 처리 후에 실행)
  useEffect(() => {
    if (sessionId) {
      // URL 파라미터 처리를 위해 약간의 지연 추가
      const timer = setTimeout(() => {
        loadSession(sessionId);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [sessionId]);

  const loadSession = async (sessionId: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await ApiClient.getSession(sessionId);
      const loadedMessages = response.messages.map((msg: MessageType) => ({
        id: msg.id ? msg.id.toString() : `msg-${Date.now()}-${Math.random()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt), // 실제 메시지 생성 시간 사용
        metadata: msg.metadata
      }));
      setMessages(loadedMessages);
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
      
      // 세션의 모드 설정
      if (response.session.mode) {
        setSessionMode(response.session.mode);
      }
      
      // 세션의 모델 설정
      if (response.session.modelUsed) {
        switchModel(response.session.modelUsed);
      }

      // URL 파라미터로 RAG 정보가 설정된 경우 세션 정보를 무시
      if ((response.session.mode === 'document' || response.session.mode === 'rag') && !ragInfoFromUrl.current) {
        // API에서 받은 documentInfo가 있으면 우선 사용
        if (response.session.documentInfo) {
          const sessionRagInfo = {
            projectId: response.session.documentInfo.projectId?.toString() || '',
            projectName: response.session.documentInfo.projectName || '',
            documentIds: response.session.documentInfo.documentIds?.map(id => id.toString()) || [],
            documentTitles: response.session.documentInfo.documentTitles || []
          };
          setRagInfo(sessionRagInfo);
        } else {
          // 없으면 기존 방식으로 추출
          extractDocumentInfo(loadedMessages, response.session);
        }
      }

    } catch (error) {
      console.error('세션 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '대화 기록을 불러올 수 없습니다.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const extractDocumentInfo = (messages: Message[], session?: any) => {
    // 세션에서 RAG 메타데이터 복원 (우선순위)
    if (session && session.metadata) {
      try {
        const sessionMetadata = typeof session.metadata === 'string' 
          ? JSON.parse(session.metadata) 
          : session.metadata;
        
        if (sessionMetadata.ragMetadata) {
          setRagInfo({
            projectId: sessionMetadata.ragMetadata.projectId,
            projectName: sessionMetadata.ragMetadata.projectName,
            documentIds: sessionMetadata.ragMetadata.documentIds,
            documentTitles: sessionMetadata.ragMetadata.documentTitles
          });
          return; // RAG 정보를 찾았으면 더 이상 메시지를 검사하지 않음
        }
      } catch (error) {
        console.error('세션 메타데이터 파싱 오류:', error);
      }
    }

    // 메시지 메타데이터에서 문서 정보 추출 (fallback)
    for (const message of messages) {
      if (message.metadata) {
        // RAG 메타데이터에서 문서 정보 찾기
        if (message.metadata.documentIds && Array.isArray(message.metadata.documentIds)) {
          // fetchDocumentNames(message.metadata.documentIds); // 이 함수는 useDocumentInfo에서 처리
          return;
        }
      }
    }
  };

  return {
    messages,
    setMessages,
    sessionMode,
    setSessionMode,
    ragInfo,
    setRagInfo,
    loadSession
  };
}