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
import { SequentialThinkingService } from '../../../services/SequentialThinkingService';
import { readFile } from 'fs/promises';
import path from 'path';

// 스트리밍 함수 제거 - 일반 요청-응답만 사용

const chatRepo = new ChatRepository();
const llmService = new LLMService();
const mentorContextService = new MentorContextService();
const ruleIntegration = new RuleIntegration();
const sequentialThinkingService = new SequentialThinkingService();

/**
 * Sequential Thinking 대체 실행 (MCP 서버 연결 실패 시)
 */
async function executeSequentialThinkingFallback(args: Record<string, any>, message: string, model: string = 'gemini-2.0-flash-exp'): Promise<string> {
  try {
    console.log('Sequential Thinking 대체 실행 시작:', message.substring(0, 100));
    
    // 새로운 SequentialThinkingService 사용
    const result = await sequentialThinkingService.executeThinking(message, 5, model);
    
    // 결과를 마크다운 형태로 포맷팅
    const formattedResult = sequentialThinkingService.formatThinkingProcess(result);
    
    console.log(`Sequential Thinking 완료: ${result.totalSteps}단계, ${result.processingTime}ms`);
    
    return formattedResult;
    
  } catch (error) {
    console.error('Sequential Thinking 대체 실행 오류:', error);
    
    // 오류 시 기본 분석 제공
    return `# ⚠️ 단계별 사고 과정 실행 중 오류 발생

요청하신 내용에 대한 기본 분석을 제공합니다:

## 📝 요청 분석
"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"

## 🔍 기본 접근 방법

**1단계: 문제 파악**
- 사용자 요청의 핵심 내용 분석
- 해결해야 할 주요 과제 식별

**2단계: 정보 정리**
- 관련 정보 및 배경 지식 수집
- 제약 조건 및 요구사항 정리

**3단계: 해결 방안 도출**
- 가능한 접근 방법들 검토
- 최적의 해결책 선택

**4단계: 실행 계획**
- 구체적인 실행 단계 정의
- 필요한 리소스 및 도구 확인

## 💡 권장사항
더 정확한 단계별 분석을 위해서는 MCP Sequential Thinking 서버 연결을 확인하거나, 구체적인 질문으로 다시 요청해주세요.

---
*오류로 인해 기본 분석만 제공되었습니다. 시스템 관리자에게 문의하세요.*`;
  }
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
          serverId: 'fetch',
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
          serverId: 'Context7',
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
      serverId: '@21st-dev/magic',
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
        serverId: '@21st-dev/magic',
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
      serverId: 'pyhub.mcptools',
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
      serverId: 'sequential-thinking',
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
            if (toolInfo.serverId === 'sequential-thinking' && toolInfo.toolName === 'sequentialthinking') {
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
                const fallbackResult = await executeSequentialThinkingFallback(toolInfo.arguments, enhancedMessage, model);
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
            if (toolInfo.serverId === 'sequential-thinking' && toolInfo.toolName === 'sequentialthinking') {
              try {
                const fallbackResult = await executeSequentialThinkingFallback(toolInfo.arguments, enhancedMessage, model);
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