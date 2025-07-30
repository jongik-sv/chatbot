// lib/text-chunking.ts
// 토큰 기반 텍스트 청킹 유틸리티

/**
 * 토큰 수 추정 함수 (대략적인 계산)
 * - 한국어: 평균 1.5자 = 1 토큰
 * - 영어: 평균 4자 = 1 토큰
 * - 공백과 구두점: 별도 계산
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // 한국어 문자 (완성된 한글)
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  
  // 영어 및 기타 라틴 문자
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // 숫자
  const numbers = (text.match(/[0-9]/g) || []).length;
  
  // 공백
  const spaces = (text.match(/\s/g) || []).length;
  
  // 구두점 및 특수문자
  const punctuation = text.length - koreanChars - englishChars - numbers - spaces;
  
  // 토큰 수 계산
  const koreanTokens = Math.ceil(koreanChars / 1.5);  // 한국어: 1.5자 = 1토큰
  const englishTokens = Math.ceil(englishChars / 4);   // 영어: 4자 = 1토큰
  const numberTokens = Math.ceil(numbers / 3);         // 숫자: 3자 = 1토큰
  const punctuationTokens = Math.ceil(punctuation * 0.5); // 특수문자: 0.5토큰
  
  return koreanTokens + englishTokens + numberTokens + punctuationTokens + Math.ceil(spaces * 0.25);
}

/**
 * 텍스트를 토큰 기반으로 청크 분할
 */
export interface ChunkOptions {
  maxTokens: number;
  overlapTokens?: number;
  preserveSentences?: boolean;
}

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  chunkIndex: number;
}

export function chunkTextByTokens(text: string, options: ChunkOptions): TextChunk[] {
  const { maxTokens = 500, overlapTokens = 50, preserveSentences = true } = options;
  
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const chunks: TextChunk[] = [];
  
  if (preserveSentences) {
    // 문장 단위로 분할
    const sentences = splitIntoSentences(text);
    let currentChunk = '';
    let currentTokens = 0;
    let startIndex = 0;
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = estimateTokenCount(sentence);
      
      // 현재 문장을 추가했을 때 토큰 수가 초과하는지 확인
      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        // 현재 청크 저장
        const chunkEndIndex = startIndex + currentChunk.length;
        chunks.push({
          text: currentChunk.trim(),
          startIndex,
          endIndex: chunkEndIndex,
          tokenCount: currentTokens,
          chunkIndex: chunkIndex++
        });
        
        // 오버랩 처리
        if (overlapTokens > 0 && chunks.length > 0) {
          const overlapText = getOverlapText(currentChunk, overlapTokens);
          currentChunk = overlapText + ' ' + sentence;
          currentTokens = estimateTokenCount(currentChunk);
          startIndex = chunkEndIndex - overlapText.length;
        } else {
          currentChunk = sentence;
          currentTokens = sentenceTokens;
          startIndex = chunkEndIndex;
        }
      } else {
        // 현재 청크에 문장 추가
        if (currentChunk.length > 0) {
          currentChunk += ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
        currentTokens = estimateTokenCount(currentChunk);
      }
    }
    
    // 마지막 청크 추가
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
        tokenCount: currentTokens,
        chunkIndex: chunkIndex
      });
    }
    
  } else {
    // 단순 문자 기반 분할 (토큰 수 기준)
    let currentIndex = 0;
    let chunkIndex = 0;
    
    while (currentIndex < text.length) {
      let chunkEnd = currentIndex;
      let chunkTokens = 0;
      
      // maxTokens에 도달할 때까지 문자 추가
      while (chunkEnd < text.length && chunkTokens < maxTokens) {
        chunkEnd++;
        chunkTokens = estimateTokenCount(text.slice(currentIndex, chunkEnd));
      }
      
      // 단어나 문장이 잘리지 않도록 조정
      if (chunkEnd < text.length) {
        const lastSpace = text.lastIndexOf(' ', chunkEnd);
        const lastSentenceEnd = text.lastIndexOf('.', chunkEnd);
        const lastQuestionEnd = text.lastIndexOf('?', chunkEnd);
        const lastExclamationEnd = text.lastIndexOf('!', chunkEnd);
        
        const bestEnd = Math.max(lastSpace, lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
        if (bestEnd > currentIndex) {
          chunkEnd = bestEnd + 1;
        }
      }
      
      const chunkText = text.slice(currentIndex, chunkEnd).trim();
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          startIndex: currentIndex,
          endIndex: chunkEnd,
          tokenCount: estimateTokenCount(chunkText),
          chunkIndex: chunkIndex++
        });
      }
      
      // 오버랩 계산
      if (overlapTokens > 0 && chunks.length > 1) {
        const overlapChars = Math.min(
          Math.floor(overlapTokens * 2), // 대략적인 문자 수 변환
          Math.floor(chunkText.length * 0.2) // 최대 20% 오버랩
        );
        currentIndex = Math.max(currentIndex, chunkEnd - overlapChars);
      } else {
        currentIndex = chunkEnd;
      }
    }
  }
  
  console.log(`텍스트 청킹 완료: ${chunks.length}개 청크, 평균 ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunks.length)}토큰`);
  
  return chunks;
}

/**
 * 문장 단위로 텍스트 분할
 */
function splitIntoSentences(text: string): string[] {
  return text
    // 한국어와 영어 문장 끝 패턴
    .split(/[.!?。！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * 오버랩을 위한 텍스트 추출 (토큰 기준)
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(' ');
  let overlapText = '';
  let tokens = 0;
  
  // 뒤에서부터 단어를 추가하면서 토큰 수 확인
  for (let i = words.length - 1; i >= 0 && tokens < overlapTokens; i--) {
    const word = words[i];
    const testText = word + (overlapText ? ' ' + overlapText : '');
    const testTokens = estimateTokenCount(testText);
    
    if (testTokens <= overlapTokens) {
      overlapText = testText;
      tokens = testTokens;
    } else {
      break;
    }
  }
  
  return overlapText;
}

/**
 * 청크 메타데이터 생성
 */
export function generateChunkMetadata(chunk: TextChunk, totalChunks: number, sourceInfo?: any) {
  return {
    chunkIndex: chunk.chunkIndex,
    totalChunks,
    tokenCount: chunk.tokenCount,
    startIndex: chunk.startIndex,
    endIndex: chunk.endIndex,
    length: chunk.text.length,
    estimatedReadingTime: Math.ceil(chunk.tokenCount / 200), // 분당 200토큰 가정
    ...sourceInfo
  };
}