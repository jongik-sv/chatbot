/**
 * Mermaid 다이어그램 유틸리티 함수들
 */

export interface MermaidDiagramInfo {
  type: string;
  displayName: string;
  description: string;
  syntax: string;
  example: string;
}

/**
 * 지원되는 Mermaid 다이어그램 타입들
 */
export const MERMAID_DIAGRAM_TYPES: Record<string, MermaidDiagramInfo> = {
  flowchart: {
    type: 'flowchart',
    displayName: '플로우차트',
    description: '프로세스나 워크플로우를 시각화',
    syntax: 'flowchart TD\n    A --> B',
    example: `flowchart TD
    A[시작] --> B{조건}
    B -->|Yes| C[처리]
    B -->|No| D[종료]
    C --> D`
  },
  sequence: {
    type: 'sequenceDiagram',
    displayName: '시퀀스 다이어그램',
    description: '객체 간의 상호작용을 시간 순서로 표현',
    syntax: 'sequenceDiagram\n    A->>B: 메시지',
    example: `sequenceDiagram
    participant A as 사용자
    participant B as 서버
    A->>B: 로그인 요청
    B-->>A: 인증 토큰
    A->>B: 데이터 요청
    B-->>A: 데이터 응답`
  },
  class: {
    type: 'classDiagram',
    displayName: '클래스 다이어그램',
    description: '클래스 구조와 관계를 표현',
    syntax: 'classDiagram\n    class A',
    example: `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class Admin {
        +manageUsers()
    }
    User <|-- Admin`
  },
  state: {
    type: 'stateDiagram-v2',
    displayName: '상태 다이어그램',
    description: '시스템의 상태 변화를 표현',
    syntax: 'stateDiagram-v2\n    [*] --> A',
    example: `stateDiagram-v2
    [*] --> 대기
    대기 --> 처리중 : 시작
    처리중 --> 완료 : 성공
    처리중 --> 오류 : 실패
    완료 --> [*]
    오류 --> 대기 : 재시도`
  },
  er: {
    type: 'erDiagram',
    displayName: 'ER 다이어그램',
    description: '데이터베이스 엔티티 관계를 표현',
    syntax: 'erDiagram\n    A ||--o{ B : has',
    example: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"`
  },
  gantt: {
    type: 'gantt',
    displayName: '간트 차트',
    description: '프로젝트 일정과 작업 진행도를 표현',
    syntax: 'gantt\n    title 프로젝트\n    section 작업',
    example: `gantt
    title 프로젝트 일정
    dateFormat  YYYY-MM-DD
    section 설계
    요구사항 분석    :done, des1, 2024-01-01, 2024-01-05
    시스템 설계      :active, des2, 2024-01-06, 2024-01-15
    section 개발
    백엔드 개발      :dev1, 2024-01-16, 2024-02-15
    프론트엔드 개발  :dev2, 2024-01-20, 2024-02-20`
  },
  pie: {
    type: 'pie',
    displayName: '파이 차트',
    description: '데이터의 비율을 원형으로 표현',
    syntax: 'pie title 제목\n    "A" : 30',
    example: `pie title 사용자 분포
    "모바일" : 45
    "데스크톱" : 35
    "태블릿" : 20`
  },
  journey: {
    type: 'journey',
    displayName: '사용자 여정',
    description: '사용자 경험 여정을 시각화',
    syntax: 'journey\n    title 여정\n    section 단계',
    example: `journey
    title 온라인 쇼핑 여정
    section 발견
      광고 보기: 3: 사용자
      웹사이트 방문: 4: 사용자
    section 구매
      상품 검색: 4: 사용자
      장바구니 추가: 5: 사용자
      결제: 3: 사용자`
  },
  gitgraph: {
    type: 'gitgraph',
    displayName: 'Git 그래프',
    description: 'Git 브랜치와 커밋 히스토리를 표현',
    syntax: 'gitgraph\n    commit',
    example: `gitgraph
    commit id: "초기 커밋"
    branch develop
    checkout develop
    commit id: "기능 추가"
    checkout main
    merge develop
    commit id: "릴리즈"`
  }
};

/**
 * Mermaid 다이어그램 타입 감지
 */
