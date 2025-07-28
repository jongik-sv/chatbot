// services/MentorImprovementService.ts
import { MentorService } from './MentorService';
import { LLMService } from './LLMService';

export interface FeedbackData {
  mentorId: string;
  sessionId: string;
  messageId: string;
  rating: number; // 1-5 scale
  feedbackType: 'helpful' | 'unhelpful' | 'inappropriate' | 'inaccurate' | 'excellent';
  comment?: string;
  timestamp: Date;
}

export interface MentorPerformanceMetrics {
  mentorId: string;
  totalInteractions: number;
  averageRating: number;
  feedbackCounts: Record<string, number>;
  improvementSuggestions: string[];
  lastUpdated: Date;
}

export interface MentorImprovementSuggestion {
  category: 'personality' | 'knowledge' | 'communication' | 'accuracy';
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  implementationHint: string;
}

export class MentorImprovementService {
  private mentorService: MentorService;
  private llmService: LLMService;

  constructor() {
    this.mentorService = new MentorService();
    this.llmService = new LLMService();
  }

  // 사용자 피드백 수집
  async collectFeedback(feedbackData: FeedbackData): Promise<void> {
    try {
      const db = await import('../lib/database').then(m => m.getDatabase());
      
      await db.run(`
        INSERT INTO mentor_feedback (
          mentor_id, session_id, message_id, rating, feedback_type, comment, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        feedbackData.mentorId,
        feedbackData.sessionId,
        feedbackData.messageId,
        feedbackData.rating,
        feedbackData.feedbackType,
        feedbackData.comment || null,
        feedbackData.timestamp.toISOString()
      ]);

      // 피드백 수집 후 즉시 개선 분석 트리거
      await this.analyzeFeedbackAndImprove(feedbackData.mentorId);
    } catch (error) {
      console.error('Error collecting feedback:', error);
      throw error;
    }
  }

  // 멘토 성능 메트릭 계산
  async calculatePerformanceMetrics(mentorId: string): Promise<MentorPerformanceMetrics> {
    try {
      const db = await import('../lib/database').then(m => m.getDatabase());
      
      // 기본 통계 조회
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_interactions,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN feedback_type = 'helpful' THEN 1 END) as helpful_count,
          COUNT(CASE WHEN feedback_type = 'unhelpful' THEN 1 END) as unhelpful_count,
          COUNT(CASE WHEN feedback_type = 'inappropriate' THEN 1 END) as inappropriate_count,
          COUNT(CASE WHEN feedback_type = 'inaccurate' THEN 1 END) as inaccurate_count,
          COUNT(CASE WHEN feedback_type = 'excellent' THEN 1 END) as excellent_count
        FROM mentor_feedback 
        WHERE mentor_id = ?
      `, [mentorId]);

      const feedbackCounts = {
        helpful: stats.helpful_count || 0,
        unhelpful: stats.unhelpful_count || 0,
        inappropriate: stats.inappropriate_count || 0,
        inaccurate: stats.inaccurate_count || 0,
        excellent: stats.excellent_count || 0
      };

      // 개선 제안 생성
      const improvementSuggestions = await this.generateImprovementSuggestions(mentorId, feedbackCounts);

      return {
        mentorId,
        totalInteractions: stats.total_interactions || 0,
        averageRating: stats.average_rating || 0,
        feedbackCounts,
        improvementSuggestions: improvementSuggestions.map(s => s.suggestion),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      throw error;
    }
  }

  // 피드백 분석 및 멘토 개선
  async analyzeFeedbackAndImprove(mentorId: string): Promise<void> {
    try {
      const metrics = await this.calculatePerformanceMetrics(mentorId);
      const mentor = await this.mentorService.getMentor(mentorId);
      
      if (!mentor) {
        throw new Error('Mentor not found');
      }

      // 개선이 필요한 경우에만 처리
      if (metrics.averageRating < 3.5 || metrics.totalInteractions >= 10) {
        const improvements = await this.generateImprovementSuggestions(mentorId, metrics.feedbackCounts);
        await this.applyImprovements(mentorId, improvements);
      }
    } catch (error) {
      console.error('Error analyzing feedback and improving mentor:', error);
      throw error;
    }
  }

  // AI 기반 개선 제안 생성
  private async generateImprovementSuggestions(
    mentorId: string, 
    feedbackCounts: Record<string, number>
  ): Promise<MentorImprovementSuggestion[]> {
    try {
      const mentor = await this.mentorService.getMentor(mentorId);
      if (!mentor) return [];

      // 최근 피드백 코멘트 조회
      const db = await import('../lib/database').then(m => m.getDatabase());
      const recentFeedback = await db.all(`
        SELECT comment, feedback_type, rating 
        FROM mentor_feedback 
        WHERE mentor_id = ? AND comment IS NOT NULL 
        ORDER BY timestamp DESC 
        LIMIT 20
      `, [mentorId]);

      const prompt = `
멘토 개선 분석을 위한 데이터:

멘토 정보:
- 이름: ${mentor.name}
- 성격: ${mentor.personality}
- 전문분야: ${mentor.expertise}
- 현재 시스템 프롬프트: ${mentor.systemPrompt}

피드백 통계:
- 도움됨: ${feedbackCounts.helpful}
- 도움안됨: ${feedbackCounts.unhelpful}
- 부적절함: ${feedbackCounts.inappropriate}
- 부정확함: ${feedbackCounts.inaccurate}
- 우수함: ${feedbackCounts.excellent}

최근 피드백 코멘트:
${recentFeedback.map(f => `- ${f.feedback_type} (${f.rating}/5): ${f.comment}`).join('\n')}

위 데이터를 바탕으로 멘토의 개선점을 분석하고, 구체적인 개선 제안을 JSON 형태로 제공해주세요.
각 제안은 다음 형태여야 합니다:
{
  "category": "personality|knowledge|communication|accuracy",
  "suggestion": "구체적인 개선 제안",
  "priority": "low|medium|high",
  "implementationHint": "시스템 프롬프트에 적용할 구체적인 힌트"
}

최대 5개의 제안을 우선순위 순으로 제공해주세요.
`;

      const response = await this.llmService.generateResponse(prompt, 'gemini-pro');
      
      try {
        const suggestions = JSON.parse(response);
        return Array.isArray(suggestions) ? suggestions : [suggestions];
      } catch (parseError) {
        console.error('Error parsing improvement suggestions:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error generating improvement suggestions:', error);
      return [];
    }
  }

  // 개선사항 적용
  private async applyImprovements(
    mentorId: string, 
    improvements: MentorImprovementSuggestion[]
  ): Promise<void> {
    try {
      const mentor = await this.mentorService.getMentor(mentorId);
      if (!mentor) return;

      // 고우선순위 개선사항만 적용
      const highPriorityImprovements = improvements.filter(i => i.priority === 'high');
      
      if (highPriorityImprovements.length === 0) return;

      // 시스템 프롬프트 개선
      const improvementPrompt = `
현재 멘토의 시스템 프롬프트를 개선해주세요:

현재 프롬프트:
${mentor.systemPrompt}

적용할 개선사항:
${highPriorityImprovements.map(i => `- ${i.category}: ${i.implementationHint}`).join('\n')}

개선된 시스템 프롬프트를 제공해주세요. 기존의 멘토 특성은 유지하면서 피드백을 반영한 개선만 적용해주세요.
`;

      const improvedPrompt = await this.llmService.generateResponse(improvementPrompt, 'gemini-pro');

      // 멘토 업데이트
      await this.mentorService.updateMentor(mentorId, {
        systemPrompt: improvedPrompt,
        lastImprovement: new Date().toISOString()
      });

      // 개선 로그 저장
      await this.logImprovement(mentorId, highPriorityImprovements);
    } catch (error) {
      console.error('Error applying improvements:', error);
      throw error;
    }
  }

  // 개선 로그 저장
  private async logImprovement(
    mentorId: string, 
    improvements: MentorImprovementSuggestion[]
  ): Promise<void> {
    try {
      const db = await import('../lib/database').then(m => m.getDatabase());
      
      for (const improvement of improvements) {
        await db.run(`
          INSERT INTO mentor_improvements (
            mentor_id, category, suggestion, priority, implementation_hint, applied_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          mentorId,
          improvement.category,
          improvement.suggestion,
          improvement.priority,
          improvement.implementationHint,
          new Date().toISOString()
        ]);
      }
    } catch (error) {
      console.error('Error logging improvement:', error);
    }
  }

  // 멘토 개선 히스토리 조회
  async getImprovementHistory(mentorId: string): Promise<any[]> {
    try {
      const db = await import('../lib/database').then(m => m.getDatabase());
      
      return await db.all(`
        SELECT * FROM mentor_improvements 
        WHERE mentor_id = ? 
        ORDER BY applied_at DESC
      `, [mentorId]);
    } catch (error) {
      console.error('Error getting improvement history:', error);
      return [];
    }
  }

  // 전체 멘토 성능 대시보드 데이터
  async getMentorPerformanceDashboard(): Promise<any> {
    try {
      const db = await import('../lib/database').then(m => m.getDatabase());
      
      const mentors = await db.all('SELECT id, name FROM mentors');
      const dashboardData = [];

      for (const mentor of mentors) {
        const metrics = await this.calculatePerformanceMetrics(mentor.id);
        dashboardData.push({
          ...mentor,
          ...metrics
        });
      }

      return {
        mentors: dashboardData,
        summary: {
          totalMentors: mentors.length,
          averageRating: dashboardData.reduce((sum, m) => sum + m.averageRating, 0) / mentors.length,
          totalInteractions: dashboardData.reduce((sum, m) => sum + m.totalInteractions, 0)
        }
      };
    } catch (error) {
      console.error('Error getting mentor performance dashboard:', error);
      throw error;
    }
  }
}