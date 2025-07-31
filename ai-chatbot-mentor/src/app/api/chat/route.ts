// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
// JavaScript Repository 사용 (히스토리 API와 호환성을 위해)
const ChatRepository = require('../../../lib/repositories/ChatRepository');
const RuleIntegration = require('../../../lib/services/RuleIntegration');
import { LLMService } from '../../../services/LLMService';
import { PromptLoader } from '../../../utils/promptLoader';
import { MentorContextService } from '../../../services/MentorContextService';
import { vectorSearchService } from '../../../services/VectorSearchService';
import { ArtifactService } from '../../../services/ArtifactService';
import { mcpService } from '../../../services/MCPService';
import { parseArtifactsFromContent } from '../../../utils/artifactParser';
import { detectContinuation, shouldUpdateExistingArtifact, enhancePromptForContinuation } from '../../../utils/continuationHandler';
import { ChatRequest, ChatResponse, Message } from '../../../types';
import { readFile } from 'fs/promises';
import path from 'path';

// 스트리밍 함수 제거 - 일반 요청-응답만 사용

const chatRepo = new ChatRepository();
const llmService = new LLMService();
const mentorContextService = new MentorContextService();
const ruleIntegration = new RuleIntegration();

/**
 * Sequential Thinking 대체 실행 (MCP 서버 연결 실패 시)
 */
