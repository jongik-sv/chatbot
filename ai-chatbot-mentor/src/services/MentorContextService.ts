// services/MentorContextService.ts
import { MentorRepository } from '../lib/repositories/MentorRepository';
import { MessageRepository } from '../lib/repositories/MessageRepository';
import { Mentor, Message } from '../types';

export interface MentorContext {
  mentor: Mentor;
  systemPrompt: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  personalizedInstructions: string[];
}

export class MentorContextService {
  private mentorRepository: MentorRepository;
  private messageRepository: MessageRepository;
  
  constructor() {
    this.mentorRepository = new MentorRepository();
    this.messageRepository = new MessageRepository();
  }
  
  /**
   * 멘토별 대화 컨텍스트 생성
   */
  async createMentorContext(
    mentorId: number, 
    sessionId: number, 
    userMessage: string,
    userId?: number
  ): Promise<MentorContext> {
    // 멘토 정보 조회
    const mentor = this.mentorRepository.findById(mentorId);
    if (!mentor) {
      throw new Error('멘토를 찾을 수 없습니다.');
    }
    
    // 접근 권한 확인
    if (!mentor.isPublic && (!userId || mentor.userId !== userId)) {
      throw new Error('이 멘토에 접근할 권한이 없습니다.');
    }
    
    // 대화 히스토리 조회 (멘토별로 분리)
    const conversationHistory = this.getMentorConversationHistory(sessionId, mentorId);
    
    // 개인화된 지시사항 생성
    const personalizedInstructions = this.generatePersonalizedInstructions(
      mentor, 
      conversationHistory, 
      userMessage
    );
    
    // 시스템 프롬프트 구성
    const systemPrompt = this.buildSystemPrompt(mentor, personalizedInstructions);
    
    return {
      mentor,
      systemPrompt,
      conversationHistory,
      personalizedInstructions
    };
  }
  
  /**
   * 멘토별 대화 히스토리 조회
   */
  private getMentorConversationHistory(sessionId: number, mentorId: number): Array<{
    role: 'user' | 'assistant';
    content: string;
  }> {
    // 해당 세션의 최근 메시지들 중 멘토와의 대화만 필터링
    const recentMessages = this.messageRepository.getRecentMessages(sessionId, 20);
    
    // 멘토 관련 메시지만 필터링 (메타데이터에서 멘토 ID 확인)
    const mentorMessages = recentMessages.filter(msg => {
      if (msg.role === 'user') return true; // 사용자 메시지는 모두 포함
      
      // AI 응답의 경우 해당 멘토의 응답인지 확인
      const metadata = typeof msg.metadata === 'string' 
        ? JSON.parse(msg.metadata) 
        : msg.metadata;
      
      return metadata?.mentorId === mentorId;
    });
    
    return mentorMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  }
  
  /**
   * 개인화된 지시사항 생성
   */
  private generatePersonalizedInstructions(
    mentor: Mentor, 
    conversationHistory: Array<{ role: string; content: string }>,
    currentMessage: string
  ): string[] {
    const instructions: string[] = [];
    
    // 멘토 성격 기반 지시사항
    if (mentor.personality.traits.length > 0) {
      instructions.push(
        `당신의 성격 특성(${mentor.personality.traits.join(', ')})을 반영하여 응답하세요.`
      );
    }
    
    if (mentor.personality.communicationStyle) {
      instructions.push(
        `소통 스타일: ${mentor.personality.communicationStyle}`
      );
    }
    
    if (mentor.personality.teachingApproach) {
      instructions.push(
        `교육 방식: ${mentor.personality.teachingApproach}`
      );
    }
    
    if (mentor.personality.responseStyle) {
      instructions.push(
        `응답 스타일: ${mentor.personality.responseStyle}`
      );
    }
    
    // 전문 분야 기반 지시사항
    if (mentor.expertise.length > 0) {
      instructions.push(
        `당신의 전문 분야(${mentor.expertise.join(', ')})와 관련된 질문에는 더 깊이 있는 답변을 제공하세요.`
      );
    }
    
    // MBTI 기반 지시사항
    if (mentor.mbtiType) {
      const mbtiInstructions = this.getMBTIInstructions(mentor.mbtiType);
      instructions.push(...mbtiInstructions);
    }
    
    // 대화 히스토리 기반 개인화
    if (conversationHistory.length > 0) {
      const userPatterns = this.analyzeUserPatterns(conversationHistory);
      instructions.push(...userPatterns);
    }
    
    // 현재 메시지 컨텍스트 분석
    const contextInstructions = this.analyzeCurrentContext(currentMessage, mentor);
    instructions.push(...contextInstructions);
    
    return instructions;
  }
  
