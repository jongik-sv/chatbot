// scripts/test-page-chunking.js
const path = require('path');

// 페이지 청킹 로직을 간소화하여 테스트
function chunkDocumentByPage(text) {
  const chunks = [];
  
  // 페이지 구분자들을 찾아서 분할
  const pagePatterns = [
    /페이지\s*\d+/gi,                // "페이지 1", "페이지1" 등
    /Page\s+\d+/gi,                  // "Page 1" 등
  ];
  
  let pages = [];
  let remainingText = text;
  
  // 각 패턴으로 페이지 분할 시도
  for (const pattern of pagePatterns) {
    if (pattern.test(remainingText)) {
      pages = remainingText.split(pattern);
      console.log(`페이지 패턴 발견: ${pattern}, ${pages.length}개 페이지로 분할`);
      break;
    }
  }
  
  // 패턴이 없으면 대략적인 페이지 크기로 분할
  if (pages.length <= 1) {
    const averagePageSize = 3500;
    const textLength = text.length;
    const estimatedPages = Math.ceil(textLength / averagePageSize);
    
    console.log(`페이지 구분자가 없어서 추정 분할: ${estimatedPages}개 페이지`);
    
    pages = [];
    for (let i = 0; i < estimatedPages; i++) {
      const start = i * averagePageSize;
      const end = Math.min((i + 1) * averagePageSize, textLength);
      let pageText = text.slice(start, end);
      
      // 문장이 중간에 잘리지 않도록 조정
      if (end < textLength && !pageText.match(/[.!?]\s*$/)) {
        const nextSentenceEnd = text.slice(end).search(/[.!?]\s/);
        if (nextSentenceEnd > 0 && nextSentenceEnd < 200) {
          pageText += text.slice(end, end + nextSentenceEnd + 1);
        }
      }
      
      pages.push(pageText);
    }
  }
  
  // 각 페이지를 청크로 변환
  pages.forEach((page, index) => {
    const cleanPage = page.trim();
    if (cleanPage.length > 0) {
      chunks.push({
        text: cleanPage,
        index: index,
        metadata: {
          chunkType: 'page',
          pageNumber: index + 1,
          totalPages: pages.length,
          characterCount: cleanPage.length,
          wordCount: cleanPage.split(/\s+/).length
        }
      });
    }
  });
  
  console.log(`총 ${chunks.length}개의 페이지 청크 생성 완료`);
  return chunks;
}

function chunkDocumentByCharacter(text, chunkSize = 500) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    
    if (testChunk.length <= chunkSize) {
      currentChunk = testChunk;
    } else {
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          metadata: {
            chunkType: 'character',
            characterCount: currentChunk.trim().length
          }
        });
      }
      currentChunk = sentence;
    }
  }
  
  // 마지막 청크 추가
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        chunkType: 'character',
        characterCount: currentChunk.trim().length
      }
    });
  }
  
  return chunks;
}

// 테스트용 샘플 문서 (PDF에서 추출된 것과 유사한 형태)
const sampleDocument = `
AI 기술 개발 현황과 전망

1. 서론
인공지능(AI) 기술은 현재 가장 주목받는 기술 분야 중 하나로, 다양한 산업 분야에서 혁신을 이끌고 있습니다. 본 보고서에서는 AI 기술의 현재 개발 현황과 향후 전망에 대해 살펴보겠습니다.

페이지 1

2. AI 기술의 주요 분야
2.1 머신러닝(Machine Learning)
머신러닝은 데이터를 통해 학습하고 예측하는 AI의 한 분야입니다. 지도학습, 비지도학습, 강화학습 등의 방법론이 있으며, 각각 다른 문제 해결에 특화되어 있습니다.

2.2 자연어처리(Natural Language Processing)
자연어처리는 인간의 언어를 컴퓨터가 이해하고 처리할 수 있도록 하는 기술입니다. 최근 대화형 AI와 텍스트 생성 모델의 발전이 두드러집니다.

페이지 2

3. 산업별 AI 적용 현황
3.1 의료 분야
의료 영상 분석, 진단 보조, 신약 개발 등에서 AI가 활용되고 있습니다. 특히 영상 진단에서는 인간 전문가 수준의 정확도를 보이고 있습니다.

3.2 금융 분야
사기 탐지, 신용 평가, 알고리즘 트레이딩 등에서 AI 기술이 널리 사용되고 있습니다. 리스크 관리와 고객 서비스 개선에도 기여하고 있습니다.

페이지 3

4. 향후 전망
AI 기술은 계속해서 발전할 것으로 예상되며, 특히 다음과 같은 분야에서 큰 발전이 기대됩니다:
- 범용 인공지능(AGI) 개발
- AI 윤리 및 안전성 확보
- 에너지 효율적인 AI 모델 개발
- 인간-AI 협업 시스템 구축

페이지 4

5. 결론
AI 기술은 이미 우리 생활과 산업 전반에 깊숙이 스며들어 있으며, 앞으로도 계속해서 혁신을 이끌어 갈 것입니다. 다만, 기술 발전과 함께 윤리적, 사회적 고려사항도 함께 논의되어야 할 것입니다.

페이지 5
`;

function testPageChunking() {
  try {
    console.log('=== 페이지 청킹 테스트 시작 ===\n');
    
    // 1. 기존 문자 기반 청킹 테스트
    console.log('1. 문자 기반 청킹 (500자):');
    const characterChunks = chunkDocumentByCharacter(sampleDocument, 500);
    console.log(`청크 수: ${characterChunks.length}`);
    characterChunks.forEach((chunk, index) => {
      console.log(`청크 ${index + 1}: ${chunk.metadata.characterCount}자 - "${chunk.text.substring(0, 50)}..."`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. 새로운 페이지 기반 청킹 테스트
    console.log('2. 페이지 기반 청킹:');
    const pageChunks = chunkDocumentByPage(sampleDocument);
    console.log(`청크 수: ${pageChunks.length}`);
    pageChunks.forEach((chunk, index) => {
      console.log(`페이지 ${chunk.metadata.pageNumber}: ${chunk.metadata.characterCount}자, ${chunk.metadata.wordCount}단어`);
      console.log(`내용 미리보기: "${chunk.text.substring(0, 100)}..."`);
      console.log('---');
    });
    
    console.log('\n=== 테스트 완료 ===');
    
  } catch (error) {
    console.error('테스트 실행 오류:', error);
  }
}

// 실행
testPageChunking();