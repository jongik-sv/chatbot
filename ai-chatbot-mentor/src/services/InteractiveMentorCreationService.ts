// services/InteractiveMentorCreationService.ts
import { MentorService } from './MentorService';
import { LLMService } from './LLMService';
import { Mentor, MentorPersonality } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface CreationQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'scale';
  options?: string[];
  category: 'goals' | 'interests' | 'style' | 'personality' | 'expertise';
  required: boolean;
}

export interface CreationSession {
  sessionId: string;
  userId?: number;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  createdAt: Date;
  isComplete: boolean;
  mentorProfile?: GeneratedMentorProfile;
}

export interface GeneratedMentorProfile {
  name: string;
  description: string;
  personality: MentorPersonality;
  expertise: string[];
  mbtiType?: string;
  systemPrompt: string;
  reasoning: string; // AI가 이 프로필을 생성한 이유
}

export interface SessionProgress {
  current: number;
  total: number;
  percentage: number;
}

export class InteractiveMentorCreationService {
  private mentorService: MentorService;
  private llmService: LLMService;
  private sessions: Map<string, CreationSession> = new Map();
  private questions: CreationQuestion[];

  constructor() {
    this.mentorService = new MentorService();
    this.llmService = new LLMService();
    this.questions = this.initializeQuestions();
  }

  // 대화형 멘토 생성 세션 시작
  async startCreationSession(userId?: number): Promise<{
    sessionId: string;
    currentQuestion: CreationQuestion;
    progress: SessionProgress;
    totalQuestions: number;
  }> {
    const sessionId = uuidv4();
    
    const session: CreationSession = {
      sessionId,
      userId,
      currentQuestionIndex: 0,
      answers: {},
      createdAt: new Date(),
      isComplete: false
    };
    
    this.sessions.set(sessionId, session);
    
    return {
      sessionId,
      currentQuestion: this.questions[0],
      progress: this.calculateProgress(session),
      totalQuestions: this.questions.length
    };
  }

