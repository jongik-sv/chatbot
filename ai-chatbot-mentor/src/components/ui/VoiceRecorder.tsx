'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
  maxDuration?: number; // 초 단위
}

export default function VoiceRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
  maxDuration = 300 // 5분
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // 브라우저 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setError('이 브라우저는 음성 녹음을 지원하지 않습니다.');
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!isSupported || disabled) return;

    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        const recordingDuration = Date.now() - startTimeRef.current;
        onRecordingComplete(audioBlob, Math.floor(recordingDuration / 1000));
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      if (onRecordingStart) {
        onRecordingStart();
      }

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          // 최대 시간 도달 시 자동 정지
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('음성 녹음 시작 실패:', error);
      setError('마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (onRecordingStop) {
      onRecordingStop();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return (duration / maxDuration) * 100;
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">음성 녹음이 지원되지 않는 브라우저입니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      {/* 에러 메시지 */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 녹음 컨트롤 */}
      <div className="flex items-center space-x-3">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
            ${isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-white shadow-lg hover:shadow-xl'}
          `}
        >
          {isRecording ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          )}
        </button>

        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">
            {isRecording ? '녹음 중...' : '음성 녹음'}
          </span>
          {isRecording && (
            <span className="text-xs text-gray-500">
              {formatDuration(duration)} / {formatDuration(maxDuration)}
            </span>
          )}
        </div>
      </div>

      {/* 진행률 표시 */}
      {isRecording && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      )}

      {/* 사용법 안내 */}
      {!isRecording && !error && (
        <p className="text-xs text-gray-500">
          마이크 버튼을 클릭하여 음성 녹음을 시작하세요. 최대 {Math.floor(maxDuration / 60)}분까지 녹음 가능합니다.
        </p>
      )}
    </div>
  );
}