export function detectMermaidDiagramType(content: string): MermaidDiagramInfo | null {
  const firstLine = content.trim().split('\n')[0].toLowerCase().trim();
  
  // 각 다이어그램 타입별 키워드 매칭
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
    return MERMAID_DIAGRAM_TYPES.flowchart;
  } else if (firstLine.startsWith('sequencediagram')) {
    return MERMAID_DIAGRAM_TYPES.sequence;
  } else if (firstLine.startsWith('classdiagram')) {
    return MERMAID_DIAGRAM_TYPES.class;
  } else if (firstLine.startsWith('statediagram')) {
    return MERMAID_DIAGRAM_TYPES.state;
  } else if (firstLine.startsWith('erdiagram')) {
    return MERMAID_DIAGRAM_TYPES.er;
  } else if (firstLine.startsWith('gantt')) {
    return MERMAID_DIAGRAM_TYPES.gantt;
  } else if (firstLine.startsWith('pie')) {
    return MERMAID_DIAGRAM_TYPES.pie;
  } else if (firstLine.startsWith('journey')) {
    return MERMAID_DIAGRAM_TYPES.journey;
  } else if (firstLine.startsWith('gitgraph')) {
    return MERMAID_DIAGRAM_TYPES.gitgraph;
  }
  
  return null;
}

/**
 * Mermaid 구문 검증
 */
export function validateMermaidSyntax(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    errors.push('다이어그램 내용이 비어있습니다.');
    return { isValid: false, errors, warnings };
  }
  
  const diagramType = detectMermaidDiagramType(content);
  if (!diagramType) {
    errors.push('지원되지 않는 다이어그램 타입입니다.');
    return { isValid: false, errors, warnings };
  }
  
  // 기본적인 구문 검증
  const firstLine = lines[0].trim();
  
  switch (diagramType.type) {
    case 'flowchart':
      if (!firstLine.match(/^(flowchart|graph)\s+(TD|TB|BT|RL|LR|DT)/i)) {
        warnings.push('플로우차트 방향이 명시되지 않았습니다. (TD, TB, BT, RL, LR 중 하나)');
      }
      break;
      
    case 'sequenceDiagram':
      if (lines.length < 2) {
        errors.push('시퀀스 다이어그램에는 최소 하나의 메시지가 필요합니다.');
      }
      break;
      
    case 'gantt':
      const hasTitle = lines.some(line => line.trim().startsWith('title'));
      if (!hasTitle) {
        warnings.push('간트 차트에 제목이 없습니다.');
      }
      break;
      
    case 'pie':
      if (!firstLine.includes('title')) {
        warnings.push('파이 차트에 제목이 없습니다.');
      }
      break;
  }
  
  // 공통 검증
  const hasEmptyLines = lines.some((line, index) => 
    index > 0 && line.trim() === '' && lines[index - 1].trim() !== ''
  );
  if (hasEmptyLines) {
    warnings.push('다이어그램 중간에 빈 줄이 있습니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Mermaid 다이어그램 템플릿 생성
 */
export function generateMermaidTemplate(type: string, options?: {
  title?: string;
  nodes?: string[];
  relationships?: Array<{ from: string; to: string; label?: string }>;
}): string {
  const diagramInfo = MERMAID_DIAGRAM_TYPES[type];
  if (!diagramInfo) {
    return '';
  }
  
  const { title = '다이어그램', nodes = [], relationships = [] } = options || {};
  
  switch (type) {
    case 'flowchart':
      let flowchart = 'flowchart TD\n';
      if (nodes.length > 0) {
        nodes.forEach((node, index) => {
          flowchart += `    ${String.fromCharCode(65 + index)}[${node}]\n`;
        });
        relationships.forEach(rel => {
          const fromIndex = nodes.indexOf(rel.from);
          const toIndex = nodes.indexOf(rel.to);
          if (fromIndex >= 0 && toIndex >= 0) {
            const fromChar = String.fromCharCode(65 + fromIndex);
            const toChar = String.fromCharCode(65 + toIndex);
            const label = rel.label ? `|${rel.label}|` : '';
            flowchart += `    ${fromChar} -->${label} ${toChar}\n`;
          }
        });
      } else {
        flowchart += diagramInfo.example;
      }
      return flowchart;
      
    case 'sequence':
      let sequence = 'sequenceDiagram\n';
      if (nodes.length > 0) {
        nodes.forEach(node => {
          sequence += `    participant ${node}\n`;
        });
        relationships.forEach(rel => {
          sequence += `    ${rel.from}->>${rel.to}: ${rel.label || '메시지'}\n`;
        });
      } else {
        sequence += diagramInfo.example.split('\n').slice(1).join('\n');
      }
      return sequence;
      
    case 'pie':
      let pie = `pie title ${title}\n`;
      if (nodes.length > 0) {
        nodes.forEach((node, index) => {
          pie += `    "${node}" : ${Math.floor(Math.random() * 50) + 10}\n`;
        });
      } else {
        pie += diagramInfo.example.split('\n').slice(1).join('\n');
      }
      return pie;
      
    default:
      return diagramInfo.example;
  }
}

/**
 * Mermaid 다이어그램에서 노드 추출
 */
export function extractNodesFromMermaid(content: string): string[] {
  const nodes: string[] = [];
  const lines = content.split('\n');
  
  const diagramType = detectMermaidDiagramType(content);
  if (!diagramType) return nodes;
  
  switch (diagramType.type) {
    case 'flowchart':
      lines.forEach(line => {
        const nodeMatch = line.match(/([A-Z]+)\[([^\]]+)\]/g);
        if (nodeMatch) {
          nodeMatch.forEach(match => {
            const labelMatch = match.match(/\[([^\]]+)\]/);
            if (labelMatch) {
              nodes.push(labelMatch[1]);
            }
          });
        }
      });
      break;
      
    case 'sequenceDiagram':
      lines.forEach(line => {
        const participantMatch = line.match(/participant\s+(\w+)(?:\s+as\s+(.+))?/);
        if (participantMatch) {
          nodes.push(participantMatch[2] || participantMatch[1]);
        }
      });
      break;
  }
  
  return [...new Set(nodes)]; // 중복 제거
}

