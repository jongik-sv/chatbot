'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import MBTISelector from '@/components/mbti/MBTISelector';
import MBTIMentorSelector from '@/components/mbti/MBTIMentorSelector';
import ChatInterface from '@/components/chat/ChatInterface';
import { ChatProvider } from '@/contexts/ChatContext';
import { MBTIType, MBTICompatibility } from '@/types';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';

type Step = 'user-mbti' | 'mentor-select' | 'chat';

export default function MBTIPage() {
  const [currentStep, setCurrentStep] = useState<Step>('user-mbti');
  const [userMBTI, setUserMBTI] = useState<MBTIType | undefined>();
  const [selectedMentorType, setSelectedMentorType] = useState<MBTIType | undefined>();
  const [compatibility, setCompatibility] = useState<MBTICompatibility | undefined>();
  const [mentorId, setMentorId] = useState<number | undefined>();

  const handleUserMBTISelect = (mbtiType: MBTIType) => {
    setUserMBTI(mbtiType);
    setCurrentStep('mentor-select');
  };

  const handleMentorSelect = async (mentorType: MBTIType, mentorCompatibility?: MBTICompatibility) => {
    setSelectedMentorType(mentorType);
    setCompatibility(mentorCompatibility);

    // MBTI 멘토 생성
    try {
      const response = await fetch('/api/mbti/mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mbtiType: mentorType,
          userType: userMBTI,
          userId: 1 // 임시 사용자 ID
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMentorId(data.mentor.id);
        setCurrentStep('chat');
      } else {
        console.error('멘토 생성 실패:', data.error);
      }
    } catch (error) {
      console.error('멘토 생성 오류:', error);
    }
  };

  const handleBackToMentorSelect = () => {
    setCurrentStep('mentor-select');
    setSelectedMentorType(undefined);
    setMentorId(undefined);
  };

  const handleBackToUserSelect = () => {
    setCurrentStep('user-mbti');
    setUserMBTI(undefined);
    setSelectedMentorType(undefined);
    setMentorId(undefined);
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentStep !== 'user-mbti' && (
                <button
                  onClick={currentStep === 'mentor-select' ? handleBackToUserSelect : handleBackToMentorSelect}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 mr-1" />
                  이전
                </button>
              )}

              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">MBTI 멘토링</h1>
              </div>
            </div>

            {/* 진행 단계 표시 */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep === 'user-mbti' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                1
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep === 'mentor-select' ? 'bg-blue-600 text-white' :
                currentStep === 'chat' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                2
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                3
              </div>
            </div>
          </div>

          {/* 현재 단계 설명 */}
          <div className="mt-4">
            {currentStep === 'user-mbti' && (
              <p className="text-gray-600">1단계: 당신의 MBTI 성격 유형을 선택하세요</p>
            )}
            {currentStep === 'mentor-select' && (
              <p className="text-gray-600">
                2단계: {userMBTI} 유형에 맞는 멘토를 선택하세요
              </p>
            )}
            {currentStep === 'chat' && (
              <div className="space-y-1">
                <p className="text-gray-600">
                  3단계: {selectedMentorType} 멘토와 대화를 시작하세요
                </p>
                {compatibility && (
                  <p className="text-sm text-gray-500">
                    호환성: {compatibility.compatibilityScore}/10
                    {compatibility.compatibilityScore >= 8 ? ' 🟢 매우 좋음' :
                      compatibility.compatibilityScore >= 6 ? ' 🟡 좋음' : ' 🔴 보통'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'user-mbti' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <MBTISelector
                  onTypeSelect={handleUserMBTISelect}
                  showGroups={true}
                  showDetails={true}
                />
              </div>
            </div>
          )}

          {currentStep === 'mentor-select' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <MBTIMentorSelector
                  userMBTI={userMBTI}
                  onMentorSelect={handleMentorSelect}
                  selectedMentorType={selectedMentorType}
                  showCompatibility={true}
                />
              </div>
            </div>
          )}

          {currentStep === 'chat' && mentorId && (
            <ChatProvider>
              <ChatInterface
                className="h-full"
                initialMode="mbti"
                initialMentorId={mentorId}
                mbtiContext={{
                  userType: userMBTI!,
                  mentorType: selectedMentorType!,
                  compatibility: compatibility
                }}
              />
            </ChatProvider>
          )}
        </div>
      </div>
    </MainLayout>
  );
}