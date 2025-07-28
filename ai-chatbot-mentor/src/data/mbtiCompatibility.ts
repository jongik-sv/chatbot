// data/mbtiCompatibility.ts
import { MBTIType, MBTICompatibility } from '@/types';

// MBTI 호환성 매트릭스
export const compatibilityMatrix: Record<MBTIType, Record<MBTIType, number>> = {
  INTJ: {
    INTJ: 8, INTP: 9, ENTJ: 7, ENTP: 8,
    INFJ: 6, INFP: 7, ENFJ: 5, ENFP: 6,
    ISTJ: 6, ISFJ: 4, ESTJ: 5, ESFJ: 3,
    ISTP: 7, ISFP: 5, ESTP: 4, ESFP: 3
  },
  INTP: {
    INTJ: 9, INTP: 7, ENTJ: 8, ENTP: 9,
    INFJ: 7, INFP: 6, ENFJ: 6, ENFP: 7,
    ISTJ: 5, ISFJ: 4, ESTJ: 4, ESFJ: 3,
    ISTP: 8, ISFP: 5, ESTP: 5, ESFP: 4
  },
  ENTJ: {
    INTJ: 7, INTP: 8, ENTJ: 6, ENTP: 7,
    INFJ: 5, INFP: 4, ENFJ: 6, ENFP: 5,
    ISTJ: 7, ISFJ: 5, ESTJ: 8, ESFJ: 6,
    ISTP: 6, ISFP: 4, ESTP: 7, ESFP: 5
  },
  ENTP: {
    INTJ: 8, INTP: 9, ENTJ: 7, ENTP: 6,
    INFJ: 8, INFP: 7, ENFJ: 7, ENFP: 8,
    ISTJ: 4, ISFJ: 5, ESTJ: 5, ESFJ: 6,
    ISTP: 7, ISFP: 6, ESTP: 6, ESFP: 7
  },
  INFJ: {
    INTJ: 6, INTP: 7, ENTJ: 5, ENTP: 8,
    INFJ: 7, INFP: 8, ENFJ: 6, ENFP: 9,
    ISTJ: 5, ISFJ: 6, ESTJ: 4, ESFJ: 5,
    ISTP: 4, ISFP: 7, ESTP: 3, ESFP: 6
  },
  INFP: {
    INTJ: 7, INTP: 6, ENTJ: 4, ENTP: 7,
    INFJ: 8, INFP: 6, ENFJ: 9, ENFP: 8,
    ISTJ: 4, ISFJ: 5, ESTJ: 3, ESFJ: 4,
    ISTP: 5, ISFP: 7, ESTP: 4, ESFP: 6
  },
  ENFJ: {
    INTJ: 5, INTP: 6, ENTJ: 6, ENTP: 7,
    INFJ: 6, INFP: 9, ENFJ: 5, ENFP: 7,
    ISTJ: 6, ISFJ: 7, ESTJ: 7, ESFJ: 8,
    ISTP: 4, ISFP: 8, ESTP: 5, ESFP: 9
  },
  ENFP: {
    INTJ: 6, INTP: 7, ENTJ: 5, ENTP: 8,
    INFJ: 9, INFP: 8, ENFJ: 7, ENFP: 6,
    ISTJ: 4, ISFJ: 6, ESTJ: 5, ESFJ: 7,
    ISTP: 5, ISFP: 8, ESTP: 6, ESFP: 8
  },
  ISTJ: {
    INTJ: 6, INTP: 5, ENTJ: 7, ENTP: 4,
    INFJ: 5, INFP: 4, ENFJ: 6, ENFP: 4,
    ISTJ: 7, ISFJ: 8, ESTJ: 9, ESFJ: 8,
    ISTP: 6, ISFP: 5, ESTP: 7, ESFP: 6
  },
  ISFJ: {
    INTJ: 4, INTP: 4, ENTJ: 5, ENTP: 5,
    INFJ: 6, INFP: 5, ENFJ: 7, ENFP: 6,
    ISTJ: 8, ISFJ: 6, ESTJ: 8, ESFJ: 9,
    ISTP: 5, ISFP: 6, ESTP: 6, ESFP: 7
  },
  ESTJ: {
    INTJ: 5, INTP: 4, ENTJ: 8, ENTP: 5,
    INFJ: 4, INFP: 3, ENFJ: 7, ENFP: 5,
    ISTJ: 9, ISFJ: 8, ESTJ: 7, ESFJ: 8,
    ISTP: 6, ISFP: 4, ESTP: 8, ESFP: 6
  },
  ESFJ: {
    INTJ: 3, INTP: 3, ENTJ: 6, ENTP: 6,
    INFJ: 5, INFP: 4, ENFJ: 8, ENFP: 7,
    ISTJ: 8, ISFJ: 9, ESTJ: 8, ESFJ: 7,
    ISTP: 4, ISFP: 6, ESTP: 7, ESFP: 8
  },
  ISTP: {
    INTJ: 7, INTP: 8, ENTJ: 6, ENTP: 7,
    INFJ: 4, INFP: 5, ENFJ: 4, ENFP: 5,
    ISTJ: 6, ISFJ: 5, ESTJ: 6, ESFJ: 4,
    ISTP: 6, ISFP: 7, ESTP: 9, ESFP: 8
  },
  ISFP: {
    INTJ: 5, INTP: 5, ENTJ: 4, ENTP: 6,
    INFJ: 7, INFP: 7, ENFJ: 8, ENFP: 8,
    ISTJ: 5, ISFJ: 6, ESTJ: 4, ESFJ: 6,
    ISTP: 7, ISFP: 5, ESTP: 8, ESFP: 9
  },
  ESTP: {
    INTJ: 4, INTP: 5, ENTJ: 7, ENTP: 6,
    INFJ: 3, INFP: 4, ENFJ: 5, ENFP: 6,
    ISTJ: 7, ISFJ: 6, ESTJ: 8, ESFJ: 7,
    ISTP: 9, ISFP: 8, ESTP: 7, ESFP: 8
  },
  ESFP: {
    INTJ: 3, INTP: 4, ENTJ: 5, ENTP: 7,
    INFJ: 6, INFP: 6, ENFJ: 9, ENFP: 8,
    ISTJ: 6, ISFJ: 7, ESTJ: 6, ESFJ: 8,
    ISTP: 8, ISFP: 9, ESTP: 8, ESFP: 6
  }
};

