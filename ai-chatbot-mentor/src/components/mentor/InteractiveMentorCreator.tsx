// components/mentor/InteractiveMentorCreator.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface CreationQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'scale';
  options?: string[];
  category: string;
  required: boolean;
}

interface GeneratedMentorProfile {
  name: string;
  description: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    teachingApproach: string;
    responseStyle: string;
  };
  expertise: string[];
  mbtiType?: string;
  systemPrompt: string;
  reasoning: string;
}

interface SessionProgress {
  current: number;
  total: number;
  percentage: number;
}

interface InteractiveMentorCreatorProps {
  userId?: number;
  onMentorCreated: (mentor: any) => void;
  onCancel: () => void;
}

export default function InteractiveMentorCreator({ 
  userId, 
  onMentorCreated, 
  onCancel 
}: InteractiveMentorCreatorProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CreationQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [progress, setProgress] = useState<SessionProgress>({ current: 0, total: 0, percentage: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<GeneratedMentorProfile | null>(null);
  const [customizations, setCustomizations] = useState({
    name: '',
    description: '',
    additionalTraits: [] as string[],
    systemPromptAdditions: ''
  });
  const [error, setError] = useState<string | null>(null);

  // 세션 시작
  const startSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mentors/create-interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          userId
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.data.sessionId);
        setCurrentQuestion(data.data.currentQuestion);
        setProgress(data.data.progress);
      } else {
        setError(data.error || '세션 시작에 실패했습니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 질문 답변
  const answerQuestion = async () => {
    if (!sessionId || !currentQuestion || !currentAnswer.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mentors/create-interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'answer',
          sessionId,
          questionId: currentQuestion.id,
          answer: currentAnswer,
          userId
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress(data.data.progress);
        
        if (data.data.isComplete) {
          setIsComplete(true);
          setMentorProfile(data.data.mentorProfile);
          setCustomizations(prev => ({
            ...prev,
            name: data.data.mentorProfile.name,
            description: data.data.mentorProfile.description
          }));
        } else {
          setCurrentQuestion(data.data.currentQuestion);
          setCurrentAnswer('');
        }
      } else {
        setError(data.error || '답변 처리에 실패했습니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 멘토 생성 완료
  const completeMentorCreation = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mentors/create-interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          sessionId,
          userId,
          customizations: {
            name: customizations.name,
            description: customizations.description,
            additionalTraits: customizations.additionalTraits,
            systemPromptAdditions: customizations.systemPromptAdditions
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        onMentorCreated(data.data);
      } else {
        setError(data.error || '멘토 생성에 실패했습니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 세션 시작
  useEffect(() => {
    startSession();
  }, []);

  // 선택형 질문 처리
  const handleChoiceSelect = (option: string) => {
    setCurrentAnswer(option);
  };

  // 추가 특성 관리
  const addTrait = (trait: string) => {
    if (trait.trim() && !customizations.additionalTraits.includes(trait.trim())) {
      setCustomizations(prev => ({
        ...prev,
        additionalTraits: [...prev.additionalTraits, trait.trim()]
      }));
    }
  };

  const removeTrait = (trait: string) => {
    setCustomizations(prev => ({
      ...prev,
      additionalTraits: prev.additionalTraits.filter(t => t !== trait)
    }));
  };

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">오류가 발생했습니다</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={startSession} variant="outline">
                다시 시도
              </Button>
              <Button onClick={onCancel} variant="secondary">
                취소
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isComplete && mentorProfile) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            멘토 프로필 완성!
          </CardTitle>
          <Progress value={100} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 생성된 프로필 미리보기 */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">멘토 이름</label>
                <Input
                  value={customizations.name}
                  onChange={(e) => setCustomizations(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="멘토 이름을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">멘토 설명</label>
                <Textarea
                  value={customizations.description}
                  onChange={(e) => setCustomizations(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="멘토 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">추가 특성</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {customizations.additionalTraits.map((trait, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTrait(trait)}>
                      {trait} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="추가할 특성을 입력하고 Enter를 누르세요"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTrait(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">추가 지시사항</label>
                <Textarea
                  value={customizations.systemPromptAdditions}
                  onChange={(e) => setCustomizations(prev => ({ ...prev, systemPromptAdditions: e.target.value }))}
                  placeholder="멘토에게 추가로 전달할 지시사항이 있다면 입력하세요"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">생성된 프로필</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">이름:</span> {mentorProfile.name}
                  </div>
                  <div>
                    <span className="font-medium">설명:</span> {mentorProfile.description}
                  </div>
                  <div>
                    <span className="font-medium">특성:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mentorProfile.personality.traits.map((trait, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">전문 분야:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mentorProfile.expertise.map((exp, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {mentorProfile.mbtiType && (
                    <div>
                      <span className="font-medium">MBTI:</span> {mentorProfile.mbtiType}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">AI의 분석</h3>
                <p className="text-sm text-gray-700">{mentorProfile.reasoning}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={onCancel} variant="outline">
              취소
            </Button>
            <Button 
              onClick={completeMentorCreation} 
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  멘토 생성 완료
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          대화형 멘토 생성
        </CardTitle>
        <div className="space-y-2">
          <Progress value={progress.percentage} className="w-full" />
          <div className="text-sm text-gray-600 text-center">
            {progress.current} / {progress.total} 단계 ({progress.percentage}%)
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {currentQuestion && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">{currentQuestion.question}</h3>
              <Badge variant="outline" className="text-xs">
                {currentQuestion.category}
              </Badge>
            </div>

            {currentQuestion.type === 'choice' && currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={currentAnswer === option ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleChoiceSelect(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            ) : (
              <Textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="답변을 입력해주세요..."
                rows={4}
              />
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={onCancel} variant="outline">
                취소
              </Button>
              <Button 
                onClick={answerQuestion}
                disabled={!currentAnswer.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    다음
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {isLoading && !currentQuestion && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">세션을 준비하고 있습니다...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}