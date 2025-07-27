'use client';

import React, { useState, useEffect } from 'react';
import { SpeechToTextService, SpeechRecognitionResult } from '../../services/SpeechToTextService';

interface VoiceToTextProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  language?: string;
  placeholder?: string;
}

export default function VoiceToText({
  onTranscript,
  onError,
  disabled = false,
  language = 'ko-KR',
  placeholder = '음성 인식 버튼을 클릭하여 음성으로 입력하세요'
}: VoiceToTextProps) {
  const [speechService] = useState(() => new SpeechToTextService());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(speechService.isAvailable());
  }, [speechService]);

  const startListening = async () => {
    if (!isSupported || disabled || isListening) return;

    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      // 권한 확인
      const hasPermission = await speechService.requestPermission();
      if (!hasPermission) {
        setError('마이크 권한이 필요합니다.');
        return;
      }

      await speechService.startListening(
        {
          language,
          continuous: false,
          interimResults: true,
          maxAlternatives: 1
        },
        (result: SpeechRecognitionResult) => {
          if (result.isFinal) {
            setTranscript(result.transcript);
            setInterimTranscript('');
            onTranscript(result.transcript);
          } else {
            setInterimTranscript(result.transcript);
          }
        },
        (error: string) => {
          setError(error);
          setIsListening(false);
          if (onError) onError(error);
        },
        () => {
          setIsListening(false);
        }
      );

      setIsListening(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '음성 인식을 시작할 수 없습니다.';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  };

  const stopListening = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-sm text-gray-600">음성 인식이 지원되지 않는 브라우저입니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 음성 인식 결과 */}
      {(transcript || interimTranscript) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-blue-700">음성 인식 결과</span>
            <button
              onClick={clearTranscript}
              className="text-blue-400 hover:text-blue-600 text-sm"
            >
              지우기
            </button>
          </div>
          <div className="text-gray-800">
            {transcript && (
              <span className="text-green-600 font-medium">{transcript}</span>
            )}
            {interimTranscript && (
              <span className="text-gray-500 italic">{interimTranscript}</span>
            )}
          </div>
        </div>
      )}

      {/* 음성 인식 컨트롤 */}
      <div className="flex items-center space-x-3">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
            ${isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-white shadow-lg hover:shadow-xl'}
          `}
        >
          {isListening ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">
            {isListening ? '음성 인식 중...' : '음성 인식'}
          </span>
          <span className="text-xs text-gray-500">
            {isListening ? '말씀하세요' : '클릭하여 음성 입력 시작'}
          </span>
        </div>
      </div>

      {/* 언어 설정 */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">인식 언어:</span>
        <select
          value={language}
          onChange={(e) => {
            // 언어 변경은 부모 컴포넌트에서 처리
          }}
          disabled={disabled || isListening}
          className="text-xs border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
        >
          {speechService.getSupportedLanguages().map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* 사용법 안내 */}
      {!isListening && !transcript && !error && (
        <p className="text-xs text-gray-500">
          {placeholder}
        </p>
      )}
    </div>
  );
}