export function calculateMBTICompatibility(userType: MBTIType, mentorType: MBTIType): MBTICompatibility {
  const score = compatibilityMatrix[userType][mentorType];
  
  // 기본 템플릿
  const compatibility: MBTICompatibility = {
    userType,
    mentorType,
    compatibilityScore: score,
    strengths: [],
    challenges: [],
    communicationTips: [],
    learningTips: []
  };

  // 점수별 일반적인 특성
  if (score >= 8) {
    compatibility.strengths.push(
      '높은 상호 이해도',
      '자연스러운 소통',
      '유사한 사고 패턴',
      '효과적인 학습 환경'
    );
    compatibility.challenges.push(
      '성장을 위한 다양한 관점 부족',
      '편안함으로 인한 도전 부족'
    );
  } else if (score >= 6) {
    compatibility.strengths.push(
      '균형잡힌 상호작용',
      '서로 다른 강점 보완',
      '적당한 도전과 지지'
    );
    compatibility.challenges.push(
      '때때로 발생하는 의견 차이',
      '소통 방식의 조정 필요'
    );
  } else {
    compatibility.strengths.push(
      '새로운 관점 제공',
      '성장을 위한 도전',
      '다양한 학습 기회'
    );
    compatibility.challenges.push(
      '초기 소통의 어려움',
      '다른 접근 방식으로 인한 혼란',
      '상호 이해를 위한 노력 필요'
    );
  }

  // 특정 조합별 맞춤형 조언
  addSpecificTips(compatibility);
  
  return compatibility;
}