  /**
   * MBTI 유형별 지시사항
   */
  private getMBTIInstructions(mbtiType: string): string[] {
    const mbtiInstructions: Record<string, string[]> = {
      'INTJ': [
        '전략적이고 체계적인 관점에서 조언하세요.',
        '장기적인 목표와 효율적인 방법을 제시하세요.',
        '논리적 근거를 바탕으로 설명하세요.'
      ],
      'ENFP': [
        '열정적이고 격려하는 톤으로 응답하세요.',
        '창의적인 아이디어와 다양한 가능성을 제시하세요.',
        '사용자의 잠재력을 발견하도록 도우세요.'
      ],
      'ISTJ': [
        '신뢰할 수 있고 체계적인 정보를 제공하세요.',
        '단계별로 명확한 지침을 제시하세요.',
        '실용적이고 검증된 방법을 추천하세요.'
      ],
      'ESFJ': [
        '따뜻하고 배려심 있는 톤으로 응답하세요.',
        '사용자의 감정과 상황을 고려한 조언을 하세요.',
        '협력적이고 조화로운 해결책을 제시하세요.'
      ]
      // 다른 MBTI 유형들도 필요에 따라 추가
    };
    
    return mbtiInstructions[mbtiType] || [];
  }
  
  /**
   * 사용자 패턴 분석
   */
  private analyzeUserPatterns(conversationHistory: Array<{ role: string; content: string }>): string[] {
    const instructions: string[] = [];
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    
    if (userMessages.length === 0) return instructions;
    
    // 질문 패턴 분석
    const questionTypes = this.analyzeQuestionTypes(userMessages);
    if (questionTypes.length > 0) {
      instructions.push(
        `사용자는 주로 ${questionTypes.join(', ')} 관련 질문을 합니다. 이를 고려하여 답변하세요.`
      );
    }
    
    // 학습 수준 추정
    const learningLevel = this.estimateLearningLevel(userMessages);
    if (learningLevel) {
      instructions.push(
        `사용자의 학습 수준은 ${learningLevel}로 추정됩니다. 이에 맞는 난이도로 설명하세요.`
      );
    }
    
    return instructions;
  }
  
  /**
   * 질문 유형 분석
   */
  private analyzeQuestionTypes(userMessages: Array<{ content: string }>): string[] {
    const types: string[] = [];
    const contents = userMessages.map(msg => msg.content.toLowerCase());
    
    // 키워드 기반 분석
    if (contents.some(content => content.includes('어떻게') || content.includes('방법'))) {
      types.push('방법론');
    }
    
    if (contents.some(content => content.includes('왜') || content.includes('이유'))) {
      types.push('원리/이유');
    }
    
    if (contents.some(content => content.includes('추천') || content.includes('제안'))) {
      types.push('추천/제안');
    }
    
    if (contents.some(content => content.includes('문제') || content.includes('오류'))) {
      types.push('문제해결');
    }
    
    return types;
  }
  
  /**
   * 학습 수준 추정
   */
  private estimateLearningLevel(userMessages: Array<{ content: string }>): string | null {
    const contents = userMessages.map(msg => msg.content.toLowerCase());
    
    // 기초 키워드
    const basicKeywords = ['기초', '처음', '시작', '초보', '모르겠어'];
    const hasBasicKeywords = contents.some(content => 
      basicKeywords.some(keyword => content.includes(keyword))
    );
    
    // 고급 키워드
    const advancedKeywords = ['고급', '심화', '최적화', '아키텍처', '패턴'];
    const hasAdvancedKeywords = contents.some(content => 
      advancedKeywords.some(keyword => content.includes(keyword))
    );
    
    if (hasBasicKeywords) return '초급';
    if (hasAdvancedKeywords) return '고급';
    return '중급';
  }
  
