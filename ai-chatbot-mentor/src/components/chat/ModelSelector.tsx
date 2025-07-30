'use client';

import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, CpuChipIcon, CogIcon } from '@heroicons/react/24/outline';
import { LLMModel } from '../../types';
import ModelSettings from './ModelSettings';

interface ModelSelectorProps {
  models: LLMModel[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({ models, selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [showSettings, setShowSettings] = useState(false);
  const selectedModelData = models.find(model => model.id === selectedModel);

  const getModelIcon = (provider: 'ollama' | 'gemini') => {
    switch (provider) {
      case 'ollama':
        return '🦙';
      case 'gemini':
        return '💎';
      default:
        return '🤖';
    }
  };

  const getModelBadgeColor = (provider: 'ollama' | 'gemini') => {
    switch (provider) {
      case 'ollama':
        return 'bg-green-100 text-green-800';
      case 'gemini':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModelStatusColor = (available: boolean) => {
    return available ? 'text-green-500' : 'text-red-500';
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <div className="flex items-center space-x-2">
          <CpuChipIcon className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">AI 모델:</span>
        </div>
      
      <Listbox value={selectedModel} onChange={onModelChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button className={`relative w-full sm:w-[32rem] cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} text-gray-900 placeholder:text-gray-900`}>
            <span className="flex items-center">
              <span className="mr-2 text-lg">
                {getModelIcon(selectedModelData?.provider || 'ollama')}
              </span>
              <span className="block truncate text-gray-900">{selectedModelData?.name || selectedModel}</span>
              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getModelBadgeColor(selectedModelData?.provider || 'ollama')}`}>
                {selectedModelData?.provider.toUpperCase() || 'UNKNOWN'}
              </span>
              {selectedModelData?.multimodal && (
                <span className="ml-1 text-xs text-purple-600" title="멀티모달 지원">
                  🖼️
                </span>
              )}
              <span className={`ml-1 text-xs ${getModelStatusColor(selectedModelData?.available ?? true)}`}>
                ●
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {models.map((model) => (
                <Listbox.Option
                  key={model.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-100 text-blue-900' : 'text-gray-800'} text-gray-800`
                  }
                  value={model.id}
                >
                  {({ selected }) => (
                    <>
                      <div className="flex items-center">
                        <span className="mr-2 text-lg">
                          {getModelIcon(model.provider)}
                        </span>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {model.name}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getModelBadgeColor(model.provider)}`}>
                          {model.provider.toUpperCase()}
                        </span>
                        {model.multimodal && (
                          <span className="ml-1 text-xs text-purple-600" title="멀티모달 지원">
                            🖼️
                          </span>
                        )}
                        <span className={`ml-1 text-xs ${getModelStatusColor(model.available)}`}>
                          ●
                        </span>
                      </div>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Settings button */}
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        disabled={disabled || !selectedModel}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="모델 설정"
      >
        <CogIcon className="w-5 h-5" />
      </button>
    </div>

    {/* Settings Modal */}
    <ModelSettings 
      isOpen={showSettings} 
      onClose={() => setShowSettings(false)} 
    />
  </>
  );
}