function addSpecificTips(compatibility: MBTICompatibility) {
  const { userType, mentorType } = compatibility;

  // NT(분석가) 그룹
  if (isNT(userType) && isNT(mentorType)) {
    compatibility.communicationTips.push(
      '논리적 근거와 체계적 설명 중심으로 대화하세요',
      '이론과 개념을 깊이 있게 탐구하세요',
      '창의적 문제 해결 방법을 함께 모색하세요'
    );
    compatibility.learningTips.push(
      '복잡한 개념을 단계별로 분해해서 학습하세요',
      '다양한 관점에서 문제를 분석해보세요'
    );
  }

  // NF(외교관) 그룹
  if (isNF(userType) && isNF(mentorType)) {
    compatibility.communicationTips.push(
      '개인적 가치와 의미를 중심으로 대화하세요',
      '감정과 직감을 존중하는 분위기를 만드세요',
      '성장과 발전에 대한 비전을 공유하세요'
    );
    compatibility.learningTips.push(
      '학습 내용과 개인적 목표를 연결지어보세요',
      '창의적 표현을 통해 학습하세요'
    );
  }

  // SJ(수호자) 그룹
  if (isSJ(userType) && isSJ(mentorType)) {
    compatibility.communicationTips.push(
      '단계별이고 체계적인 설명을 제공하세요',
      '실용적 적용 방법을 구체적으로 제시하세요',
      '안정적이고 예측 가능한 학습 환경을 조성하세요'
    );
    compatibility.learningTips.push(
      '반복 학습과 점진적 개선을 중시하세요',
      '실제 사례와 경험을 활용하세요'
    );
  }

  // SP(탐험가) 그룹
  if (isSP(userType) && isSP(mentorType)) {
    compatibility.communicationTips.push(
      '실습과 체험 중심의 대화를 나누세요',
      '즉각적인 피드백과 적용을 제공하세요',
      '유연하고 자유로운 분위기를 유지하세요'
    );
    compatibility.learningTips.push(
      '다양한 활동과 실험을 통해 학습하세요',
      '실제 적용과 즉시 활용을 중시하세요'
    );
  }

  // 서로 다른 그룹 간의 조합
  if (isNT(userType) && isNF(mentorType)) {
    compatibility.communicationTips.push(
      '논리적 분석과 가치 중심 접근을 균형있게 활용하세요',
      '객관적 사실과 주관적 의미를 모두 고려하세요'
    );
  }

  if (isNF(userType) && isNT(mentorType)) {
    compatibility.communicationTips.push(
      '개인적 가치를 논리적으로 설명해보세요',
      '감정적 측면도 중요한 데이터로 인정하세요'
    );
  }

  if ((isNT(userType) || isNF(userType)) && (isSJ(mentorType) || isSP(mentorType))) {
    compatibility.communicationTips.push(
      '추상적 개념을 구체적 예시로 설명하세요',
      '실용적 적용 방안을 함께 모색하세요'
    );
  }

  if ((isSJ(userType) || isSP(userType)) && (isNT(mentorType) || isNF(mentorType))) {
    compatibility.communicationTips.push(
      '실제 경험과 사례를 이론과 연결지어보세요',
      '단계별 접근으로 복잡한 개념을 단순화하세요'
    );
  }
}

function isNT(type: MBTIType): boolean {
  return ['INTJ', 'INTP', 'ENTJ', 'ENTP'].includes(type);
}

function isNF(type: MBTIType): boolean {
  return ['INFJ', 'INFP', 'ENFJ', 'ENFP'].includes(type);
}

function isSJ(type: MBTIType): boolean {
  return ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].includes(type);
}

function isSP(type: MBTIType): boolean {
  return ['ISTP', 'ISFP', 'ESTP', 'ESFP'].includes(type);
}