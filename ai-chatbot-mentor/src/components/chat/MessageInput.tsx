'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  MicrophoneIcon,
  PaperClipIcon 
} from '@heroicons/react/24/outline';
import ImageUpload from '../ui/ImageUpload';
import VoiceRecorder from '../ui/VoiceRecorder';
import VoiceToText from '../ui/VoiceToText';

interface MessageInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "메시지를 입력하세요..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVoiceToText, setShowVoiceToText] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{file: File, preview: string} | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const allFiles = selectedImage ? [...selectedFiles, selectedImage.file] : selectedFiles;
    if ((message.trim() || allFiles.length > 0) && !disabled) {
      onSendMessage(message.trim(), allFiles);
      setMessage('');
      setSelectedFiles([]);
      setSelectedImage(null);
      setShowImageUpload(false);
      setShowVoiceRecorder(false);
      setShowVoiceToText(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // 메시지 전송 후 텍스트 영역에 포커스 유지
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedImage({ file, preview });
    setShowImageUpload(false);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  const handleVoiceRecording = (audioBlob: Blob, duration: number) => {
    // 오디오 파일을 File 객체로 변환
    const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, {
      type: audioBlob.type,
      lastModified: Date.now()
    });
    
    setSelectedFiles(prev => [...prev, audioFile]);
    setShowVoiceRecorder(false);
  };

  const toggleImageUpload = () => {
    setShowImageUpload(!showImageUpload);
    setShowVoiceRecorder(false);
  };

  const toggleVoiceRecorder = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
    setShowImageUpload(false);
    setShowVoiceToText(false);
  };

  const toggleVoiceToText = () => {
    setShowVoiceToText(!showVoiceToText);
    setShowImageUpload(false);
    setShowVoiceRecorder(false);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    setShowVoiceToText(false);
    // 텍스트 영역에 포커스
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">이미지 업로드</h3>
            <button
              onClick={() => setShowImageUpload(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
          <ImageUpload
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
            disabled={disabled}
            preview={selectedImage?.preview}
          />
        </div>
      )}

      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">음성 녹음</h3>
            <button
              onClick={() => setShowVoiceRecorder(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecording}
            disabled={disabled}
          />
        </div>
      )}

      {/* Voice to Text Modal */}
      {showVoiceToText && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">음성으로 텍스트 입력</h3>
            <button
              onClick={() => setShowVoiceToText(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
          <VoiceToText
            onTranscript={handleVoiceTranscript}
            disabled={disabled}
            placeholder="마이크 버튼을 클릭하고 음성으로 메시지를 입력하세요"
          />
        </div>
      )}

      {/* Selected Image */}
      {selectedImage && (
        <div className="flex items-center bg-green-50 border border-green-200 rounded-lg p-3">
          <img 
            src={selectedImage.preview} 
            alt="선택된 이미지" 
            className="w-12 h-12 object-cover rounded"
          />
          <span className="ml-3 text-sm text-green-700 flex-1">
            이미지가 선택되었습니다
          </span>
          <button
            onClick={handleImageRemove}
            className="text-green-400 hover:text-green-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
              <span className="text-sm text-blue-700 truncate max-w-32">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(index)}
                className="ml-2 text-blue-400 hover:text-blue-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2 sm:space-x-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment buttons */}
        <div className="hidden sm:flex space-x-1">
          <button
            type="button"
            onClick={toggleImageUpload}
            disabled={disabled}
            className={`p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              showImageUpload ? 'text-blue-500 bg-blue-50' : 'text-gray-600 hover:text-gray-800'
            }`}
            title="이미지 업로드"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="파일 업로드"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={toggleVoiceToText}
              disabled={disabled}
              className={`p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                showVoiceToText ? 'text-green-500 bg-green-50' : 'text-gray-600 hover:text-gray-800'
              }`}
              title="음성으로 텍스트 입력"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            
            {/* 음성 녹음 버튼 (작은 크기) */}
            <button
              type="button"
              onClick={toggleVoiceRecorder}
              disabled={disabled}
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full text-xs hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                showVoiceRecorder ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}
              title="음성 녹음"
            >
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile attachment button */}
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="첨부"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none text-gray-900 placeholder-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          
          {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!message.trim() && selectedFiles.length === 0 && !selectedImage) || disabled}
            className="absolute right-2 bottom-2 p-2 text-blue-500 hover:text-blue-600 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Helper text */}
      <div className="text-xs text-gray-500 px-1">
        Enter로 전송, Shift+Enter로 줄바꿈
      </div>
    </div>
  );
}