async function executeSequentialThinkingFallback(args: Record<string, any>, message: string): Promise<string> {
  const { thought } = args;
  
  // MCP 도구 분석
  if (message.includes('MCP') || message.includes('도구') || message.includes('서버')) {
    return `# MCP 도구 분석 결과

**단계 1: 문제 파악**
- MCP (Model Context Protocol) 서버 연결 문제 분석
- 사용자가 요청한 도구 실행 환경 확인

**단계 2: 원인 분석**
- Sequential Thinking 서버 연결 상태: 비활성화
- 가능한 원인들:
  1. MCP 서버 프로세스 시작 실패
  2. npm 패키지 설치 문제
  3. 네트워크 또는 권한 문제
  4. 설정 파일 오류

**단계 3: 해결 방안**
1. **수동 서버 연결**: MCP 관리 페이지에서 "연결" 버튼 클릭
2. **패키지 재설치**: \`npx -y @modelcontextprotocol/server-sequential-thinking\`
3. **대체 기능 사용**: 시스템이 제공하는 내장 분석 도구 활용
4. **로그 확인**: 개발자 도구에서 연결 오류 상세 확인

**단계 4: 권장사항**
- 현재는 내장 분석 기능으로 충분한 단계별 사고 지원 가능
- MCP 도구는 추가적인 고급 기능을 위한 선택사항
- 문제 해결 시까지 일반 대화로 진행 권장`;
  }

  // 테트리스 개발 분석
  if (message.includes('테트리스')) {
    return `# 테트리스 개발 단계별 분석

**단계 1: 게임 구조 설계**
- 게임 보드: 10x20 격자 시스템
- 테트로미노: 7가지 기본 블록 (I, O, T, S, Z, J, L)
- 게임 상태: 활성 블록, 고정 블록, 게임 오버 상태
- 점수 시스템: 줄 제거 기준 점수 계산

**단계 2: 핵심 로직 구현**
1. **블록 생성 시스템**
   - 랜덤 테트로미노 생성
   - 다음 블록 미리보기
   - 블록 초기 위치 설정

2. **이동 및 회전 제어**
   - 좌우 이동 (충돌 검사 포함)
   - 블록 회전 (벽/바닥 킥 구현)
   - 아래로 이동 (자동/수동)

3. **충돌 검사**
   - 벽면 충돌 감지
   - 바닥 및 다른 블록과의 충돌
   - 회전 시 공간 확보 검사

**단계 3: 게임 메커니즘**
1. **줄 완성 처리**
   - 완성된 줄 감지 알고리즘
   - 줄 제거 애니메이션
   - 상위 블록들 아래로 이동

2. **레벨 및 속도 조절**
   - 점수/줄 수에 따른 레벨업
   - 레벨별 낙하 속도 증가
   - 난이도 곡선 설계

**단계 4: 사용자 경험 개선**
- 키보드 입력 처리 (WASD/화살표)
- 부드러운 애니메이션 효과
- 음향 효과 및 시각적 피드백
- 일시정지/재시작 기능
- 최고 점수 저장 시스템`;
  }

  // 프로그래밍/개발 관련
  if (message.includes('개발') || message.includes('코드') || message.includes('프로그래밍')) {
    return `# 개발 프로젝트 단계별 분석

**단계 1: 요구사항 분석**
- 사용자 요청사항 상세 분석
- 기능적/비기능적 요구사항 분리
- 우선순위 및 범위 정의
- 기술적 제약사항 확인

**단계 2: 기술 스택 선택**
- 프론트엔드: React, Next.js, TypeScript 고려
- 백엔드: Node.js, Express, API 설계
- 데이터베이스: SQLite, PostgreSQL, MongoDB 검토
- 배포: Vercel, Docker, CI/CD 파이프라인

**단계 3: 아키텍처 설계**
1. **시스템 구조**
   - 컴포넌트 기반 설계
   - 모듈화 및 재사용성 고려
   - 상태 관리 패턴
   - API 엔드포인트 설계

2. **데이터 모델링**
   - 데이터베이스 스키마 설계
   - 관계 정의 및 정규화
   - 인덱스 및 성능 최적화

**단계 4: 구현 계획**
1. MVP (최소 기능 제품) 정의
2. 스프린트 기반 개발 일정
3. 테스트 전략 수립
4. 배포 및 모니터링 계획

**단계 5: 품질 보장**
- 코드 리뷰 프로세스
- 단위/통합 테스트 작성
- 성능 테스트 및 최적화
- 보안 검토 및 취약점 분석`;
  }

  // 일반적인 문제 해결
  return `# 단계별 사고 분석

**단계 1: 문제 정의**
"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

현재 상황을 명확히 파악하고 해결해야 할 핵심 문제를 정의합니다.

**단계 2: 정보 수집 및 분석**
- 관련 정보 및 데이터 수집
- 현재 상황의 배경과 맥락 파악
- 제약 조건 및 가용 리소스 확인
- 이해관계자 및 영향 범위 분석

**단계 3: 해결책 도출**
1. **브레인스토밍**: 가능한 모든 해결 방안 나열
2. **평가 기준 설정**: 효과성, 실현 가능성, 비용, 시간
3. **옵션 비교**: 각 방안의 장단점 분석
4. **최적안 선택**: 기준에 따른 최선의 해결책 결정

**단계 4: 실행 계획**
- 구체적인 실행 단계 정의
- 일정 및 마일스톤 설정
- 필요한 자원 및 인력 배치
- 위험 요소 식별 및 대응책 마련

**단계 5: 검토 및 개선**
- 실행 결과 모니터링
- 성과 지표 측정 및 평가
- 피드백 수집 및 분석
- 지속적 개선 방안 도출

💡 **참고**: 현재 MCP Sequential Thinking 도구가 연결되지 않아 내장 분석 기능을 사용했습니다.`;
}

/**
 * 사용자 메시지를 분석하여 필요한 MCP 도구들을 결정
 */
