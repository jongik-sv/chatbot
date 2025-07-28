import { CreateArtifactData } from '@/services/ArtifactService';

export interface CodeBlock {
  language: string;
  content: string;
  title?: string;
}

export interface ParsedArtifacts {
  artifacts: CreateArtifactData[];
  cleanedContent: string;
}

/**
 * AI 응답에서 마크다운 코드 블록을 감지하고 아티팩트로 변환
 */
export function parseArtifactsFromContent(
  content: string,
  sessionId: number,
  messageId?: number
): ParsedArtifacts {
  const artifacts: CreateArtifactData[] = [];
  let cleanedContent = content;

  // 마크다운 코드 블록 정규식 (```language 형태)
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const codeBlocks: CodeBlock[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const codeContent = match[2].trim();
    
    if (codeContent) {
      codeBlocks.push({
        language: language.toLowerCase(),
        content: codeContent
      });
    }
  }

  // 코드 블록을 아티팩트로 변환
  codeBlocks.forEach((block, index) => {
    const artifactType = determineArtifactType(block.language, block.content);
    
    if (artifactType) {
      const title = generateArtifactTitle(block.language, block.content, index);
      
      artifacts.push({
        sessionId,
        messageId,
        type: artifactType,
        title,
        content: block.content,
        language: block.language
      });
    }
  });

  return {
    artifacts,
    cleanedContent
  };
}

/**
 * 언어와 내용을 기반으로 아티팩트 타입 결정
 */
function determineArtifactType(
  language: string, 
  content: string
): 'code' | 'document' | 'chart' | 'mermaid' | null {
  const lang = language.toLowerCase();
  
  // Mermaid 다이어그램 확인
  if (lang === 'mermaid' || isMermaidContent(content)) {
    return 'mermaid';
  }
  
  // 차트 데이터 확인 (JSON 형태의 Chart.js 데이터)
  if (lang === 'json' && isChartData(content)) {
    return 'chart';
  }
  
  // 마크다운 문서 확인
  if (lang === 'markdown' || lang === 'md') {
    return 'document';
  }
  
  // 실행 가능한 코드 확인
  const executableLanguages = [
    'javascript', 'js', 'typescript', 'ts',
    'jsx', 'tsx', 'html', 'css', 'python',
    'java', 'cpp', 'c', 'go', 'rust', 'php'
  ];
  
  if (executableLanguages.includes(lang)) {
    return 'code';
  }
  
  // 기타 코드 블록
  if (lang && lang !== 'text' && lang !== 'plain') {
    return 'code';
  }
  
  return null;
}

/**
 * Mermaid 다이어그램 내용인지 확인
 */
function isMermaidContent(content: string): boolean {
  const trimmedContent = content.trim().toLowerCase();
  const mermaidKeywords = [
    'graph', 'flowchart', 'sequencediagram', 'classDiagram',
    'statediagram', 'erdiagram', 'gantt', 'pie', 'journey',
    'gitgraph', 'mindmap', 'timeline'
  ];
  
  return mermaidKeywords.some(keyword => 
    trimmedContent.startsWith(keyword.toLowerCase())
  );
}

/**
 * Chart.js 데이터인지 확인
 */
function isChartData(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return (
      typeof parsed === 'object' &&
      parsed.type &&
      parsed.data &&
      (parsed.data.labels || parsed.data.datasets)
    );
  } catch {
    return false;
  }
}

/**
 * 아티팩트 제목 생성
 */
function generateArtifactTitle(
  language: string,
  content: string,
  index: number
): string {
  const lang = language.toLowerCase();
  
  // HTML에서 title 태그 추출
  if (lang === 'html') {
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1].trim()) {
      return titleMatch[1].trim();
    }
  }
  
  // JavaScript/TypeScript에서 함수명 추출
  if (['javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx'].includes(lang)) {
    const functionMatch = content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|export\s+(?:function\s+)?(\w+))/);
    if (functionMatch) {
      const funcName = functionMatch[1] || functionMatch[2] || functionMatch[3];
      if (funcName) {
        return `${funcName} 함수`;
      }
    }
    
    // React 컴포넌트 확인
    const componentMatch = content.match(/(?:export\s+)?(?:function\s+|const\s+)(\w+)(?:\s*=|\s*\()/);
    if (componentMatch && /^[A-Z]/.test(componentMatch[1])) {
      return `${componentMatch[1]} 컴포넌트`;
    }
  }
  
  // Mermaid 다이어그램 타입별 제목
  if (lang === 'mermaid' || isMermaidContent(content)) {
    const firstLine = content.trim().split('\n')[0].toLowerCase();
    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
      return '플로우차트 다이어그램';
    } else if (firstLine.startsWith('sequencediagram')) {
      return '시퀀스 다이어그램';
    } else if (firstLine.startsWith('classdiagram')) {
      return '클래스 다이어그램';
    } else if (firstLine.startsWith('gantt')) {
      return '간트 차트';
    } else if (firstLine.startsWith('pie')) {
      return '파이 차트';
    }
    return 'Mermaid 다이어그램';
  }
  
  // Chart.js 데이터 타입별 제목
  if (lang === 'json' && isChartData(content)) {
    try {
      const parsed = JSON.parse(content);
      const chartType = parsed.type;
      return `${chartType} 차트`;
    } catch {
      return '차트 데이터';
    }
  }
  
  // 언어별 기본 제목
  const languageTitles: Record<string, string> = {
    html: 'HTML 문서',
    css: 'CSS 스타일',
    javascript: 'JavaScript 코드',
    js: 'JavaScript 코드',
    typescript: 'TypeScript 코드',
    ts: 'TypeScript 코드',
    jsx: 'React JSX 컴포넌트',
    tsx: 'React TSX 컴포넌트',
    python: 'Python 코드',
    java: 'Java 코드',
    cpp: 'C++ 코드',
    c: 'C 코드',
    go: 'Go 코드',
    rust: 'Rust 코드',
    php: 'PHP 코드',
    markdown: '마크다운 문서',
    md: '마크다운 문서'
  };
  
  const baseTitle = languageTitles[lang] || `${language.toUpperCase()} 코드`;
  
  // 인덱스가 0보다 크면 번호 추가
  return index > 0 ? `${baseTitle} ${index + 1}` : baseTitle;
}

/**
 * 내용에서 첫 번째 의미 있는 줄 추출 (제목 생성용)
 */
function extractFirstMeaningfulLine(content: string): string | null {
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 주석이나 빈 줄이 아닌 첫 번째 줄
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('#')) {
      return trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed;
    }
  }
  
  return null;
}