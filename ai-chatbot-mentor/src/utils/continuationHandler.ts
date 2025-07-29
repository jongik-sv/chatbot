// utils/continuationHandler.ts
import { Message } from '../types';

export interface ContinuationResult {
  isContinuation: boolean;
  combinedContent?: string;
  previousMessageId?: number;
  cleanedMessage: string;
}

/**
 * "계속" 키워드를 감지하고 이전 메시지와 연결 처리
 */
export function detectContinuation(
  message: string,
  conversationHistory: Array<{ role: string; content: string; id?: number }>
): ContinuationResult {
  const cleanedMessage = message.trim();
  
  // 계속 키워드 패턴들
  const continuationPatterns = [
    /^계속$/i,
    /^continue$/i,
    /^계속해$/i,
    /^계속해줘$/i,
    /^계속 해줘$/i,
    /^이어서$/i,
    /^이어서 해줘$/i,
    /^계속 작성$/i,
    /^계속 작성해$/i,
    /^더 써줘$/i,
    /^더 작성해$/i
  ];

  const isContinuation = continuationPatterns.some(pattern => 
    pattern.test(cleanedMessage)
  );

  if (!isContinuation) {
    return {
      isContinuation: false,
      cleanedMessage
    };
  }

  // 이전 assistant 메시지 찾기 (가장 최근)
  const previousAssistantMessage = [...conversationHistory]
    .reverse()
    .find(msg => msg.role === 'assistant');

  if (!previousAssistantMessage) {
    return {
      isContinuation: false,
      cleanedMessage
    };
  }

  // 이전 메시지와 현재 요청을 연결
  const combinedContent = previousAssistantMessage.content + '\n\n[계속 작성 요청]';

  return {
    isContinuation: true,
    combinedContent,
    previousMessageId: previousAssistantMessage.id,
    cleanedMessage: cleanedMessage // 원본 "계속" 메시지 유지
  };
}

/**
 * 연결된 콘텐츠에서 기존 아티팩트를 식별하고 업데이트할지 결정
 */
export function shouldUpdateExistingArtifact(
  previousContent: string,
  newContent: string
): { shouldUpdate: boolean; extractionHint?: string } {
  // 이전 콘텐츠에 코드 블록이나 아티팩트가 있었는지 확인
  const hasCodeBlock = /```[\s\S]*?```/g.test(previousContent);
  const hasArtifact = /```(html|javascript|typescript|python|css|java|cpp|c\+\+)/gi.test(previousContent);
  
  if (hasCodeBlock || hasArtifact) {
    return {
      shouldUpdate: true,
      extractionHint: '이전 아티팩트의 연속으로 처리하여 기존 아티팩트를 업데이트하거나 확장해주세요.'
    };
  }

  return { shouldUpdate: false };
}

/**
 * 프롬프트에 연속 작성 컨텍스트 추가
 */
export function enhancePromptForContinuation(
  originalPrompt: string,
  previousContent: string,
  shouldUpdateArtifact: boolean
): string {
  let enhancedPrompt = originalPrompt;

  if (shouldUpdateArtifact) {
    enhancedPrompt += `\n\n[시스템 지시사항] 
이전 답변의 연속입니다. 이전에 생성된 코드나 아티팩트가 있다면:
1. 기존 아티팩트를 확장하거나 완성해주세요
2. 새로운 아티팩트보다는 기존 것을 업데이트하는 것을 우선하세요
3. 코드가 완전해지도록 빠진 부분을 채워주세요
4. 동일한 제목과 유형으로 아티팩트를 생성하여 기존 것을 대체하세요

이전 내용: 
${previousContent.slice(-1000)} ...`; // 마지막 1000자만 포함
  } else {
    enhancedPrompt += `\n\n[시스템 지시사항] 
이전 답변의 연속입니다. 자연스럽게 이어서 작성해주세요.`;
  }

  return enhancedPrompt;
}