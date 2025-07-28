// components/gpt/GPTManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import GPTKnowledgeBaseManager from './GPTKnowledgeBaseManager';
import GPTChatInterface from './GPTChatInterface';
import GPTSearchInterface from './GPTSearchInterface';

interface CustomGPT {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  knowledgeBaseIds: string[];
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface GPTManagerProps {
  userId: number;
}

export default function GPTManager({ userId }: GPTManagerProps) {
  const [gpts, setGpts] = useState<CustomGPT[]>([]);
  const [selectedGPT, setSelectedGPT] = useState<CustomGPT | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 새 GPT 생성 폼 상태
  const [newGPT, setNewGPT] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2048,
    model: 'gemini-1.5-flash',
    isPublic: false
  });

  // GPT 목록 로드
  const loadGPTs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/gpts?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setGpts(result.data || []);
      } else {
        setError(result.error || 'GPT 목록 로드 실패');
      }
    } catch (error) {
      console.error('GPT 목록 로드 오류:', error);
      setError('GPT 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 새 GPT 생성
  const createGPT = async () => {
    if (!newGPT.name.trim() || !newGPT.systemPrompt.trim()) {
      setError('이름과 시스템 프롬프트는 필수입니다');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/gpts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newGPT,
          createdBy: userId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setNewGPT({
          name: '',
          description: '',
          systemPrompt: '',
          temperature: 0.7,
          maxTokens: 2048,
          model: 'gemini-1.5-flash',
          isPublic: false
        });
        await loadGPTs();
        setError('');
      } else {
        setError(result.error || 'GPT 생성 실패');
      }
    } catch (error) {
      console.error('GPT 생성 오류:', error);
      setError('GPT 생성 중 오류가 발생했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  // GPT 삭제
  const deleteGPT = async (gptId: string) => {
    if (!confirm('정말로 이 GPT를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/gpts/${gptId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        await loadGPTs();
        if (selectedGPT?.id === gptId) {
          setSelectedGPT(null);
          setShowKnowledgeBase(false);
        }
      } else {
        setError(result.error || 'GPT 삭제 실패');
      }
    } catch (error) {
      console.error('GPT 삭제 오류:', error);
      setError('GPT 삭제 중 오류가 발생했습니다');
    }
  };

  // 지식 베이스 관리 모드 토글
  const toggleKnowledgeBase = (gpt: CustomGPT) => {
    if (selectedGPT?.id === gpt.id && showKnowledgeBase) {
      setShowKnowledgeBase(false);
      setSelectedGPT(null);
    } else {
      setSelectedGPT(gpt);
      setShowKnowledgeBase(true);
      setShowChat(false);
      setShowSearch(false);
    }
  };

  // 채팅 모드 토글
  const toggleChat = (gpt: CustomGPT) => {
    if (selectedGPT?.id === gpt.id && showChat) {
      setShowChat(false);
      setSelectedGPT(null);
    } else {
      setSelectedGPT(gpt);
      setShowChat(true);
      setShowKnowledgeBase(false);
      setShowSearch(false);
    }
  };

  // 검색 모드 토글
  const toggleSearch = (gpt: CustomGPT) => {
    if (selectedGPT?.id === gpt.id && showSearch) {
      setShowSearch(false);
      setSelectedGPT(null);
    } else {
      setSelectedGPT(gpt);
      setShowSearch(true);
      setShowKnowledgeBase(false);
      setShowChat(false);
    }
  };

  useEffect(() => {
    loadGPTs();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">GPT 목록을 불러오는 중...</div>
      </div>
    );
  }

  if (showKnowledgeBase && selectedGPT) {
    return (
      <div>
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowKnowledgeBase(false);
              setSelectedGPT(null);
            }}
          >
            ← GPT 목록으로 돌아가기
          </Button>
        </div>
        <GPTKnowledgeBaseManager
          gptId={selectedGPT.id}
          gptName={selectedGPT.name}
          userId={userId}
          onKnowledgeBaseUpdate={loadGPTs}
        />
      </div>
    );
  }

  if (showChat && selectedGPT) {
    return (
      <div className="h-screen flex flex-col">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowChat(false);
              setSelectedGPT(null);
            }}
          >
            ← GPT 목록으로 돌아가기
          </Button>
        </div>
        <div className="flex-1">
          <GPTChatInterface
            gptId={selectedGPT.id}
            gptName={selectedGPT.name}
            userId={userId}
            systemPrompt={selectedGPT.systemPrompt}
          />
        </div>
      </div>
    );
  }

  if (showSearch && selectedGPT) {
    return (
      <div>
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowSearch(false);
              setSelectedGPT(null);
            }}
          >
            ← GPT 목록으로 돌아가기
          </Button>
        </div>
        <GPTSearchInterface
          gptId={selectedGPT.id}
          gptName={selectedGPT.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">커스텀 GPT 관리</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 새 GPT 생성 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">새 GPT 생성</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">이름</label>
            <Input
              value={newGPT.name}
              onChange={(e) => setNewGPT({ ...newGPT, name: e.target.value })}
              placeholder="GPT 이름을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">모델</label>
            <select
              value={newGPT.model}
              onChange={(e) => setNewGPT({ ...newGPT, model: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="llama2">Llama 2</option>
              <option value="llama3">Llama 3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">온도 (0-2)</label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={newGPT.temperature}
              onChange={(e) => setNewGPT({ ...newGPT, temperature: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">최대 토큰</label>
            <Input
              type="number"
              min="1"
              max="8192"
              value={newGPT.maxTokens}
              onChange={(e) => setNewGPT({ ...newGPT, maxTokens: parseInt(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">설명</label>
            <Input
              value={newGPT.description}
              onChange={(e) => setNewGPT({ ...newGPT, description: e.target.value })}
              placeholder="GPT 설명을 입력하세요"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">시스템 프롬프트</label>
            <Textarea
              value={newGPT.systemPrompt}
              onChange={(e) => setNewGPT({ ...newGPT, systemPrompt: e.target.value })}
              placeholder="시스템 프롬프트를 입력하세요"
              className="h-32"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newGPT.isPublic}
                onChange={(e) => setNewGPT({ ...newGPT, isPublic: e.target.checked })}
                className="mr-2"
              />
              공개 GPT로 설정
            </label>
          </div>
        </div>
        <div className="mt-4">
          <Button 
            onClick={createGPT}
            disabled={isCreating || !newGPT.name.trim() || !newGPT.systemPrompt.trim()}
          >
            {isCreating ? '생성 중...' : 'GPT 생성'}
          </Button>
        </div>
      </Card>

      {/* GPT 목록 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">내 GPT 목록</h2>
        {gpts.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-gray-500">
              아직 생성된 GPT가 없습니다.
            </div>
          </Card>
        ) : (
          gpts.map((gpt) => (
            <Card key={gpt.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{gpt.name}</h3>
                    {gpt.isPublic && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        공개
                      </span>
                    )}
                  </div>
                  {gpt.description && (
                    <p className="text-gray-600 mb-2">{gpt.description}</p>
                  )}
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>모델: {gpt.model}</div>
                    <div>온도: {gpt.temperature} • 최대 토큰: {gpt.maxTokens}</div>
                    <div>지식 베이스: {gpt.knowledgeBaseIds.length}개</div>
                    <div>생성일: {new Date(gpt.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleChat(gpt)}
                  >
                    채팅
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSearch(gpt)}
                  >
                    검색
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleKnowledgeBase(gpt)}
                  >
                    지식 베이스 관리
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteGPT(gpt.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
              
              {/* 시스템 프롬프트 미리보기 */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="text-sm font-medium mb-1">시스템 프롬프트:</div>
                <div className="text-sm text-gray-700 max-h-20 overflow-y-auto">
                  {gpt.systemPrompt}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}