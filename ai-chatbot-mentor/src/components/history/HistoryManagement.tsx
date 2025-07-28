'use client';

import { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface BackupInfo {
  id: string;
  userId: number;
  fileName: string;
  backupName: string;
  createdAt: string;
  sessionCount: number;
  fileSize: number;
}

interface HistoryManagementProps {
  userId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryManagement({ 
  userId = 1, 
  isOpen, 
  onClose 
}: HistoryManagementProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupName, setBackupName] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen, userId]);

  const loadBackups = async () => {
    try {
      const response = await fetch(`/api/sessions/backup?userId=${userId}`);
      if (!response.ok) throw new Error('백업 목록을 불러올 수 없습니다.');
      
      const data = await response.json();
      setBackups(data.backups);
    } catch (error) {
      console.error('백업 목록 로딩 실패:', error);
      setError(error instanceof Error ? error.message : '백업 목록 로딩 실패');
    }
  };

  const handleExportHistory = async (format: 'json' | 'text', sessionId?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        userId: userId.toString(),
        format,
        includeMetadata: 'true'
      });
      
      if (sessionId) {
        params.append('sessionId', sessionId.toString());
      }

      const response = await fetch(`/api/sessions/export?${params}`);
      if (!response.ok) throw new Error('내보내기에 실패했습니다.');

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
                   `history_${format}_${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`히스토리가 ${format.toUpperCase()} 형식으로 내보내졌습니다.`);
    } catch (error) {
      console.error('내보내기 실패:', error);
      setError(error instanceof Error ? error.message : '내보내기 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      setError('백업 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sessions/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          backupName: backupName.trim()
        })
      });

      if (!response.ok) throw new Error('백업 생성에 실패했습니다.');
      
      const data = await response.json();
      setSuccess(`백업이 생성되었습니다: ${data.backup.sessionCount}개 세션`);
      setBackupName('');
      loadBackups();
    } catch (error) {
      console.error('백업 생성 실패:', error);
      setError(error instanceof Error ? error.message : '백업 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupFileName: string) => {
    if (!confirm(`백업을 복원하시겠습니까? (${restoreMode === 'replace' ? '기존 데이터 삭제 후 복원' : '기존 데이터와 병합'})`)) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sessions/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          backupFileName,
          restoreMode
        })
      });

      if (!response.ok) throw new Error('백업 복원에 실패했습니다.');
      
      const data = await response.json();
      setSuccess(data.message);
    } catch (error) {
      console.error('백업 복원 실패:', error);
      setError(error instanceof Error ? error.message : '백업 복원 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (backupFileName: string) => {
    try {
      const response = await fetch(`/api/sessions/restore?userId=${userId}&fileName=${backupFileName}`);
      if (!response.ok) throw new Error('백업 파일 다운로드에 실패했습니다.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('백업 다운로드 실패:', error);
      setError(error instanceof Error ? error.message : '백업 다운로드 실패');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 백드롭 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">히스토리 관리</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 내용 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* 알림 메시지 */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  닫기
                </button>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{success}</p>
                <button 
                  onClick={() => setSuccess(null)}
                  className="mt-2 text-xs text-green-600 hover:text-green-800"
                >
                  닫기
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 내보내기 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">히스토리 내보내기</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleExportHistory('json')}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <CodeBracketIcon className="w-5 h-5 mr-2" />
                    전체 히스토리 JSON으로 내보내기
                  </button>
                  
                  <button
                    onClick={() => handleExportHistory('text')}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    전체 히스토리 텍스트로 내보내기
                  </button>
                </div>
              </div>

              {/* 백업 생성 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">백업 생성</h3>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="백업 이름 입력..."
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={handleCreateBackup}
                    disabled={loading || !backupName.trim()}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                    백업 생성
                  </button>
                </div>
              </div>
            </div>

            {/* 백업 목록 */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">백업 목록</h3>
              
              {/* 복원 모드 선택 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  복원 모드
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">병합 (기존 데이터 유지)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">교체 (기존 데이터 삭제 후 복원)</span>
                  </label>
                </div>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>생성된 백업이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div key={backup.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{backup.backupName}</h4>
                          <div className="mt-1 text-sm text-gray-500">
                            <p>생성일: {formatDate(backup.createdAt)}</p>
                            <p>세션 수: {backup.sessionCount}개 • 파일 크기: {formatFileSize(backup.fileSize)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleDownloadBackup(backup.fileName)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="다운로드"
                          >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleRestoreBackup(backup.fileName)}
                            disabled={loading}
                            className="p-2 text-gray-400 hover:text-green-600 disabled:opacity-50"
                            title="복원"
                          >
                            <CloudArrowDownIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 로딩 오버레이 */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">처리 중...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}