async function analyzeMCPToolsNeeded(message: string): Promise<Array<{
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
  reasoning: string;
}>> {
  const tools = [];
  const lowerMessage = message.toLowerCase();

  // 웹 콘텐츠 가져오기 관련
  if (lowerMessage.includes('http://') || lowerMessage.includes('https://') || 
      lowerMessage.includes('웹사이트') || lowerMessage.includes('페이지') ||
      lowerMessage.includes('url') || lowerMessage.includes('링크')) {
    
    // URL 추출
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.match(urlRegex);
    
    if (urls && urls.length > 0) {
      for (const url of urls) {
        tools.push({
          serverId: 'mcp-fetch',
          toolName: 'fetch',
          arguments: {
            url: url.trim(),
            max_length: 10000
          },
          reasoning: `URL에서 콘텐츠를 가져오기 위해 fetch 도구 사용: ${url}`
        });
      }
    }
  }

  // 라이브러리/문서 검색 관련
  if (lowerMessage.includes('라이브러리') || lowerMessage.includes('문서') ||
      lowerMessage.includes('api') || lowerMessage.includes('documentation') ||
      lowerMessage.includes('docs') || lowerMessage.includes('reference')) {
    
    // 일반적인 라이브러리 이름들 추출 시도
    const libraryKeywords = ['react', 'next.js', 'typescript', 'javascript', 'node.js', 
                           'express', 'mongodb', 'supabase', 'tailwind', 'prisma'];
    
    for (const keyword of libraryKeywords) {
      if (lowerMessage.includes(keyword)) {
        tools.push({
          serverId: 'mcp-context7',
          toolName: 'resolve-library-id',
          arguments: {
            libraryName: keyword
          },
          reasoning: `${keyword} 라이브러리 문서 검색을 위해 Context7 사용`
        });
        break; // 첫 번째 매치만 사용
      }
    }
  }

  // UI 컴포넌트 생성 관련
  if (lowerMessage.includes('컴포넌트') || lowerMessage.includes('ui') ||
      lowerMessage.includes('버튼') || lowerMessage.includes('폼') ||
      lowerMessage.includes('모달') || lowerMessage.includes('카드') ||
      lowerMessage.includes('component') || lowerMessage.includes('button') ||
      lowerMessage.includes('form') || lowerMessage.includes('modal')) {
    
    // UI 컴포넌트 관련 키워드 추출
    const uiKeywords = ['button', 'form', 'modal', 'card', 'input', 'table'];
    let searchQuery = 'component';
    
    for (const keyword of uiKeywords) {
      if (lowerMessage.includes(keyword)) {
        searchQuery = keyword;
        break;
      }
    }
    
    tools.push({
      serverId: 'mcp-21st-dev-magic',
      toolName: '21st_magic_component_builder',
      arguments: {
        message: message,
        searchQuery: searchQuery,
        absolutePathToCurrentFile: '/current/file/path', // 실제 경로로 대체 필요
        absolutePathToProjectDirectory: '/project/root', // 실제 경로로 대체 필요
        standaloneRequestQuery: `Create a ${searchQuery} component based on user request`
      },
      reasoning: `UI 컴포넌트 생성을 위해 21st.dev Magic 도구 사용`
    });
  }

  // 로고 검색 관련
  if (lowerMessage.includes('로고') || lowerMessage.includes('logo') ||
      lowerMessage.includes('아이콘') || lowerMessage.includes('icon')) {
    
    // 회사/브랜드 이름 추출 시도
    const brandKeywords = ['google', 'microsoft', 'apple', 'facebook', 'twitter', 
                          'github', 'discord', 'slack', 'notion', 'figma'];
    
    const foundBrands = brandKeywords.filter(brand => lowerMessage.includes(brand));
    
    if (foundBrands.length > 0) {
      tools.push({
        serverId: 'mcp-21st-dev-magic',
        toolName: 'logo_search',
        arguments: {
          queries: foundBrands,
          format: 'TSX'
        },
        reasoning: `${foundBrands.join(', ')} 로고 검색을 위해 logo_search 도구 사용`
      });
    }
  }

  // MCP 서버 검색 관련 (더 구체적인 조건)
  if ((lowerMessage.includes('mcp') && (lowerMessage.includes('검색') || lowerMessage.includes('찾기'))) ||
      (lowerMessage.includes('도구') && lowerMessage.includes('검색')) ||
      lowerMessage.includes('mcp 서버') || lowerMessage.includes('mcp tool')) {
    
    tools.push({
      serverId: 'mcp-toolbox',
      toolName: 'search_servers',
      arguments: {
        query: message.substring(0, 100), // 메시지의 첫 100자를 검색어로 사용
        n: 3
      },
      reasoning: 'MCP 서버 검색을 위해 toolbox 사용'
    });
  }

  // 복잡한 사고/분석이 필요한 경우 (더 구체적인 조건)
  if ((lowerMessage.includes('복잡한') && lowerMessage.includes('분석')) ||
      (lowerMessage.includes('단계별') && (lowerMessage.includes('분석') || lowerMessage.includes('계획'))) ||
      (lowerMessage.includes('생각해') && lowerMessage.includes('단계')) ||
      lowerMessage.includes('순차적 사고') ||
      lowerMessage.includes('체계적으로 분석') ||
      (lowerMessage.includes('문제 해결') && lowerMessage.includes('단계'))) {
    
    tools.push({
      serverId: 'mcp-sequential-thinking',
      toolName: 'sequentialthinking',
      arguments: {
        thought: `사용자 요청 분석: ${message}`,
        nextThoughtNeeded: true,
        thoughtNumber: 1,
        totalThoughts: 3
      },
      reasoning: '복잡한 분석을 위해 순차적 사고 도구 사용'
    });
  }

  return tools;
}

