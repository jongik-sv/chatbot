'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  HelpCircle, 
  FileText, 
  Code2, 
  Settings, 
  Terminal,
  BookOpen,
  Wrench,
  Plus,
  Minus,
  Info,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MCPHelpGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 복사 완료 피드백을 위한 토스트 메시지 (필요시 구현)
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          MCP 관리 도움말
        </h2>
        <p className="text-gray-600 mt-1">
          Model Context Protocol (MCP) 서버를 추가, 삭제, 설정하는 방법을 안내합니다
        </p>
      </div>

      {/* MCP 개요 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            MCP (Model Context Protocol) 란?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700">
            MCP는 AI 모델이 다양한 외부 도구와 서비스에 안전하게 연결할 수 있도록 하는 
            표준화된 프로토콜입니다. 웹 검색, 파일 처리, API 호출 등의 기능을 제공합니다.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">현재 지원되는 MCP 서버:</h4>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>mcp-fetch</strong>: 웹페이지 콘텐츠 가져오기 및 처리</li>
              <li><strong>mcp-toolbox</strong>: MCP 서버 관리 및 도구 검색</li>
              <li><strong>mcp-context7</strong>: 라이브러리 문서 조회</li>
              <li><strong>mcp-sequential-thinking</strong>: 고급 추론 및 사고 도구</li>
              <li><strong>mcp-21st-dev-magic</strong>: UI 컴포넌트 생성 및 로고 검색</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* MCP 서버 추가 방법 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            MCP 서버 추가하기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">1. .mcp.json 파일 수정</h4>
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono text-gray-700">
                  ai-chatbot-mentor/.mcp.json
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('ai-chatbot-mentor/.mcp.json')}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  복사
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                <code>mcpServers</code> 객체에 새 서버 설정을 추가합니다.
              </p>
            </div>

            <h4 className="font-medium text-gray-900">2. 서버 설정 예시</h4>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400">// .mcp.json의 mcpServers에 추가</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`"my-custom-server": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "my-mcp-package"],
  "env": {
    "API_KEY": "your-api-key"
  },
  "disabled": false,
  "autoApprove": ["tool1", "tool2"]
}`)}
                  className="flex items-center gap-1 text-white border-gray-600 hover:bg-gray-800"
                >
                  <Copy className="h-3 w-3" />
                  복사
                </Button>
              </div>
              <pre className="text-gray-100">
{`"my-custom-server": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "my-mcp-package"],
  "env": {
    "API_KEY": "your-api-key"
  },
  "disabled": false,
  "autoApprove": ["tool1", "tool2"]
}`}
              </pre>
            </div>

            <h4 className="font-medium text-gray-900">3. 설정 옵션 설명</h4>
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <code className="text-blue-600">disabled</code>
                  <span className="text-gray-600">서버 비활성화 여부 (기본: false)</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">command</code>
                  <span className="text-gray-600">실행할 명령어 (예: cmd, uvx)</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">args</code>
                  <span className="text-gray-600">명령어 인수 배열</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">env</code>
                  <span className="text-gray-600">환경 변수 설정</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">autoApprove</code>
                  <span className="text-gray-600">자동 승인할 도구 목록</span>
                </div>
              </div>
            </div>

            <h4 className="font-medium text-gray-900">4. 내장 서버 타입</h4>
            <p className="text-sm text-gray-600">
              내장 서버의 경우 <code>type: "builtin"</code>을 설정하고 <code>tools</code> 배열에 제공할 도구를 명시합니다. 
              새로운 도구 설정 함수를 추가하세요.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">주의사항</p>
                <p className="text-yellow-800 mt-1">
                  서버를 추가한 후 개발 서버를 재시작해야 변경사항이 적용됩니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MCP 서버 삭제 방법 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-red-600" />
            MCP 서버 삭제하기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">1. 서버 설정 제거</h4>
            <p className="text-sm text-gray-600">
              <code>.mcp.json</code> 파일의 <code>mcpServers</code> 객체에서 
              해당 서버 설정을 제거하거나 <code>"disabled": true</code>로 설정합니다.
            </p>

            <h4 className="font-medium text-gray-900">2. 서버 비활성화 (권장)</h4>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-400"># 서버를 완전히 제거하지 않고 비활성화</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('"disabled": true')}
                  className="flex items-center gap-1 text-white border-gray-600 hover:bg-gray-800"
                >
                  <Copy className="h-3 w-3" />
                  복사
                </Button>
              </div>
              <pre>"disabled": true</pre>
            </div>

            <h4 className="font-medium text-gray-900">3. 개발 서버 재시작</h4>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-400"># 개발 서버 재시작</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('cd ai-chatbot-mentor\nnpm run dev')}
                  className="flex items-center gap-1 text-white border-gray-600 hover:bg-gray-800"
                >
                  <Copy className="h-3 w-3" />
                  복사
                </Button>
              </div>
              <pre>cd ai-chatbot-mentor{'\n'}npm run dev</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고급 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            고급 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">MCP 서비스 설정 수정</h4>
            <p className="text-sm text-gray-600">
              <code>.mcp.json</code> 파일은 서버 정의만 포함하며, 전역 설정은 MCPService.ts에서 관리됩니다:
            </p>
            
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <code className="text-blue-600">autoConnect</code>
                  <span className="text-gray-600">자동 연결 여부 (기본: true)</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">timeout</code>
                  <span className="text-gray-600">연결 타임아웃 (기본: 30초)</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">maxRetries</code>
                  <span className="text-gray-600">최대 재시도 횟수 (기본: 3)</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">retryDelay</code>
                  <span className="text-gray-600">재시도 간격 (기본: 1초)</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-blue-600">enableLogging</code>
                  <span className="text-gray-600">로깅 활성화 (기본: true)</span>
                </div>
              </div>
            </div>

            <h4 className="font-medium text-gray-900">완전한 .mcp.json 설정 예시</h4>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400"># 완전한 .mcp.json 파일 예시</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    },
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
      "disabled": false,
      "autoApprove": ["sequentialthinking"]
    },
    "Context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"],
      "disabled": false,
      "autoApprove": []
    }
  }
}`)}
                  className="flex items-center gap-1 text-white border-gray-600 hover:bg-gray-800"
                >
                  <Copy className="h-3 w-3" />
                  복사
                </Button>
              </div>
              <pre className="text-gray-100 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    },
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
      "disabled": false,
      "autoApprove": ["sequentialthinking"]
    },
    "Context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"],
      "disabled": false,
      "autoApprove": []
    }
  }
}`}
              </pre>
            </div>

            <h4 className="font-medium text-gray-900">외부 MCP 서버 연결</h4>
            <p className="text-sm text-gray-600">
              외부 MCP 서버에 연결하려면 <code>MCPClient.ts</code>에서 실제 MCP 프로토콜 통신을 구현해야 합니다.
              현재는 내장 서버 방식으로 동작합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 문제 해결 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            문제 해결
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">서버가 연결되지 않을 때</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
                <li>개발 서버를 재시작해 보세요</li>
                <li>콘솔에서 MCP 관련 오류 메시지를 확인하세요</li>
                <li>서버 ID가 중복되지 않았는지 확인하세요</li>
                <li>브라우저 개발자 도구의 네트워크 탭에서 API 호출을 확인하세요</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">도구 실행이 실패할 때</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
                <li>도구의 입력 스키마가 올바른지 확인하세요</li>
                <li>필수 매개변수가 모두 제공되었는지 확인하세요</li>
                <li>서버의 실행 통계에서 오류 패턴을 분석해 보세요</li>
                <li>MCP 서비스의 로그를 확인하세요</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">성능 최적화</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
                <li>사용하지 않는 서버는 비활성화하세요</li>
                <li>도구 실행 타임아웃을 적절히 설정하세요</li>
                <li>실행 히스토리가 너무 많이 쌓이지 않도록 주기적으로 정리하세요</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 참고 자료 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            참고 자료
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="font-medium text-blue-900">MCP 공식 문서</div>
                <div className="text-sm text-blue-700">Model Context Protocol 표준 문서</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://modelcontextprotocol.io/', '_blank')}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                열기
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="font-medium text-green-900">Claude Code 문서</div>
                <div className="text-sm text-green-700">Claude Code MCP 통합 가이드</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://docs.anthropic.com/en/docs/claude-code/mcp', '_blank')}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                열기
              </Button>
            </div>

            <div className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">주요 파일 위치:</p>
              <ul className="space-y-1 font-mono text-xs">
                <li>MCP 설정: <code>ai-chatbot-mentor/.mcp.json</code></li>
                <li>MCP 서비스: <code>ai-chatbot-mentor/src/services/MCPService.ts</code></li>
                <li>MCP 클라이언트: <code>ai-chatbot-mentor/src/services/MCPClient.ts</code></li>
                <li>MCP 타입 정의: <code>ai-chatbot-mentor/src/types/mcp.ts</code></li>
                <li>MCP API: <code>ai-chatbot-mentor/src/app/api/mcp/</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}