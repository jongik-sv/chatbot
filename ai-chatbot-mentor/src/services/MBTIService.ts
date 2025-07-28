// services/MBTIService.ts
import { MBTIType, MBTIProfile, MBTIMentor, MBTICompatibility, Mentor, MentorPersonality } from '@/types';
import { mbtiProfiles } from '@/data/mbtiProfiles';
import { calculateMBTICompatibility } from '@/data/mbtiCompatibility';

export class MBTIService {
  /**
   * 모든 MBTI 프로필 조회
   */
  getAllMBTIProfiles(): Record<MBTIType, MBTIProfile> {
    return mbtiProfiles;
  }

  /**
   * 특정 MBTI 타입의 프로필 조회
   */
  getMBTIProfile(type: MBTIType): MBTIProfile | null {
    return mbtiProfiles[type] || null;
  }

  /**
   * MBTI 타입별로 그룹화된 프로필 조회
   */
  getMBTIProfilesByGroup(): {
    analysts: MBTIProfile[];
    diplomats: MBTIProfile[];
    sentinels: MBTIProfile[];
    explorers: MBTIProfile[];
  } {
    return {
      analysts: [
        mbtiProfiles.INTJ,
        mbtiProfiles.INTP,
        mbtiProfiles.ENTJ,
        mbtiProfiles.ENTP
      ],
      diplomats: [
        mbtiProfiles.INFJ,
        mbtiProfiles.INFP,
        mbtiProfiles.ENFJ,
        mbtiProfiles.ENFP
      ],
      sentinels: [
        mbtiProfiles.ISTJ,
        mbtiProfiles.ISFJ,
        mbtiProfiles.ESTJ,
        mbtiProfiles.ESFJ
      ],
      explorers: [
        mbtiProfiles.ISTP,
        mbtiProfiles.ISFP,
        mbtiProfiles.ESTP,
        mbtiProfiles.ESFP
      ]
    };
  }

  /**
   * MBTI 타입을 기반으로 멘토 생성
   */
  createMBTIMentor(mbtiType: MBTIType, baseMentor: Partial<Mentor>): MBTIMentor {
    const profile = this.getMBTIProfile(mbtiType);
    if (!profile) {
      throw new Error(`Invalid MBTI type: ${mbtiType}`);
    }

    const adaptedPersonality = this.adaptPersonalityForMentoring(profile);
    const systemPrompt = this.generateSystemPrompt(profile);

    return {
      id: baseMentor.id || 0,
      userId: baseMentor.userId || 0,
      name: baseMentor.name || `${profile.name} 멘토`,
      description: baseMentor.description || `${profile.description}를 바탕으로 한 MBTI 전문 멘토`,
      personality: adaptedPersonality,
      expertise: baseMentor.expertise || this.getDefaultExpertise(profile),
      mbtiType: mbtiType,
      systemPrompt: systemPrompt,
      isPublic: baseMentor.isPublic ?? true,
      createdAt: baseMentor.createdAt || new Date(),
      mbtiProfile: profile,
      adaptedPersonality: adaptedPersonality
    };
  }

  /**
   * MBTI 프로필을 멘토링에 적합하도록 조정
   */
  private adaptPersonalityForMentoring(profile: MBTIProfile): MentorPersonality {
    return {
      traits: [
        ...profile.strengths.slice(0, 3),
        '인내심',
        '격려하는 성향',
        '학습자 중심 사고'
      ],
      communicationStyle: this.adaptCommunicationForMentoring(profile),
      teachingApproach: this.getTeachingApproach(profile),
      responseStyle: this.getResponseStyle(profile)
    };
  }

  /**
   * 멘토링에 적합한 의사소통 스타일 생성
   */
  private adaptCommunicationForMentoring(profile: MBTIProfile): string {
    const baseStyle = profile.communicationStyle;
    const learningPrefs = profile.learningPreferences.join(', ');
    
    return `${baseStyle} 학습자의 ${learningPrefs} 특성을 고려하여 맞춤형 지도를 제공합니다.`;
  }