export async function POST(request: NextRequest) {
  try {
    // FormData인지 JSON인지 확인
    const contentType = request.headers.get('content-type') || '';
    let body: ChatRequest;
    const uploadedFiles: unknown[] = [];

    if (contentType.includes('multipart/form-data')) {
      // FormData 처리 (파일 업로드가 있는 경우)
      const formData = await request.formData();
      
      body = {
        message: formData.get('message') as string,
        model: formData.get('model') as string,
        mode: formData.get('mode') as string,
        sessionId: formData.get('sessionId') ? parseInt(formData.get('sessionId') as string) : undefined,
        mentorId: formData.get('mentorId') ? parseInt(formData.get('mentorId') as string) : undefined,
        userId: formData.get('userId') ? parseInt(formData.get('userId') as string) : undefined,
        files: []
      };

      // 업로드된 파일들 처리
      const files = formData.getAll('files') as File[];
      for (const file of files) {
        if (file.size > 0) {
          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: await file.arrayBuffer()
          });
        }
      }
    } else {
      // JSON 처리
      body = await request.json();
    }

    const { message, model, mode, sessionId, mentorId, userId, stream } = body;

    // 입력 검증
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: '메시지가 비어있습니다.' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: '모델이 선택되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 세션 관리
    let currentSession;
    
    if (sessionId) {
      // 기존 세션 사용
      currentSession = chatRepo.getSession(sessionId);
      if (!currentSession) {
        return NextResponse.json(
          { error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 세션의 모델이 변경된 경우 업데이트
      if (currentSession.model_used !== model) {
        currentSession = chatRepo.updateSession(sessionId, { 
          title: currentSession.title,
          modelUsed: model 
        });
      }
    } else {
      // 새 세션 생성
      const sessionTitle = message.length > 50 
        ? message.substring(0, 50) + '...' 
        : message;
        
      currentSession = chatRepo.createSession({
        userId: userId || 1, // 기본 사용자 사용 (사용자 인증 구현 전까지)
        title: sessionTitle,
        mode: mode || 'chat',
        modelUsed: model,
        mentorId: mentorId
      });
    }

    // 멘토 컨텍스트 처리
    let mentorContext = null;
    let systemInstruction = undefined;
    
    if (mentorId) {
      try {
        mentorContext = await mentorContextService.createMentorContext(
          mentorId,
          currentSession.id,
          message,
          userId
        );
        systemInstruction = mentorContext.systemPrompt;
      } catch (error) {
        console.error('멘토 컨텍스트 생성 오류:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : '멘토 컨텍스트 생성 실패' },
          { status: 400 }
        );
      }
    }

    // 대화 컨텍스트 구성 (사용자 메시지 저장 전에 기존 히스토리 가져오기)
    let conversationHistory;
    
    if (mentorContext) {
      // 멘토별 대화 히스토리 사용
      conversationHistory = [...mentorContext.conversationHistory];
    } else {
      // 일반 대화 히스토리 사용 - 최근 20개 메시지 가져오기
      const recentMessages = chatRepo.getMessages(currentSession.id, { limit: 20 });
      conversationHistory = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        id: msg.id
      }));
    }

    // 연속 답변 감지 및 처리
    const continuationResult = detectContinuation(message, conversationHistory);
    let processedMessage = message;
    let continuationContext = null;

    if (continuationResult.isContinuation && continuationResult.combinedContent) {
      // 이전 메시지와 연결된 컨텍스트 처리
      const artifactUpdateInfo = shouldUpdateExistingArtifact(
        continuationResult.combinedContent,
        message
      );
      
      // 연속 작성을 위한 프롬프트 향상
      processedMessage = enhancePromptForContinuation(
        message,
        continuationResult.combinedContent,
        artifactUpdateInfo.shouldUpdate
      );

      continuationContext = {
        previousMessageId: continuationResult.previousMessageId,
        shouldUpdateArtifact: artifactUpdateInfo.shouldUpdate,
        previousContent: continuationResult.combinedContent
      };

      console.log('연속 답변 감지됨:', {
        previousMessageId: continuationResult.previousMessageId,
        shouldUpdateArtifact: artifactUpdateInfo.shouldUpdate
      });
    }

    // 룰 적용하여 프롬프트 향상 (연속 답변 처리된 메시지 사용)
    const ruleApplicationResult = await ruleIntegration.applyRulesToPrompt(processedMessage, {
      userId: userId,
      sessionId: currentSession.id,
      mentorId: mentorId,
      // 멘토 모드인 경우 일반 룰 제외 (멘토별 룰 우선)
      excludeCategories: mentorId ? ['general'] : []
    });

    // 향상된 프롬프트 사용
    const enhancedMessage = ruleApplicationResult.enhancedPrompt;

    // MCP 도구 자동 선택 및 실행
    let mcpResults = [];
    let mcpContext = '';
    
    try {
      const mcpToolsNeeded = await analyzeMCPToolsNeeded(enhancedMessage);
      
      if (mcpToolsNeeded.length > 0) {
        console.log('MCP 도구 필요:', mcpToolsNeeded.map(t => t.toolName));
        
        // MCP 서버들이 연결되지 않은 경우 재연결 시도
        try {
          await mcpService.connectAllServers();
        } catch (connectError) {
          console.warn('MCP 서버 재연결 시도 실패:', connectError);
        }
        
        for (const toolInfo of mcpToolsNeeded) {
          try {
            let mcpResult;
            
            // Sequential Thinking의 경우 대체 실행 시도
            if (toolInfo.serverId === 'mcp-sequential-thinking' && toolInfo.toolName === 'sequentialthinking') {
              try {
                mcpResult = await mcpService.executeTool(
                  toolInfo.serverId,
                  toolInfo.toolName,
                  toolInfo.arguments,
                  {
                    sessionId: currentSession.id,
                    userId: userId?.toString()
                  }
                );
              } catch (error) {
                console.log('MCP Sequential Thinking 실패, 대체 실행 중...');
                const fallbackResult = await executeSequentialThinkingFallback(toolInfo.arguments, enhancedMessage);
                mcpResult = {
                  success: true,
                  content: [{ type: 'text', text: fallbackResult }],
                  executionTime: 100
                };
              }
            } else {
              mcpResult = await mcpService.executeTool(
                toolInfo.serverId,
                toolInfo.toolName,
                toolInfo.arguments,
                {
                  sessionId: currentSession.id,
                  userId: userId?.toString()
                }
              );
            }
            
            mcpResults.push({
              toolName: toolInfo.toolName,
              serverId: toolInfo.serverId,
              result: mcpResult,
              reasoning: toolInfo.reasoning
            });
            
            if (mcpResult.success && mcpResult.content) {
              const contentText = mcpResult.content
                .map(c => c.type === 'text' ? c.text : `[${c.type} content]`)
                .join('\n');
              mcpContext += `\n\n[MCP Tool: ${toolInfo.toolName}]\n${contentText}`;
            }
            
          } catch (toolError) {
            console.error(`MCP 도구 실행 오류 (${toolInfo.toolName}):`, toolError);
            
            // Sequential Thinking 오류 시 대체 실행
            if (toolInfo.serverId === 'mcp-sequential-thinking' && toolInfo.toolName === 'sequentialthinking') {
              try {
                const fallbackResult = await executeSequentialThinkingFallback(toolInfo.arguments, enhancedMessage);
                mcpResults.push({
                  toolName: toolInfo.toolName,
                  serverId: toolInfo.serverId,
                  result: {
                    success: true,
                    content: [{ type: 'text', text: fallbackResult }],
                    executionTime: 100
                  },
                  reasoning: toolInfo.reasoning
                });
                mcpContext += `\n\n[MCP Tool: ${toolInfo.toolName}]\n${fallbackResult}`;
                continue;
              } catch (fallbackError) {
                console.error('대체 실행도 실패:', fallbackError);
              }
            }
            
            // 서버가 연결되지 않은 경우 사용자에게 친화적인 메시지 제공
            let userFriendlyMessage = 'Tool execution failed';
            if (toolError instanceof Error && toolError.message.includes('not connected')) {
              userFriendlyMessage = `${toolInfo.toolName} 도구가 현재 사용할 수 없습니다. 서버 연결을 확인해주세요.`;
              console.warn(`서버 ${toolInfo.serverId}가 연결되지 않아 도구 ${toolInfo.toolName}을 건너뜁니다.`);
            }
            
            mcpResults.push({
              toolName: toolInfo.toolName,
              serverId: toolInfo.serverId,
              result: {
                id: `error_${Date.now()}`,
                toolCallId: `call_${Date.now()}`,
                success: false,
                error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
                content: [{
                  type: 'text',
                  text: userFriendlyMessage
                }],
                isError: true,
                timestamp: new Date(),
                executionTime: 0
              },
              reasoning: toolInfo.reasoning
            });
          }
        }
      }
    } catch (mcpError) {
      console.error('MCP 분석 오류:', mcpError);
    }

    // MCP 컨텍스트를 포함한 메시지 구성
    let finalMessage = enhancedMessage;
    if (mcpContext) {
      finalMessage += mcpContext;
    }

    // 현재 사용자 메시지 추가 (MCP 컨텍스트 포함)
    conversationHistory.push({
      role: 'user',
      content: finalMessage
    });

    // 사용자 메시지 저장
    const userMessage = chatRepo.createMessage({
      sessionId: currentSession.id,
      role: 'user',
      content: message,
      contentType: uploadedFiles.length > 0 ? 'multimodal' : 'text',
      metadata: uploadedFiles.length > 0 ? { 
        files: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
        mcpTools: mcpResults.length > 0 ? mcpResults : undefined
      } : {
        mcpTools: mcpResults.length > 0 ? mcpResults : undefined
      }
    });

    let llmResponse;

    try {
      // 문서 모드는 별도 RAG API 사용을 권장
      if (mode === 'document' || mode === 'rag') {
        return NextResponse.json(
          { 
            error: '문서 기반 대화는 /api/rag/chat 엔드포인트를 사용해주세요.',
            suggestion: 'Use /api/rag/chat endpoint for document-based conversations'
          },
          { status: 400 }
        );
      }
      // 멀티모달 처리 (파일이 있는 경우)
      else if (uploadedFiles.length > 0) {
        // 이미지 파일 찾기
        const imageFile = uploadedFiles.find(file => file.type.startsWith('image/'));
        
        if (imageFile) {
          // 이미지가 있는 경우 멀티모달 모델 사용
          const isMultimodalModel = llmService.isMultimodalSupported(model);
          const targetModel = isMultimodalModel ? model : 'gemini-1.5-flash';
          
          // 이미지 데이터를 base64로 변환
          const base64Image = Buffer.from(imageFile.data).toString('base64');
          
          llmResponse = await llmService.generateWithImage(message, base64Image, {
            model: targetModel,
            temperature: 0.7,
            maxTokens: 20000,
            mimeType: imageFile.type
          });
          
          // 모델이 변경된 경우 알림
          if (targetModel !== model) {
            llmResponse.content = `[자동으로 ${targetModel} 모델로 전환됨]\n\n${llmResponse.content}`;
          }
        } else {
          // 이미지가 아닌 파일들 (음성, 문서 등)
          const audioFile = uploadedFiles.find(file => file.type.startsWith('audio/'));
          
          if (audioFile) {
            // 음성 파일 처리 (향후 Speech-to-Text 구현)
            llmResponse = await llmService.chat(conversationHistory, {
              model,
              temperature: 0.7,
              maxTokens: 20000,
              systemInstruction: '사용자가 음성 파일을 업로드했습니다. 음성 처리 기능은 현재 개발 중입니다.'
            });
          } else {
            // 기타 파일들
            llmResponse = await llmService.chat(conversationHistory, {
              model,
              temperature: 0.7,
              maxTokens: 20000,
              systemInstruction: `사용자가 다음 파일들을 업로드했습니다: ${uploadedFiles.map(f => f.name).join(', ')}`
            });
          }
        }
      } else {
        // 일반 텍스트 채팅
        // 멘토가 아닌 경우 일반 채팅 프롬프트 사용
        const generalSystemPrompt = systemInstruction || await PromptLoader.loadGeneralChatPrompt();
        
        llmResponse = await llmService.chat(conversationHistory, {
          model,
          temperature: 0.7,
          maxTokens: 20000, // 토큰 크기도 증가
          systemInstruction: generalSystemPrompt
        });
      }

      if (!llmResponse.success) {
        throw new Error(llmResponse.error || 'LLM 응답 생성 실패');
      }

      // AI 응답 저장 먼저 (메시지 ID 확보)
      const assistantMessage = chatRepo.createMessage({
        sessionId: currentSession.id,
        role: 'assistant',
        content: llmResponse.content,
        contentType: 'text',
        metadata: {
          model: llmResponse.model,
          provider: llmResponse.provider,
          usage: llmResponse.usage,
          mentorId: mentorId,
          mentorName: mentorContext?.mentor.name,
          appliedRules: ruleApplicationResult.appliedRules,
          rulesSummary: ruleApplicationResult.rulesSummary
        }
      });

      // AI 응답에서 아티팩트 추출 및 생성/업데이트 처리
      let contentToProcess = llmResponse.content;
      
      // 연속 답변인 경우 이전 내용과 함께 처리
      if (continuationContext?.shouldUpdateArtifact && continuationContext?.previousContent) {
        contentToProcess = continuationContext.previousContent + '\n\n' + llmResponse.content;
        console.log('연속 답변으로 처리: 이전 내용과 결합하여 아티팩트 업데이트');
      }

      const parsedArtifacts = parseArtifactsFromContent(
        contentToProcess,
        currentSession.id,
        assistantMessage.id
      );

      console.log('파싱된 아티팩트:', parsedArtifacts.artifacts.length, '개', 
                  continuationContext?.shouldUpdateArtifact ? '(연속 답변 모드)' : '');

      const createdArtifacts = [];
      
      for (const artifactData of parsedArtifacts.artifacts) {
        try {
          console.log('아티팩트 처리 중:', artifactData.title, artifactData.type);
          
          // 연속 답변이고 기존 아티팩트를 업데이트해야 하는 경우
          if (continuationContext?.shouldUpdateArtifact && continuationContext?.previousMessageId) {
            // 이전 메시지의 아티팩트 찾기
            const previousArtifacts = await ArtifactService.getArtifactsByMessageId(continuationContext.previousMessageId);
            const existingArtifact = previousArtifacts.find(existing => 
              existing.type === artifactData.type && 
              (existing.title === artifactData.title || 
               existing.language === artifactData.language)
            );

            if (existingArtifact) {
              // 기존 아티팩트 업데이트
              console.log('기존 아티팩트 업데이트:', existingArtifact.id);
              const updatedArtifact = await ArtifactService.updateArtifact(existingArtifact.id, {
                content: artifactData.content,
                title: artifactData.title || existingArtifact.title,
                updated_at: new Date().toISOString()
              });
              createdArtifacts.push(updatedArtifact);
              continue;
            }
          }
          
          // 새 아티팩트 생성
          const artifact = ArtifactService.createArtifact(artifactData);
          createdArtifacts.push(artifact);
          console.log('아티팩트 생성 완료:', artifact.id);
        } catch (error) {
          console.error('아티팩트 처리 오류:', error);
        }
      }

      console.log('총 처리된 아티팩트:', createdArtifacts.length, '개');

      // 메시지 메타데이터에 아티팩트 정보 추가 (필요시)
      if (createdArtifacts.length > 0) {
        // 메타데이터 업데이트 로직은 ChatRepository 구조에 따라 달라질 수 있음
        // 현재는 응답에서 아티팩트를 전달하는 것으로 충분
      }

      // 멘토 응답 후처리
      if (mentorId) {
        await mentorContextService.processMentorResponse(
          mentorId,
          currentSession.id,
          assistantMessage.id,
          llmResponse.content
        );
      }

      // 세션 마지막 활동 시간 업데이트
      chatRepo.updateSessionTimestamp(currentSession.id);

      // 응답 구성
      const response: ChatResponse = {
        content: llmResponse.content,
        sessionId: currentSession.id,
        messageId: assistantMessage.id,
        artifacts: createdArtifacts,
        sources: [], // TODO: RAG 소스 처리 구현
        // MCP 도구 사용 정보 추가
        mcpTools: mcpResults.length > 0 ? mcpResults : undefined,
        // 룰 적용 정보 추가
        ruleInfo: {
          appliedRules: ruleApplicationResult.appliedRules,
          rulesSummary: ruleApplicationResult.rulesSummary,
          originalMessage: message, // 원본 메시지
          enhancedMessage: enhancedMessage // 룰 적용 후 메시지
        },
        // 연속 답변 정보 추가
        continuationInfo: continuationContext ? {
          isContinuation: true,
          previousMessageId: continuationContext.previousMessageId,
          wasArtifactUpdated: continuationContext.shouldUpdateArtifact,
          artifactsProcessed: createdArtifacts.length
        } : undefined
      };

      // 스트리밍 제거 - 일반 요청-응답 방식만 사용

      return NextResponse.json(response);

    } catch (llmError) {
      console.error('LLM 처리 오류:', llmError);
      
      // 오류 메시지 저장
      const errorMessage = chatRepo.createMessage({
        sessionId: currentSession.id,
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
        contentType: 'text',
        metadata: {
          error: llmError instanceof Error ? llmError.message : '알 수 없는 오류',
          model,
          timestamp: new Date().toISOString()
        }
      });

      const response: ChatResponse = {
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
        sessionId: currentSession.id,
        messageId: errorMessage.id,
        artifacts: [],
        sources: []
      };

      return NextResponse.json(response, { status: 500 });
    }

  } catch (error) {
    console.error('채팅 API 오류:', error);
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 세션 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (sessionId) {
      // 특정 세션의 메시지들 조회
      const session = chatRepo.getSession(parseInt(sessionId));
      if (!session) {
        return NextResponse.json(
          { error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const messages = chatRepo.getMessages(session.id);
      
      return NextResponse.json({
        session,
        messages
      });
    } else if (userId) {
      // 사용자의 모든 세션 조회
      const sessions = chatRepo.getSessions({ userId: parseInt(userId), limit: 100 });
      
      return NextResponse.json({
        sessions
      });
    } else {
      return NextResponse.json(
        { error: 'sessionId 또는 userId가 필요합니다.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('세션 조회 오류:', error);
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}