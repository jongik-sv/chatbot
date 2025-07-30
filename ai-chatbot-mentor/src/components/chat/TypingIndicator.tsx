'use client';

import { CpuChipIcon } from '@heroicons/react/24/outline';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start p-4">
      <div className="flex max-w-3xl">
        {/* Avatar */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
            <CpuChipIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Typing animation */}
        <div className="bg-gray-100 rounded-lg px-4 py-2">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-gray-500 ml-2">AI가 응답을 생성하고 있습니다...</span>
          </div>
        </div>
      </div>
    </div>
  );
}