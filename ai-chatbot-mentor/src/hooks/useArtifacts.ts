// hooks/useArtifacts.ts - 아티팩트 관리 로직
import { useState } from 'react';
import { Artifact } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState<boolean>(false);
  const [artifactPanelWidth, setArtifactPanelWidth] = useState<number>(33); // percentage

  const loadSessionArtifacts = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/artifacts?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setArtifacts(data.data);
          // 아티팩트가 있으면 패널을 열어둠
          if (data.data.length > 0) {
            setIsArtifactPanelOpen(true);
          }
        }
      }
    } catch (error) {
      console.error('아티팩트 로드 실패:', error);
    }
  };

  const handleArtifactCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      console.log('아티팩트 내용이 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      // 폴백: 텍스트 선택
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleArtifactDownload = (artifact: Artifact) => {
    const fileExtension = artifact.language || 'txt';
    const mimeTypes: Record<string, string> = {
      'javascript': 'text/javascript',
      'typescript': 'text/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'xml': 'text/xml',
      'markdown': 'text/markdown',
      'python': 'text/x-python',
      'java': 'text/x-java-source',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc'
    };

    const mimeType = mimeTypes[fileExtension] || 'text/plain';
    const fileName = `${artifact.title.replace(/[^\w\s-]/g, '')}.${fileExtension}`;
    
    const blob = new Blob([artifact.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleArtifactUpdate = async (
    artifactId: number, 
    updates: Partial<Artifact>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    try {
      const response = await fetch(`/api/artifacts/${artifactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // artifacts 상태 업데이트
        setArtifacts(prev => prev.map(artifact =>
          artifact.id === artifactId ? { ...artifact, ...updates } : artifact
        ));
        
        // 메시지 메타데이터도 함께 업데이트
        setMessages(prev => prev.map(message => ({
          ...message,
          metadata: {
            ...message.metadata,
            artifacts: message.metadata?.artifacts?.map((artifact: Artifact) =>
              artifact.id === artifactId ? { ...artifact, ...updates } : artifact
            )
          }
        })));
      } else {
        console.error('아티팩트 업데이트 실패');
      }
    } catch (error) {
      console.error('아티팩트 업데이트 오류:', error);
    }
  };

  const handleArtifactDelete = async (
    artifactId: number,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    try {
      const response = await fetch(`/api/artifacts/${artifactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // artifacts 상태에서 제거
        setArtifacts(prev => prev.filter(artifact => artifact.id !== artifactId));
        
        // 메시지 메타데이터에서도 제거
        setMessages(prev => prev.map(message => ({
          ...message,
          metadata: {
            ...message.metadata,
            artifacts: message.metadata?.artifacts?.filter((artifact: Artifact) => artifact.id !== artifactId)
          }
        })));
      } else {
        console.error('아티팩트 삭제 실패');
      }
    } catch (error) {
      console.error('아티팩트 삭제 오류:', error);
    }
  };

  const toggleArtifactPanel = () => {
    setIsArtifactPanelOpen(!isArtifactPanelOpen);
  };

  const handlePanelWidthChange = (width: number) => {
    setArtifactPanelWidth(Math.max(20, Math.min(60, width))); // 20-60% 제한
  };

  return {
    artifacts,
    setArtifacts,
    isArtifactPanelOpen,
    setIsArtifactPanelOpen,
    artifactPanelWidth,
    setArtifactPanelWidth,
    loadSessionArtifacts,
    handleArtifactCopy,
    handleArtifactDownload,
    handleArtifactUpdate,
    handleArtifactDelete,
    toggleArtifactPanel,
    handlePanelWidthChange
  };
}