'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Send, 
  Code, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Copy,
  Loader2
} from 'lucide-react';

interface MCPToolTestDialogProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  toolName: string;
  toolDescription: string;
}

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
  timestamp: string;
}

export default function MCPToolTestDialog({
  open,
  onClose,
  serverId,
  toolName,
  toolDescription
}: MCPToolTestDialogProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [rawParams, setRawParams] = useState<string>('{}');
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);

  // 파라미터 입력 방식
  const [inputMode, setInputMode] = useState<'form' | 'json'>('json');

  // 다이얼로그가 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setParameters({});
      setRawParams('{}');
      setIsValidJson(true);
      setCurrentResult(null);
      loadToolSchema();
    }
  }, [open, serverId, toolName]);

  // 도구 스키마 로드 (향후 구현)
  const loadToolSchema = async () => {
    // TODO: 서버에서 도구의 스키마 정보를 가져와서 폼 필드 생성
    // 현재는 JSON 입력 방식으로만 지원
  };

  // JSON 파라미터 검증
  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setParameters(parsed);
      setIsValidJson(true);
      return true;
    } catch (error) {
      setIsValidJson(false);
      return false;
    }
  };

  // 파라미터 입력 변경 처리
  const handleRawParamsChange = (value: string) => {
    setRawParams(value);
    validateJson(value);
  };

  // 도구 실행
  const executeTest = async () => {
    if (!isValidJson) {
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/mcp/test-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId,
          toolName,
          arguments: parameters
        })
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      const result: TestResult = {
        success: data.success,
        result: data.result,
        error: data.error,
        executionTime,
        timestamp: new Date().toISOString()
      };

      setCurrentResult(result);
      setTestResults(prev => [result, ...prev.slice(0, 9)]); // 최근 10개만 유지

    } catch (error) {
      const result: TestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      setCurrentResult(result);
      setTestResults(prev => [result, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  // 결과 복사
  const copyResult = async (result: any) => {
    try {
      const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(resultText);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  // 미리 정의된 예제 파라미터
  const getExampleParameters = () => {
    const examples: Record<string, any> = {
      'fetch': {
        url: 'https://example.com',
        max_length: 5000
      },
      'sequentialthinking': {
        thought: '사용자 요청을 단계별로 분석해보겠습니다.',
        nextThoughtNeeded: true,
        thoughtNumber: 1,
        totalThoughts: 3
      },
      'resolve-library-id': {
        libraryName: 'react'
      },
      'get-library-docs': {
        context7CompatibleLibraryID: '/facebook/react',
        tokens: 5000
      }
    };

    return examples[toolName] || {};
  };

  // 예제 파라미터 로드
  const loadExample = () => {
    const example = getExampleParameters();
    const exampleJson = JSON.stringify(example, null, 2);
    setRawParams(exampleJson);
    validateJson(exampleJson);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Code className="h-5 w-5" />
              MCP 도구 테스트
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{serverId}</Badge>
              <Badge variant="secondary">{toolName}</Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">{toolDescription}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* 왼쪽: 파라미터 입력 */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-900">
                  도구 파라미터
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadExample}
                    className="text-xs"
                  >
                    예제 로드
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={rawParams}
                  onChange={(e) => handleRawParamsChange(e.target.value)}
                  placeholder="JSON 형식으로 파라미터를 입력하세요..."
                  className={`min-h-[200px] font-mono text-sm ${
                    !isValidJson ? 'border-red-300 focus:border-red-500' : ''
                  }`}
                />
                {!isValidJson && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    유효하지 않은 JSON 형식입니다
                  </div>
                )}
              </div>

              <Button
                onClick={executeTest}
                disabled={!isValidJson || isLoading}
                className="w-full flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isLoading ? '실행 중...' : '도구 실행'}
              </Button>
            </div>
          </div>

          {/* 오른쪽: 결과 표시 */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-900">
                실행 결과
              </Label>

              {/* 현재 결과 */}
              {currentResult && (
                <Card className={`${
                  currentResult.success ? 'border-green-200' : 'border-red-200'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {currentResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {currentResult.success ? '성공' : '실패'}
                        </span>
                        {currentResult.executionTime && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {currentResult.executionTime}ms
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyResult(
                          currentResult.success ? currentResult.result : currentResult.error
                        )}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {currentResult.success
                          ? typeof currentResult.result === 'string'
                            ? currentResult.result
                            : JSON.stringify(currentResult.result, null, 2)
                          : currentResult.error
                        }
                      </pre>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(currentResult.timestamp).toLocaleString('ko-KR')}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 이전 실행 기록 */}
              {testResults.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    이전 실행 기록
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {testResults.slice(1).map((result, index) => (
                      <Card key={index} className="border-gray-200">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-xs">
                                {result.success ? '성공' : '실패'}
                              </span>
                              {result.executionTime && (
                                <span className="text-xs text-gray-500">
                                  {result.executionTime}ms
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(result.timestamp).toLocaleTimeString('ko-KR')}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {!currentResult && (
                <div className="text-center text-gray-500 text-sm py-8">
                  도구를 실행하면 결과가 여기에 표시됩니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}