/**
 * Mermaid 다이어그램 최적화
 */
export function optimizeMermaidDiagram(content: string): string {
  let optimized = content;
  
  // 불필요한 공백 제거
  optimized = optimized.replace(/^\s+/gm, '    '); // 들여쓰기 정규화
  optimized = optimized.replace(/\s+$/gm, ''); // 줄 끝 공백 제거
  optimized = optimized.replace(/\n{3,}/g, '\n\n'); // 연속된 빈 줄 제거
  
  // 주석 정리
  optimized = optimized.replace(/%%.*$/gm, ''); // 주석 제거
  
  return optimized.trim();
}

/**
 * Mermaid 다이어그램 복잡도 분석
 */
export function analyzeMermaidComplexity(content: string): {
  nodeCount: number;
  edgeCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  recommendations: string[];
} {
  const lines = content.split('\n');
  const nodes = extractNodesFromMermaid(content);
  const nodeCount = nodes.length;
  
  // 엣지(연결) 수 계산
  let edgeCount = 0;
  lines.forEach(line => {
    if (line.includes('-->') || line.includes('->>') || line.includes('--')) {
      edgeCount++;
    }
  });
  
  let complexity: 'simple' | 'moderate' | 'complex';
  const recommendations: string[] = [];
  
  if (nodeCount <= 5 && edgeCount <= 8) {
    complexity = 'simple';
  } else if (nodeCount <= 15 && edgeCount <= 25) {
    complexity = 'moderate';
    if (nodeCount > 10) {
      recommendations.push('노드가 많습니다. 그룹화를 고려해보세요.');
    }
  } else {
    complexity = 'complex';
    recommendations.push('다이어그램이 복잡합니다. 여러 개의 작은 다이어그램으로 분할을 고려해보세요.');
    if (nodeCount > 20) {
      recommendations.push('노드 수가 너무 많습니다. 서브그래프를 사용해보세요.');
    }
    if (edgeCount > 30) {
      recommendations.push('연결이 너무 많습니다. 핵심 관계만 표시해보세요.');
    }
  }
  
  return {
    nodeCount,
    edgeCount,
    complexity,
    recommendations
  };
}