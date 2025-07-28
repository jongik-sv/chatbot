// data/mbtiProfiles.ts
import { MBTIType, MBTIProfile } from '@/types';

export const mbtiProfiles: Record<MBTIType, MBTIProfile> = {
  INTJ: {
    type: 'INTJ',
    name: '건축가',
    nickname: '전략가',
    description: '상상력이 풍부하면서도 신뢰할 수 있고, 야심차면서도 신중한, 강력한 의지를 가진 성격',
    strengths: [
      '독립적이고 창의적인 사고',
      '체계적이고 논리적인 접근',
      '장기적 비전과 전략적 사고',
      '결단력과 실행력'
    ],
    weaknesses: [
      '감정 표현의 어려움',
      '완벽주의 성향',
      '타인의 감정에 대한 둔감함',
      '비판에 대한 민감함'
    ],
    communicationStyle: '직접적이고 간결한 의사소통을 선호하며, 논리적 근거를 중시합니다.',
    learningPreferences: [
      '독립적 학습',
      '체계적이고 구조화된 정보',
      '이론과 개념의 깊이 있는 이해',
      '장기적 목표와 연결된 학습'
    ],
    motivations: [
      '개인적 성장과 발전',
      '복잡한 문제 해결',
      '독립성과 자율성',
      '전문성 확립'
    ],
    stressors: [
      '비효율적인 시스템',
      '감정적 갈등',
      '세부적인 일상 업무',
      '예측 불가능한 상황'
    ],
    workStyle: '독립적이고 체계적으로 일하며, 계획을 세우고 단계별로 실행하는 것을 선호합니다.',
    decisionMaking: '논리적 분석과 장기적 관점을 바탕으로 신중하게 결정을 내립니다.',
    relationshipStyle: '소수의 깊이 있는 관계를 선호하며, 진정성과 신뢰를 중시합니다.',
    cognitiveStack: {
      dominant: 'Ni (내향 직관)',
      auxiliary: 'Te (외향 사고)',
      tertiary: 'Fi (내향 감정)',
      inferior: 'Se (외향 감각)'
    }
  },
  INTP: {
    type: 'INTP',
    name: '논리술사',
    nickname: '사색가',
    description: '논리적이고 창의적인 사고를 하며, 지식에 대한 갈증이 강한 성격',
    strengths: [
      '뛰어난 분석 능력',
      '창의적이고 혁신적인 사고',
      '객관적이고 논리적 접근',
      '지적 호기심과 탐구정신'
    ],
    weaknesses: [
      '실무 실행력 부족',
      '감정적 측면 간과',
      '세부사항에 대한 소홀함',
      '인간관계에서의 어려움'
    ],
    communicationStyle: '논리적이고 분석적인 대화를 선호하며, 아이디어와 개념 중심으로 소통합니다.',
    learningPreferences: [
      '이론적 학습',
      '개념과 원리의 이해',
      '탐구형 학습',
      '자율적 학습 환경'
    ],
    motivations: [
      '지적 호기심 충족',
      '새로운 지식 습득',
      '창의적 문제 해결',
      '자유로운 탐구'
    ],
    stressors: [
      '엄격한 규칙과 제약',
      '감정적 압박',
      '반복적인 업무',
      '시간적 압박'
    ],
    workStyle: '유연하고 자율적인 환경에서 창의적으로 일하며, 연구와 분석을 선호합니다.',
    decisionMaking: '충분한 정보 수집과 논리적 분석을 통해 객관적으로 판단합니다.',
    relationshipStyle: '지적 교류를 중시하며, 서로의 독립성을 존중하는 관계를 선호합니다.',
    cognitiveStack: {
      dominant: 'Ti (내향 사고)',
      auxiliary: 'Ne (외향 직관)',
      tertiary: 'Si (내향 감각)',
      inferior: 'Fe (외향 감정)'
    }
  },
  ENTJ: {
    type: 'ENTJ',
    name: '통솔자',
    nickname: '지휘관',
    description: '대담하고 상상력이 풍부하며 의지가 강한 지도자형 성격',
    strengths: [
      '뛰어난 리더십',
      '전략적 사고',
      '목표 지향적',
      '결단력과 추진력'
    ],
    weaknesses: [
      '지나친 경쟁심',
      '감정적 측면 간과',
      '독단적 성향',
      '인내심 부족'
    ],
    communicationStyle: '직접적이고 목적 지향적인 의사소통을 하며, 명확한 지시와 피드백을 제공합니다.',
    learningPreferences: [
      '목적 지향적 학습',
      '실용적 적용',
      '경쟁적 환경',
      '리더십 개발'
    ],
    motivations: [
      '목표 달성',
      '리더십 발휘',
      '조직 발전',
      '성과 창출'
    ],
    stressors: [
      '비효율성',
      '무능한 팀원',
      '애매한 상황',
      '통제 불능'
    ],
    workStyle: '체계적이고 효율적으로 일하며, 팀을 이끌고 목표를 달성하는 데 집중합니다.',
    decisionMaking: '신속하고 결단력 있게 결정하며, 장기적 목표를 고려합니다.',
    relationshipStyle: '목적 지향적이고 성과 중심적인 관계를 형성하며, 상호 발전을 추구합니다.',
    cognitiveStack: {
      dominant: 'Te (외향 사고)',
      auxiliary: 'Ni (내향 직관)',
      tertiary: 'Se (외향 감각)',
      inferior: 'Fi (내향 감정)'
    }
  },
  ENTP: {
    type: 'ENTP',
    name: '변론가',
    nickname: '발명가',
    description: '창의적이고 활발하며 자유로운 영혼의 소유자로, 항상 변화와 새로움을 추구하는 성격',
    strengths: [
      '창의적이고 혁신적',
      '뛰어난 의사소통 능력',
      '적응력과 유연성',
      '낙관적이고 열정적'
    ],
    weaknesses: [
      '일관성 부족',
      '세부사항 간과',
      '집중력 부족',
      '계획 실행의 어려움'
    ],
    communicationStyle: '활발하고 창의적인 대화를 즐기며, 아이디어 교환과 토론을 선호합니다.',
    learningPreferences: [
      '다양한 주제 탐색',
      '토론과 브레인스토밍',
      '실험적 학습',
      '자유로운 학습 환경'
    ],
    motivations: [
      '새로운 가능성 탐구',
      '창의적 표현',
      '자유로운 환경',
      '다양한 경험'
    ],
    stressors: [
      '반복적인 업무',
      '엄격한 규칙',
      '단조로운 환경',
      '과도한 세부사항'
    ],
    workStyle: '창의적이고 유연하게 일하며, 새로운 아이디어를 끊임없이 생성하고 실험합니다.',
    decisionMaking: '다양한 가능성을 고려하며, 유연하고 적응적으로 결정합니다.',
    relationshipStyle: '다양한 사람들과 활발하게 교류하며, 지적 자극과 새로운 관점을 추구합니다.',
    cognitiveStack: {
      dominant: 'Ne (외향 직관)',
      auxiliary: 'Ti (내향 사고)',
      tertiary: 'Fe (외향 감정)',
      inferior: 'Si (내향 감각)'
    }
  },
  INFJ: {
    type: 'INFJ',
    name: '옹호자',
    nickname: '예언자',
    description: '이상적이고 원칙주의적이며, 타인을 돕는 일에서 보람을 느끼는 성격',
    strengths: [
      '깊이 있는 통찰력',
      '공감 능력',
      '이상 추구',
      '창의적 사고'
    ],
    weaknesses: [
      '완벽주의 성향',
      '번아웃 위험',
      '갈등 회피',
      '과도한 민감성'
    ],
    communicationStyle: '깊이 있고 의미 있는 대화를 선호하며, 상대방의 감정과 니즈를 세심하게 고려합니다.',
    learningPreferences: [
      '의미 중심 학습',
      '개인적 연결',
      '조용한 학습 환경',
      '가치 기반 학습'
    ],
    motivations: [
      '타인 도움',
      '의미 있는 일',
      '개인적 성장',
      '이상 실현'
    ],
    stressors: [
      '갈등 상황',
      '과도한 자극',
      '가치 충돌',
      '시간 압박'
    ],
    workStyle: '조용하고 집중적으로 일하며, 의미 있는 목표를 향해 꾸준히 노력합니다.',
    decisionMaking: '가치와 원칙을 바탕으로 신중하게 결정하며, 타인에게 미칠 영향을 고려합니다.',
    relationshipStyle: '깊이 있고 진정성 있는 관계를 추구하며, 상호 이해와 지지를 중시합니다.',
    cognitiveStack: {
      dominant: 'Ni (내향 직관)',
      auxiliary: 'Fe (외향 감정)',
      tertiary: 'Ti (내향 사고)',
      inferior: 'Se (외향 감각)'
    }
  },
  INFP: {
    type: 'INFP',
    name: '중재자',
    nickname: '이상주의자',
    description: '항상 선을 행할 준비가 되어 있는 부드럽고 친근한 성격',
    strengths: [
      '강한 가치관',
      '창의성과 상상력',
      '공감 능력',
      '적응력'
    ],
    weaknesses: [
      '지나친 이상주의',
      '비판에 대한 민감함',
      '실용성 부족',
      '갈등 회피'
    ],
    communicationStyle: '부드럽고 배려 깊은 의사소통을 하며, 개인적 가치와 감정을 중시합니다.',
    learningPreferences: [
      '개인적 의미 발견',
      '창의적 표현',
      '자기 주도적 학습',
      '가치 중심 학습'
    ],
    motivations: [
      '개인적 가치 실현',
      '타인 도움',
      '창의적 표현',
      '진정성 추구'
    ],
    stressors: [
      '가치 충돌',
      '비판과 갈등',
      '과도한 규칙',
      '시간 압박'
    ],
    workStyle: '유연하고 창의적으로 일하며, 개인적 가치와 일치하는 일에서 최고의 성과를 냅니다.',
    decisionMaking: '개인적 가치와 원칙을 바탕으로 결정하며, 신중하게 고려합니다.',
    relationshipStyle: '진정성과 이해를 바탕으로 한 깊이 있는 관계를 추구합니다.',
    cognitiveStack: {
      dominant: 'Fi (내향 감정)',
      auxiliary: 'Ne (외향 직관)',
      tertiary: 'Si (내향 감각)',
      inferior: 'Te (외향 사고)'
    }
  },
  ENFJ: {
    type: 'ENFJ',
    name: '주인공',
    nickname: '교사',
    description: '카리스마 넘치고 영감을 주는 지도자로, 듣는 이들을 사로잡는 성격',
    strengths: [
      '뛰어난 인간관계 능력',
      '카리스마와 영향력',
      '타인에 대한 통찰력',
      '열정과 동기부여'
    ],
    weaknesses: [
      '타인 우선으로 인한 소진',
      '과도한 감정 몰입',
      '비판에 대한 민감함',
      '완벽주의 성향'
    ],
    communicationStyle: '따뜻하고 격려하는 방식으로 소통하며, 타인의 잠재력을 이끌어내는 데 집중합니다.',
    learningPreferences: [
      '협력적 학습',
      '의미와 목적 중심',
      '사회적 상호작용',
      '타인 도움을 통한 학습'
    ],
    motivations: [
      '타인의 성장 돕기',
      '의미 있는 관계',
      '사회적 기여',
      '조화로운 환경 조성'
    ],
    stressors: [
      '갈등과 불화',
      '타인의 고통',
      '가치 충돌',
      '과도한 책임감'
    ],
    workStyle: '타인과 협력하며 일하고, 팀원들의 발전과 조화를 중시합니다.',
    decisionMaking: '타인에게 미칠 영향을 고려하며, 가치와 관계를 바탕으로 결정합니다.',
    relationshipStyle: '따뜻하고 지지적인 관계를 형성하며, 타인의 성장을 돕는 것을 즐깁니다.',
    cognitiveStack: {
      dominant: 'Fe (외향 감정)',
      auxiliary: 'Ni (내향 직관)',
      tertiary: 'Se (외향 감각)',
      inferior: 'Ti (내향 사고)'
    }
  },
  ENFP: {
    type: 'ENFP',
    name: '활동가',
    nickname: '영감을 주는 자',
    description: '열정적이고 창의적인 자유로운 영혼으로, 항상 긍정적인 면을 바라보는 성격',
    strengths: [
      '뛰어난 소통 능력',
      '창의성과 혁신',
      '열정과 에너지',
      '사람에 대한 관심'
    ],
    weaknesses: [
      '집중력 부족',
      '일관성 결여',
      '스트레스에 민감',
      '실무 실행력 부족'
    ],
    communicationStyle: '열정적이고 영감을 주는 방식으로 소통하며, 가능성과 잠재력에 초점을 맞춥니다.',
    learningPreferences: [
      '다양한 활동',
      '협력 학습',
      '창의적 프로젝트',
      '사람 중심 학습'
    ],
    motivations: [
      '새로운 가능성',
      '인간관계',
      '창의적 표현',
      '자유로운 환경'
    ],
    stressors: [
      '반복적 업무',
      '엄격한 규칙',
      '갈등 상황',
      '과도한 세부사항'
    ],
    workStyle: '창의적이고 협력적으로 일하며, 다양한 프로젝트를 동시에 진행하는 것을 선호합니다.',
    decisionMaking: '가치와 가능성을 고려하며, 직감과 감정을 바탕으로 결정합니다.',
    relationshipStyle: '다양한 사람들과 활발하게 교류하며, 서로 영감을 주고받는 관계를 추구합니다.',
    cognitiveStack: {
      dominant: 'Ne (외향 직관)',
      auxiliary: 'Fi (내향 감정)',
      tertiary: 'Te (외향 사고)',
      inferior: 'Si (내향 감각)'
    }
  },
  ISTJ: {
    type: 'ISTJ',
    name: '현실주의자',
    nickname: '책임자',
    description: '실용적이고 논리적이며, 신뢰할 수 있고 성실한 성격',
    strengths: [
      '책임감과 신뢰성',
      '체계적이고 조직적',
      '실용적 접근',
      '꾸준함과 인내력'
    ],
    weaknesses: [
      '변화에 대한 저항',
      '융통성 부족',
      '감정 표현 어려움',
      '새로운 아이디어에 대한 회의적 시각'
    ],
    communicationStyle: '명확하고 구체적인 의사소통을 선호하며, 사실과 경험을 바탕으로 대화합니다.',
    learningPreferences: [
      '체계적 학습',
      '단계별 접근',
      '실용적 내용',
      '반복 학습'
    ],
    motivations: [
      '안정성과 보안',
      '의무와 책임 완수',
      '전통과 질서',
      '실용적 성과'
    ],
    stressors: [
      '갑작스러운 변화',
      '애매한 지시',
      '시간 압박',
      '비현실적 요구'
    ],
    workStyle: '계획적이고 체계적으로 일하며, 정확성과 완성도를 중시합니다.',
    decisionMaking: '과거 경험과 사실을 바탕으로 신중하게 결정합니다.',
    relationshipStyle: '충실하고 안정적인 관계를 추구하며, 신뢰와 일관성을 중시합니다.',
    cognitiveStack: {
      dominant: 'Si (내향 감각)',
      auxiliary: 'Te (외향 사고)',
      tertiary: 'Fi (내향 감정)',
      inferior: 'Ne (외향 직관)'
    }
  },
  ISFJ: {
    type: 'ISFJ',
    name: '보호자',
    nickname: '수호자',
    description: '따뜻하고 마음 씨 착한 성격으로, 항상 타인을 도울 준비가 되어 있는 성격',
    strengths: [
      '배려심과 친절함',
      '실용적 도움 제공',
      '책임감과 신뢰성',
      '세심한 관찰력'
    ],
    weaknesses: [
      '자기 표현 어려움',
      '갈등 회피',
      '과도한 자기희생',
      '변화에 대한 저항'
    ],
    communicationStyle: '부드럽고 배려 깊은 방식으로 소통하며, 상대방의 니즈에 세심하게 반응합니다.',
    learningPreferences: [
      '실용적 적용',
      '개인적 의미',
      '안정적 환경',
      '타인과의 협력'
    ],
    motivations: [
      '타인 도움',
      '조화로운 관계',
      '안정성',
      '의미 있는 기여'
    ],
    stressors: [
      '갈등과 비판',
      '과도한 요구',
      '급한 변화',
      '감정적 부담'
    ],
    workStyle: '신중하고 세심하게 일하며, 타인의 니즈를 고려하여 지원합니다.',
    decisionMaking: '타인에게 미칠 영향을 고려하며, 안정성과 조화를 추구합니다.',
    relationshipStyle: '따뜻하고 지지적인 관계를 형성하며, 상대방을 돌보는 것을 자연스럽게 여깁니다.',
    cognitiveStack: {
      dominant: 'Si (내향 감각)',
      auxiliary: 'Fe (외향 감정)',
      tertiary: 'Ti (내향 사고)',
      inferior: 'Ne (외향 직관)'
    }
  },
  ESTJ: {
    type: 'ESTJ',
    name: '경영자',
    nickname: '감독관',
    description: '뛰어난 관리자로서 질서를 만들고 프로젝트와 사람들을 이끄는 데 타고난 재능이 있는 성격',
    strengths: [
      '뛰어난 조직 능력',
      '리더십과 관리 능력',
      '목표 지향성',
      '현실적 접근'
    ],
    weaknesses: [
      '융통성 부족',
      '감정적 측면 간과',
      '독단적 성향',
      '변화에 대한 저항'
    ],
    communicationStyle: '명확하고 직접적인 의사소통을 하며, 효율성과 결과를 중시합니다.',
    learningPreferences: [
      '구조화된 학습',
      '실용적 적용',
      '목표 지향적',
      '경험 중심'
    ],
    motivations: [
      '목표 달성',
      '조직과 질서',
      '리더십 발휘',
      '전통과 안정성'
    ],
    stressors: [
      '비효율성',
      '애매한 상황',
      '통제 불능',
      '갑작스러운 변화'
    ],
    workStyle: '체계적이고 효율적으로 일하며, 팀을 조직하고 목표를 달성하는 데 집중합니다.',
    decisionMaking: '실용성과 효율성을 바탕으로 신속하게 결정합니다.',
    relationshipStyle: '명확한 역할과 책임이 있는 관계를 선호하며, 상호 존중을 바탕으로 합니다.',
    cognitiveStack: {
      dominant: 'Te (외향 사고)',
      auxiliary: 'Si (내향 감각)',
      tertiary: 'Ne (외향 직관)',
      inferior: 'Fi (내향 감정)'
    }
  },
  ESFJ: {
    type: 'ESFJ',
    name: '집정관',
    nickname: '돌봄이',
    description: '매우 배려심이 많고 사교적이며 인기가 많은, 항상 다른 사람을 돕고 싶어하는 성격',
    strengths: [
      '뛰어난 대인관계 능력',
      '협력과 조화',
      '실용적 도움 제공',
      '책임감과 신뢰성'
    ],
    weaknesses: [
      '비판에 대한 민감함',
      '갈등 회피',
      '타인 의존성',
      '변화에 대한 저항'
    ],
    communicationStyle: '따뜻하고 지지적인 방식으로 소통하며, 조화와 협력을 중시합니다.',
    learningPreferences: [
      '협력 학습',
      '실용적 적용',
      '사회적 상호작용',
      '격려와 지지'
    ],
    motivations: [
      '타인과의 조화',
      '사회적 기여',
      '인정과 감사',
      '안정된 관계'
    ],
    stressors: [
      '갈등과 비판',
      '사회적 거부',
      '가치 충돌',
      '과도한 요구'
    ],
    workStyle: '협력적이고 배려 깊게 일하며, 팀의 화합과 사기를 중시합니다.',
    decisionMaking: '타인의 의견과 감정을 고려하며, 조화와 협력을 바탕으로 결정합니다.',
    relationshipStyle: '따뜻하고 지지적인 관계를 형성하며, 상호 돌봄과 협력을 추구합니다.',
    cognitiveStack: {
      dominant: 'Fe (외향 감정)',
      auxiliary: 'Si (내향 감각)',
      tertiary: 'Ne (외향 직관)',
      inferior: 'Ti (내향 사고)'
    }
  },
  ISTP: {
    type: 'ISTP',
    name: '가상 건축가',
    nickname: '장인',
    description: '대담하면서도 실용적인 사고를 하는 실험정신이 강한 사람',
    strengths: [
      '뛰어난 문제 해결 능력',
      '실용적이고 효율적',
      '유연하고 적응적',
      '독립성과 자율성'
    ],
    weaknesses: [
      '감정 표현 어려움',
      '장기 계획 부족',
      '타인과의 소통 부족',
      '일관성 결여'
    ],
    communicationStyle: '간결하고 실용적인 의사소통을 하며, 행동으로 보여주는 것을 선호합니다.',
    learningPreferences: [
      '실습 중심 학습',
      '독립적 탐구',
      '문제 해결 중심',
      '유연한 학습 환경'
    ],
    motivations: [
      '자유로운 탐구',
      '실용적 문제 해결',
      '독립성',
      '새로운 경험'
    ],
    stressors: [
      '엄격한 규칙',
      '감정적 압박',
      '장기간 계획',
      '사회적 기대'
    ],
    workStyle: '독립적이고 유연하게 일하며, 실용적 문제를 해결하는 데 집중합니다.',
    decisionMaking: '논리적 분석과 실용성을 바탕으로 신속하게 결정합니다.',
    relationshipStyle: '여유롭고 독립적인 관계를 선호하며, 실질적 도움을 통해 애정을 표현합니다.',
    cognitiveStack: {
      dominant: 'Ti (내향 사고)',
      auxiliary: 'Se (외향 감각)',
      tertiary: 'Ni (내향 직관)',
      inferior: 'Fe (외향 감정)'
    }
  },
  ISFP: {
    type: 'ISFP',
    name: '모험가',
    nickname: '예술가',
    description: '유연하고 매력적인 예술가 기질로, 항상 새로운 가능성을 탐색할 준비가 되어 있는 성격',
    strengths: [
      '강한 심미 감각',
      '공감 능력',
      '유연성과 적응력',
      '개성과 창의성'
    ],
    weaknesses: [
      '자기 표현 어려움',
      '비판에 대한 민감함',
      '계획성 부족',
      '갈등 회피'
    ],
    communicationStyle: '부드럽고 개인적인 방식으로 소통하며, 감정과 가치를 중시합니다.',
    learningPreferences: [
      '개인적 의미',
      '창의적 표현',
      '자기 주도적',
      '실습과 경험'
    ],
    motivations: [
      '개인적 가치 실현',
      '창의적 표현',
      '진정성',
      '자유로운 환경'
    ],
    stressors: [
      '가치 충돌',
      '비판과 갈등',
      '과도한 규칙',
      '경쟁적 환경'
    ],
    workStyle: '유연하고 창의적으로 일하며, 개인적 가치와 일치하는 일에서 최고의 성과를 냅니다.',
    decisionMaking: '개인적 가치와 감정을 바탕으로 신중하게 결정합니다.',
    relationshipStyle: '진정성 있고 배려 깊은 관계를 추구하며, 서로의 개성을 존중합니다.',
    cognitiveStack: {
      dominant: 'Fi (내향 감정)',
      auxiliary: 'Se (외향 감각)',
      tertiary: 'Ni (내향 직관)',
      inferior: 'Te (외향 사고)'
    }
  },
  ESTP: {
    type: 'ESTP',
    name: '사업가',
    nickname: '행동가',
    description: '삶을 즐길 줄 알며 사람과 사물에 대한 관심이 넘치는 활동적인 성격',
    strengths: [
      '뛰어난 적응력',
      '실용적 문제 해결',
      '사교성과 매력',
      '행동력과 에너지'
    ],
    weaknesses: [
      '장기 계획 부족',
      '충동적 성향',
      '세부사항 간과',
      '감정적 측면 부족'
    ],
    communicationStyle: '활발하고 직접적인 의사소통을 하며, 현재 상황에 집중합니다.',
    learningPreferences: [
      '실습 중심',
      '활동적 학습',
      '즉시 적용',
      '사회적 학습'
    ],
    motivations: [
      '즉각적 성과',
      '새로운 경험',
      '사회적 상호작용',
      '자유로운 환경'
    ],
    stressors: [
      '장기간 계획',
      '이론적 내용',
      '제약과 규칙',
      '단조로운 환경'
    ],
    workStyle: '활동적이고 유연하게 일하며, 즉각적인 문제 해결에 뛰어납니다.',
    decisionMaking: '현재 상황과 실용성을 바탕으로 신속하게 결정합니다.',
    relationshipStyle: '활발하고 재미있는 관계를 추구하며, 다양한 사람들과 교류합니다.',
    cognitiveStack: {
      dominant: 'Se (외향 감각)',
      auxiliary: 'Ti (내향 사고)',
      tertiary: 'Fe (외향 감정)',
      inferior: 'Ni (내향 직관)'
    }
  },
  ESFP: {
    type: 'ESFP',
    name: '연예인',
    nickname: '엔터테이너',
    description: '자발적이고 열정적이며 사교적인 성격으로, 어디서든 즐거움을 찾는 사람',
    strengths: [
      '뛰어난 사교성',
      '긍정적 에너지',
      '공감 능력',
      '적응력과 유연성'
    ],
    weaknesses: [
      '계획성 부족',
      '비판에 대한 민감함',
      '집중력 부족',
      '갈등 회피'
    ],
    communicationStyle: '따뜻하고 열정적인 방식으로 소통하며, 긍정적 분위기를 조성합니다.',
    learningPreferences: [
      '체험 학습',
      '사회적 학습',
      '즐거운 환경',
      '실용적 적용'
    ],
    motivations: [
      '즐거움과 재미',
      '사회적 인정',
      '타인과의 연결',
      '새로운 경험'
    ],
    stressors: [
      '갈등과 비판',
      '과도한 계획',
      '단조로운 업무',
      '사회적 고립'
    ],
    workStyle: '협력적이고 활발하게 일하며, 팀의 사기를 높이는 데 기여합니다.',
    decisionMaking: '감정과 타인의 의견을 고려하며, 즉흥적으로 결정하는 경향이 있습니다.',
    relationshipStyle: '따뜻하고 활발한 관계를 형성하며, 즐거움과 긍정적 경험을 공유합니다.',
    cognitiveStack: {
      dominant: 'Se (외향 감각)',
      auxiliary: 'Fi (내향 감정)',
      tertiary: 'Te (외향 사고)',
      inferior: 'Ni (내향 직관)'
    }
  }
};