  /**
   * MBTI 타입별 교육 접근법 생성
   */
  private getTeachingApproach(profile: MBTIProfile): string {
    const type = profile.type;
    
    // NT (분석가) 그룹
    if (['INTJ', 'INTP', 'ENTJ', 'ENTP'].includes(type)) {
      return '체계적이고 논리적인 설명을 통해 개념의 깊이 있는 이해를 돕고, 창의적 문제 해결 능력을 기릅니다.';
    }
    
    // NF (외교관) 그룹  
    if (['INFJ', 'INFP', 'ENFJ', 'ENFP'].includes(type)) {
      return '개인의 가치와 목표를 존중하며, 의미 있는 학습 경험을 통해 성장을 지원합니다.';
    }
    
    // SJ (수호자) 그룹
    if (['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].includes(type)) {
      return '단계적이고 체계적인 접근을 통해 안정적인 학습 환경을 제공하고 실용적 적용을 중시합니다.';
    }
    
    // SP (탐험가) 그룹
    if (['ISTP', 'ISFP', 'ESTP', 'ESFP'].includes(type)) {
      return '실습과 체험 중심의 학습을 통해 즉각적이고 실용적인 도움을 제공합니다.';
    }
    
    return '학습자의 특성에 맞는 맞춤형 교육을 제공합니다.';
  }

  /**
   * MBTI 타입별 응답 스타일 생성
   */
  private getResponseStyle(profile: MBTIProfile): string {
    const motivations = profile.motivations.slice(0, 2).join('과 ');
    const workStyle = profile.workStyle;
    
    return `${motivations}을 중시하며, ${workStyle}를 반영한 조언을 제공합니다.`;
  }

  /**
   * MBTI 타입별 기본 전문 분야 설정
   */
  private getDefaultExpertise(profile: MBTIProfile): string[] {
    const type = profile.type;
    const base = ['MBTI 기반 성격 분석', '개인 성장 코칭'];
    
    // NT (분석가) 그룹
    if (['INTJ', 'INTP', 'ENTJ', 'ENTP'].includes(type)) {
      return [...base, '전략적 사고', '문제 해결', '창의적 혁신', '시스템 분석'];
    }
    
    // NF (외교관) 그룹  
    if (['INFJ', 'INFP', 'ENFJ', 'ENFP'].includes(type)) {
      return [...base, '개인 상담', '동기 부여', '관계 개선', '창의적 표현'];
    }
    
    // SJ (수호자) 그룹
    if (['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].includes(type)) {
      return [...base, '계획 수립', '조직 관리', '실용적 조언', '안정성 확보'];
    }
    
    // SP (탐험가) 그룹
    if (['ISTP', 'ISFP', 'ESTP', 'ESFP'].includes(type)) {
      return [...base, '실무 기술', '적응력 향상', '즉흥 대응', '체험 학습'];
    }
    
    return base;
  }

  /**
   * MBTI 기반 시스템 프롬프트 생성
   */
  private generateSystemPrompt(profile: MBTIProfile): string {
    const personality = this.adaptPersonalityForMentoring(profile);
    
    return `당신은 MBTI ${profile.type}(${profile.name}) 유형을 기반으로 한 전문 멘토입니다.

## 당신의 특성:
- **성격**: ${profile.description}
- **강점**: ${profile.strengths.join(', ')}
- **의사소통 스타일**: ${personality.communicationStyle}
- **교육 접근법**: ${personality.teachingApproach}
- **응답 스타일**: ${personality.responseStyle}

## 멘토링 원칙:
1. 학습자의 MBTI 유형을 고려하여 맞춤형 조언 제공
2. ${profile.learningPreferences.join(', ')} 학습 선호도 반영
3. ${profile.motivations.join(', ')} 동기 요소 활용
4. ${profile.stressors.join(', ')} 스트레스 요인 회피

## 대화 스타일:
- ${profile.communicationStyle}
- 학습자의 성격 유형에 맞는 설명 방식 사용
- 격려와 지지를 통한 긍정적 분위기 조성
- 구체적이고 실용적인 조언 제공

항상 학습자의 성장과 발전을 최우선으로 하여 도움을 제공하세요.`;
  }

  /**
   * 사용자와 멘토 간의 MBTI 호환성 분석
   */
  getMBTICompatibility(userType: MBTIType, mentorType: MBTIType): MBTICompatibility {
    return calculateMBTICompatibility(userType, mentorType);
  }

  /**
   * 사용자 MBTI에 가장 적합한 멘토 타입 추천
   */
  getRecommendedMentorTypes(userType: MBTIType, count: number = 3): MBTIType[] {
    const allTypes: MBTIType[] = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    return allTypes
      .map(mentorType => ({
        type: mentorType,
        compatibility: calculateMBTICompatibility(userType, mentorType)
      }))
      .sort((a, b) => b.compatibility.compatibilityScore - a.compatibility.compatibilityScore)
      .slice(0, count)
      .map(item => item.type);
  }

  /**
   * MBTI 타입 검증
   */
  isValidMBTIType(type: string): type is MBTIType {
    const validTypes: MBTIType[] = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];
    return validTypes.includes(type as MBTIType);
  }
}

export const mbtiService = new MBTIService();