  /**
   * 현재 메시지 컨텍스트 분석
   */
  private analyzeCurrentContext(message: string, mentor: Mentor): string[] {
    const instructions: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // 긴급성 분석
    if (lowerMessage.includes('급해') || lowerMessage.includes('빨리') || lowerMessage.includes('urgent')) {
      instructions.push('사용자가 급한 상황인 것 같습니다. 핵심적이고 실용적인 답변을 우선 제공하세요.');
    }
    
    // 감정 상태 분석
    if (lowerMessage.includes('힘들어') || lowerMessage.includes('어려워') || lowerMessage.includes('포기')) {
      instructions.push('사용자가 어려움을 겪고 있는 것 같습니다. 격려와 함께 단계적인 해결책을 제시하세요.');
    }
    
    // 전문 분야 매칭
    const relevantExpertise = mentor.expertise.filter(exp => 
      lowerMessage.includes(exp.toLowerCase())
    );
    
    if (relevantExpertise.length > 0) {
      instructions.push(
        `이 질문은 당신의 전문 분야(${relevantExpertise.join(', ')})와 직접 관련이 있습니다. 전문성을 발휘하여 상세한 답변을 제공하세요.`
      );
    }
    
    return instructions;
  }
  
  /**
   * 시스템 프롬프트 구성
   */
  private buildSystemPrompt(mentor: Mentor, personalizedInstructions: string[]): string {
    let prompt = mentor.systemPrompt;
    
    if (personalizedInstructions.length > 0) {
      prompt += '\n\n=== 추가 지시사항 ===\n';
      prompt += personalizedInstructions.map((instruction, index) => 
        `${index + 1}. ${instruction}`
      ).join('\n');
    }
    
    // 일관성 보장을 위한 마지막 지시사항
    prompt += '\n\n=== 중요 ===\n';
    prompt += '위의 모든 지시사항을 종합하여 일관된 성격과 스타일을 유지하며 응답하세요. ';
    prompt += '사용자에게 도움이 되고 건설적인 조언을 제공하는 것이 최우선 목표입니다.';
    
    return prompt;
  }
  
  /**
   * 멘토 응답 후처리
   */
  async processMentorResponse(
    mentorId: number,
    sessionId: number,
    messageId: number,
    response: string
  ): Promise<void> {
    // 응답에 멘토 정보 메타데이터 추가
    const message = this.messageRepository.findById(messageId);
    if (message) {
      const metadata = typeof message.metadata === 'string' 
        ? JSON.parse(message.metadata) 
        : message.metadata || {};
      
      metadata.mentorId = mentorId;
      metadata.mentorResponse = true;
      
      this.messageRepository.updateMetadata(messageId, metadata);
    }
  }
  
  /**
   * 멘토별 대화 통계
   */
  getMentorConversationStats(mentorId: number, sessionId: number): {
    totalMessages: number;
    userMessages: number;
    mentorResponses: number;
    averageResponseLength: number;
  } {
    const messages = this.messageRepository.getBySessionId(sessionId);
    const mentorMessages = messages.filter(msg => {
      if (msg.role === 'user') return true;
      
      const metadata = typeof msg.metadata === 'string' 
        ? JSON.parse(msg.metadata) 
        : msg.metadata;
      
      return metadata?.mentorId === mentorId;
    });
    
    const userMessages = mentorMessages.filter(msg => msg.role === 'user');
    const mentorResponses = mentorMessages.filter(msg => msg.role === 'assistant');
    
    const averageResponseLength = mentorResponses.length > 0
      ? mentorResponses.reduce((sum, msg) => sum + msg.content.length, 0) / mentorResponses.length
      : 0;
    
    return {
      totalMessages: mentorMessages.length,
      userMessages: userMessages.length,
      mentorResponses: mentorResponses.length,
      averageResponseLength: Math.round(averageResponseLength)
    };
  }
}