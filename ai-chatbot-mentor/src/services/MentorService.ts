// services/MentorService.ts
import { MentorRepository, CreateMentorData, UpdateMentorData } from '../lib/repositories/MentorRepository';
import { Mentor, MentorPersonality } from '../types';

export class MentorService {
  private mentorRepository: MentorRepository;
  
  constructor() {
    this.mentorRepository = new MentorRepository();
  }
  
  // 멘토 생성
  async createMentor(data: CreateMentorData): Promise<Mentor> {
    // 기본 성격 설정이 없으면 기본값 제공
    if (!data.personality.traits.length) {
      data.personality.traits = ['도움이 되는', '친근한', '전문적인'];
    }
    
    if (!data.personality.communicationStyle) {
      data.personality.communicationStyle = '친근하고 이해하기 쉬운 방식으로 소통합니다';
    }
    
    if (!data.personality.teachingApproach) {
      data.personality.teachingApproach = '단계별로 차근차근 설명하며 실습을 통해 학습을 돕습니다';
    }
    
    if (!data.personality.responseStyle) {
      data.personality.responseStyle = '명확하고 구체적인 답변을 제공합니다';
    }
    
    // 기본 시스템 프롬프트 생성 (없는 경우)
    if (!data.systemPrompt) {
      data.systemPrompt = this.generateDefaultSystemPrompt(data);
    }
    
    return this.mentorRepository.create(data);
  }
  
  // 멘토 조회
  async getMentorById(id: number, userId?: number): Promise<Mentor | null> {
    const mentor = this.mentorRepository.findById(id);
    
    if (!mentor) {
      return null;
    }
    
    // 접근 권한 확인
    if (!mentor.isPublic && (!userId || mentor.userId !== userId)) {
      throw new Error('이 멘토에 접근할 권한이 없습니다');
    }
    
    return mentor;
  }
  
  // 사용자의 멘토 목록 조회
  async getUserMentors(userId: number): Promise<Mentor[]> {
    return this.mentorRepository.findByUserId(userId);
  }
  
  // 접근 가능한 모든 멘토 조회 (소유 + 공개)
  async getAccessibleMentors(userId?: number): Promise<Mentor[]> {
    return this.mentorRepository.findAllAccessible(userId);
  }
  
  // 공개 멘토만 조회
  async getPublicMentors(): Promise<Mentor[]> {
    return this.mentorRepository.findPublicMentors();
  }
  
  // 멘토 검색
  async searchMentors(query: string, userId?: number): Promise<Mentor[]> {
    return this.mentorRepository.search(query, userId);
  }
  
  // 멘토 업데이트
  async updateMentor(id: number, data: UpdateMentorData, userId: number): Promise<Mentor> {
    // 소유권 확인
    if (!this.mentorRepository.isOwner(id, userId)) {
      throw new Error('이 멘토를 수정할 권한이 없습니다');
    }
    
    const updatedMentor = this.mentorRepository.update(id, data);
    
    if (!updatedMentor) {
      throw new Error('멘토 업데이트에 실패했습니다');
    }
    
    return updatedMentor;
  }
  
  // 멘토 삭제
  async deleteMentor(id: number, userId: number): Promise<void> {
    // 소유권 확인
    if (!this.mentorRepository.isOwner(id, userId)) {
      throw new Error('이 멘토를 삭제할 권한이 없습니다');
    }
    
    const deleted = this.mentorRepository.delete(id);
    
    if (!deleted) {
      throw new Error('멘토 삭제에 실패했습니다');
    }
  }
  
  // 멘토 복제 (공개 멘토를 개인 멘토로)
  async cloneMentor(mentorId: number, userId: number, newName?: string): Promise<Mentor> {
    const originalMentor = this.mentorRepository.findById(mentorId);
    
    if (!originalMentor) {
      throw new Error('복제할 멘토를 찾을 수 없습니다');
    }
    
    // 공개 멘토만 복제 가능
    if (!originalMentor.isPublic) {
      throw new Error('공개 멘토만 복제할 수 있습니다');
    }
    
    const cloneData: CreateMentorData = {
      userId,
      name: newName || `${originalMentor.name} (복제본)`,
      description: originalMentor.description,
      personality: originalMentor.personality,
      expertise: originalMentor.expertise,
      mbtiType: originalMentor.mbtiType,
      systemPrompt: originalMentor.systemPrompt,
      isPublic: false // 복제본은 기본적으로 비공개
    };
    
    return this.mentorRepository.create(cloneData);
  }
  
