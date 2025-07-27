// components/chat/ModelSettings.tsx
'use client';

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  CogIcon, 
  XMarkIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { useChatContext } from '../../contexts/ChatContext';

interface ModelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelSettings({ isOpen, onClose }: ModelSettingsProps) {
  const { state, getModelSettings, updateModelSettings } = useChatContext();
  const [localSettings, setLocalSettings] = useState(() => 
    getModelSettings(state.selectedModel)
  );

  const selectedModel = state.availableModels.find(m => m.id === state.selectedModel);

  const handleSave = () => {
    updateModelSettings(state.selectedModel, localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: '',
    };
    setLocalSettings(defaultSettings);
    updateModelSettings(state.selectedModel, defaultSettings);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    모델 설정
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {selectedModel && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {selectedModel.provider === 'ollama' ? '🦙' : '💎'}
                      </span>
                      <span className="font-medium">{selectedModel.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedModel.provider === 'ollama' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedModel.provider.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                      <span className="ml-1 text-gray-400">
                        <InformationCircleIcon 
                          className="w-4 h-4 inline" 
                          title="창의성 조절 (0.0 = 보수적, 1.0 = 창의적)"
                        />
                      </span>
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={localSettings.temperature}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          temperature: parseFloat(e.target.value)
                        }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 w-8">
                        {localSettings.temperature}
                      </span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최대 토큰 수
                      <span className="ml-1 text-gray-400">
                        <InformationCircleIcon 
                          className="w-4 h-4 inline" 
                          title="응답의 최대 길이"
                        />
                      </span>
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="8192"
                      step="100"
                      value={localSettings.maxTokens}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value) || 2048
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시스템 프롬프트
                      <span className="ml-1 text-gray-400">
                        <InformationCircleIcon 
                          className="w-4 h-4 inline" 
                          title="AI의 역할과 행동을 정의하는 지시사항"
                        />
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={localSettings.systemPrompt}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        systemPrompt: e.target.value
                      }))}
                      placeholder="예: 당신은 도움이 되는 AI 어시스턴트입니다..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    기본값으로 재설정
                  </button>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}