  // 질문에 대한 답변 처리
  async answerQuestion(sessionId: string, questionId: string, answer: string): Promise<{
    sessionId: string;
    nextQuestion?: CreationQuestion;
    isComplete: boolean;
    mentorProfile?: GeneratedMentorProfile;
    progress: SessionProgress;
    totalQuestions: number;
  }> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('세션을 찾을 수 없습니다');
    }

    // 답변 저장
    session.answers[questionId] = answer;
    session.currentQuestionIndex++;

    // 모든 질문이 완료되었는지 확인
    if (session.currentQuestionIndex >= this.questions.length) {
      // AI를 사용하여 멘토 프로필 생성
      const mentorProfile = await this.generateMentorProfile(session.answers);
      session.mentorProfile = mentorProfile;
      session.isComplete = true;
      
      return {
        sessionId,
        isComplete: true,
        mentorProfile,
        progress: this.calculateProgress(session),
        totalQuestions: this.questions.length
      };
    }

    // 다음 질문 반환
    const nextQuestion = this.questions[session.currentQuestionIndex];
    
    return {
      sessionId,
      nextQuestion,
      isComplete: false,
      progress: this.calculateProgress(session),
      totalQuestions: this.questions.length
    };
  }

  // 멘토 생성 완료
  async completeMentorCreation(
    sessionId: string, 
    userId?: number,
    customizations?: {
      name?: string;
      description?: string;
      additionalTraits?: string[];
      systemPromptAdditions?: string;
    }
  ): Promise<Mentor> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isComplete || !session.mentorProfile) {
      throw new Error('완료되지 않은 세션이거나 멘토 프로필이 생성되지 않았습니다');
    }

    const profile = session.mentorProfile;
    
    // 사용자 커스터마이징 적용
    const finalProfile = {
      ...profile,
      name: customizations?.name || profile.name,
      description: customizations?.description || profile.description,
      personality: {
        ...profile.personality,
        traits: customizations?.additionalTraits 
          ? [...profile.personality.traits, ...customizations.additionalTraits]
          : profile.personality.traits
      },
      systemPrompt: customizations?.systemPromptAdditions
        ? `${profile.systemPrompt}\n\n추가 지시사항:\n${customizations.systemPromptAdditions}`
        : profile.systemPrompt
    };

    // 멘토 생성
    const mentor = await this.mentorService.createMentor({
      userId: userId || session.userId,
      name: finalProfile.name,
      description: finalProfile.description,
      personality: finalProfile.personality,
      expertise: finalProfile.expertise,
      mbtiType: finalProfile.mbtiType,
      systemPrompt: finalProfile.systemPrompt,
      isPublic: false
    });

    // 세션 정리
    this.sessions.delete(sessionId);

    return mentor;
  }

  // 세션 상태 조회
  async getSessionStatus(sessionId: string): Promise<CreationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  // AI를 사용하여 멘토 프로필 생성
  private async generateMentorProfile(answers: Record<string, string>): Promise<GeneratedMentorProfile> {
    const prompt = this.buildAnalysisPrompt(answers);
    
    try {
      // Gemini를 사용하여 분석 (더 나은 추론 능력)
      const response = await this.llmService.callGemini(prompt, {
        temperature: 0.7,
        maxTokens: 2000
      });

      // JSON 응답 파싱
      const profileData = this.parseProfileResponse(response);
      
      return profileData;
    } catch (error) {
      console.error('Error generating mentor profile:', error);
      // 폴백: 기본 프로필 생성
      return this.generateFallbackProfile(answers);
    }
  }

  // 분석 프롬프트 생성
  private buildAnalysisPrompt(answers: Record<string, string>): string {
    const answersText = Object.entries(answers)
      .map(([questionId, answer]) => {
        const question = this.questions.find(q => q.id === questionId);
        return `질문: ${question?.question}\n답변: ${answer}`;
      })
      .join('\n\n');

    return `
다음은 사용자가 대화형 멘토 생성 과정에서 제공한 답변들입니다:

${answersText}

이 답변들을 분석하여 사용자에게 가장 적합한 AI 멘토 프로필을 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "name": "멘토 이름 (창의적이고 기억하기 쉬운 이름)",
  "description": "멘토에 대한 간단한 설명 (2-3문장)",
  "personality": {
    "traits": ["특성1", "특성2", "특성3", "특성4"],
    "communicationStyle": "소통 스타일 설명",
    "teachingApproach": "교육 방식 설명",
    "responseStyle": "응답 스타일 설명"
  },
  "expertise": ["전문분야1", "전문분야2", "전문분야3"],
  "mbtiType": "추정되는 MBTI 유형 (선택사항)",
  "systemPrompt": "멘토의 역할과 행동 방식을 정의하는 상세한 시스템 프롬프트",
  "reasoning": "이 프로필을 생성한 이유와 근거"
}

사용자의 답변을 바탕으로 개인화되고 효과적인 멘토를 만들어주세요.
`;
  }

  // AI 응답 파싱
  private parseProfileResponse(response: string): GeneratedMentorProfile {
    try {
      // JSON 부분만 추출
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 형식을 찾을 수 없습니다');
      }

      const profileData = JSON.parse(jsonMatch[0]);
      
      // 필수 필드 검증
      if (!profileData.name || !profileData.description || !profileData.personality) {
        throw new Error('필수 필드가 누락되었습니다');
      }

      return profileData;
    } catch (error) {
      console.error('Error parsing profile response:', error);
      throw new Error('AI 응답을 파싱할 수 없습니다');
    }
  }

  // 폴백 프로필 생성
  private generateFallbackProfile(answers: Record<string, string>): GeneratedMentorProfile {
    // 답변을 기반으로 간단한 규칙 기반 프로필 생성
    const goals = answers['goals'] || '일반적인 학습';
    const interests = answers['interests'] || '다양한 주제';
    const style = answers['learning_style'] || '균형잡힌';

    return {
      name: '맞춤형 멘토',
      description: `${goals}에 특화된 개인 맞춤형 AI 멘토입니다. ${interests} 분야에 관심이 많으며, ${style} 학습 스타일을 선호하는 사용자를 위해 설계되었습니다.`,
      personality: {
        traits: ['도움이 되는', '인내심 있는', '격려하는', '전문적인'],
        communicationStyle: '친근하고 이해하기 쉬운 방식으로 소통합니다',
        teachingApproach: '사용자의 학습 스타일에 맞춰 단계별로 설명합니다',
        responseStyle: '명확하고 실용적인 조언을 제공합니다'
      },
      expertise: [goals, interests, '자기계발'].filter(Boolean),
      systemPrompt: `당신은 사용자의 ${goals} 목표 달성을 돕는 개인 맞춤형 AI 멘토입니다. ${interests}에 대한 깊은 이해를 바탕으로 ${style} 방식으로 가르치며, 항상 격려하고 실용적인 조언을 제공합니다.`,
      reasoning: '사용자의 답변을 기반으로 기본적인 맞춤형 프로필을 생성했습니다.'
    };
  }

  // 진행률 계산
  private calculateProgress(session: CreationSession): SessionProgress {
    const current = session.currentQuestionIndex;
    const total = this.questions.length;
    const percentage = Math.round((current / total) * 100);

    return { current, total, percentage };
  }

  // 질문 초기화
  private initializeQuestions(): CreationQuestion[] {
    return [
      {
        id: 'goals',
        question: '어떤 목표를 달성하기 위해 멘토의 도움이 필요하신가요?',
        type: 'text',
        category: 'goals',
        required: true
      },
      {
        id: 'interests',
        question: '가장 관심 있는 분야나 주제는 무엇인가요?',
        type: 'text',
        category: 'interests',
        required: true
      },
      {
        id: 'learning_style',
        question: '선호하는 학습 방식은 무엇인가요?',
        type: 'choice',
        options: [
          '단계별 체계적 학습',
          '실습 중심 학습',
          '이론과 실습의 균형',
          '창의적이고 자유로운 학습',
          '토론과 질문 중심 학습'
        ],
        category: 'style',
        required: true
      },
      {
        id: 'communication_preference',
        question: '멘토와 어떤 방식으로 소통하고 싶으신가요?',
        type: 'choice',
        options: [
          '친근하고 격려하는 방식',
          '전문적이고 직접적인 방식',
          '유머러스하고 재미있는 방식',
          '차분하고 신중한 방식',
          '열정적이고 동기부여하는 방식'
        ],
        category: 'personality',
        required: true
      },
      {
        id: 'expertise_level',
        question: '현재 관심 분야에서의 본인의 수준은 어느 정도인가요?',
        type: 'choice',
        options: [
          '완전 초보자',
          '기초 지식 보유',
          '중급 수준',
          '상급 수준',
          '전문가 수준'
        ],
        category: 'expertise',
        required: true
      },
      {
        id: 'challenge_areas',
        question: '가장 어려워하거나 개선하고 싶은 부분은 무엇인가요?',
        type: 'text',
        category: 'goals',
        required: true
      },
      {
        id: 'motivation_style',
        question: '어떤 방식의 동기부여가 가장 효과적인가요?',
        type: 'choice',
        options: [
          '칭찬과 격려',
          '구체적인 목표 설정',
          '성취감과 보상',
          '경쟁과 도전',
          '자율성과 선택권'
        ],
        category: 'personality',
        required: true
      },
      {
        id: 'feedback_preference',
        question: '피드백을 받을 때 선호하는 방식은?',
        type: 'choice',
        options: [
          '부드럽고 건설적인 피드백',
          '직접적이고 명확한 피드백',
          '구체적인 개선 방안 제시',
          '긍정적인 면 먼저 언급',
          '질문을 통한 자기 성찰 유도'
        ],
        category: 'style',
        required: true
      }
    ];
  }
}