  // 멘토 공유 설정 변경
  async togglePublicStatus(mentorId: number, userId: number): Promise<Mentor> {
    const mentor = this.mentorRepository.findById(mentorId);
    
    if (!mentor) {
      throw new Error('멘토를 찾을 수 없습니다');
    }
    
    // 소유권 확인
    if (!this.mentorRepository.isOwner(mentorId, userId)) {
      throw new Error('이 멘토의 공유 설정을 변경할 권한이 없습니다');
    }
    
    const updatedMentor = this.mentorRepository.update(mentorId, {
      isPublic: !mentor.isPublic
    });
    
    if (!updatedMentor) {
      throw new Error('공유 설정 변경에 실패했습니다');
    }
    
    return updatedMentor;
  }
  
  // 멘토 통계 조회
  async getMentorStats(mentorId: number): Promise<{
    totalSessions: number;
    totalMessages: number;
    lastUsed?: Date;
  }> {
    // 이 기능은 나중에 구현될 대화 세션과 연동
    // 현재는 기본값 반환
    return {
      totalSessions: 0,
      totalMessages: 0,
      lastUsed: undefined
    };
  }
  
  // 기본 시스템 프롬프트 생성
  private generateDefaultSystemPrompt(data: CreateMentorData): string {
    const { name, description, personality, expertise, mbtiType } = data;
    
    let prompt = `당신은 "${name}"라는 이름의 AI 멘토입니다.\n\n`;
    prompt += `설명: ${description}\n\n`;
    
    if (expertise.length > 0) {
      prompt += `전문 분야: ${expertise.join(', ')}\n\n`;
    }
    
    if (mbtiType) {
      prompt += `MBTI 유형: ${mbtiType}\n\n`;
    }
    
    prompt += `성격 특성:\n`;
    prompt += `- 특징: ${personality.traits.join(', ')}\n`;
    prompt += `- 소통 스타일: ${personality.communicationStyle}\n`;
    prompt += `- 교육 방식: ${personality.teachingApproach}\n`;
    prompt += `- 응답 스타일: ${personality.responseStyle}\n\n`;
    
    prompt += `위의 특성을 바탕으로 사용자와 상호작용하며, 항상 도움이 되고 건설적인 조언을 제공하세요. `;
    prompt += `사용자의 질문에 대해 전문성을 바탕으로 명확하고 이해하기 쉬운 답변을 제공하세요.`;
    
    return prompt;
  }
  
  // MBTI 기반 기본 멘토 생성
  async createMBTIMentor(mbtiType: string, userId?: number): Promise<Mentor> {
    const mbtiData = this.getMBTIMentorData(mbtiType);
    
    const mentorData: CreateMentorData = {
      userId,
      name: `${mbtiType} 멘토`,
      description: mbtiData.description,
      personality: mbtiData.personality,
      expertise: ['MBTI 상담', '성격 분석', '자기계발'],
      mbtiType,
      systemPrompt: mbtiData.systemPrompt,
      isPublic: false
    };
    
    return this.mentorRepository.create(mentorData);
  }
  
  // MBTI 유형별 멘토 데이터
  private getMBTIMentorData(mbtiType: string): {
    description: string;
    personality: MentorPersonality;
    systemPrompt: string;
  } {
    const mbtiProfiles: Record<string, any> = {
      'INTJ': {
        description: '전략적이고 체계적인 사고를 가진 건축가형 멘토입니다.',
        personality: {
          traits: ['전략적', '독립적', '체계적', '미래지향적'],
          communicationStyle: '논리적이고 직접적인 방식으로 소통합니다',
          teachingApproach: '큰 그림을 제시하고 체계적인 계획을 통해 목표 달성을 돕습니다',
          responseStyle: '간결하고 핵심적인 조언을 제공합니다'
        },
        systemPrompt: '당신은 INTJ 성격의 멘토로서, 전략적 사고와 장기적 관점으로 조언을 제공합니다. 효율성과 체계성을 중시하며, 사용자가 목표를 달성할 수 있는 구체적인 계획을 제시합니다.'
      },
      'ENFP': {
        description: '열정적이고 창의적인 활동가형 멘토입니다.',
        personality: {
          traits: ['열정적', '창의적', '사교적', '영감을 주는'],
          communicationStyle: '따뜻하고 격려하는 방식으로 소통합니다',
          teachingApproach: '창의적인 아이디어와 다양한 가능성을 제시하며 동기부여를 돕습니다',
          responseStyle: '긍정적이고 영감을 주는 답변을 제공합니다'
        },
        systemPrompt: '당신은 ENFP 성격의 멘토로서, 열정과 창의성으로 사용자에게 영감을 줍니다. 다양한 가능성을 제시하고 사용자의 잠재력을 발견하도록 도우며, 항상 긍정적이고 격려하는 태도를 유지합니다.'
      }
      // 다른 MBTI 유형들도 필요에 따라 추가 가능
    };
    
    return mbtiProfiles[mbtiType] || mbtiProfiles['ENFP']; // 기본값
  }
}