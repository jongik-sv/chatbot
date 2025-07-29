/**
 * 룰 적용 및 통합 시스템
 * 프롬프트에 룰을 통합하고 일관성을 보장
 */

const RuleService = require('./RuleService');

class RuleIntegration {
  constructor() {
    this.ruleService = new RuleService();
  }

  /**
   * 대화 컨텍스트에 룰 적용
   */
  async applyRulesToPrompt(prompt, options = {}) {
    const {
      userId = null,
      sessionId = null,
      mentorId = null,
      categoryFilter = null,
      excludeCategories = [],
      includeInactive = false
    } = options;

    try {
      // 활성 룰 조회
      let rules = includeInactive 
        ? await this.getAllRules(userId)
        : this.ruleService.getActiveRules(userId);

      // 카테고리 필터 적용
      if (categoryFilter) {
        rules = rules.filter(rule => rule.category === categoryFilter);
      }

      if (excludeCategories.length > 0) {
        rules = rules.filter(rule => !excludeCategories.includes(rule.category));
      }

      // 멘토별 특화 룰 적용 (추후 확장)
      if (mentorId) {
        const mentorRules = await this.getMentorSpecificRules(mentorId, userId);
        rules = [...rules, ...mentorRules];
      }

      // 룰이 없으면 원본 프롬프트 반환
      if (rules.length === 0) {
        return {
          enhancedPrompt: prompt,
          appliedRules: [],
          rulesSummary: '적용된 룰이 없습니다.'
        };
      }

      // 우선순위별로 정렬
      rules.sort((a, b) => b.priority - a.priority);

      // 프롬프트에 룰 통합
      const rulesPrompt = this.generateRulesSection(rules);
      const enhancedPrompt = this.integrateRulesIntoPrompt(prompt, rulesPrompt, rules);

      return {
        enhancedPrompt,
        appliedRules: rules.map(rule => ({
          name: rule.name,
          displayName: rule.displayName,
          category: rule.category,
          priority: rule.priority
        })),
        rulesSummary: this.generateRulesSummary(rules)
      };

    } catch (error) {
      console.error('룰 적용 오류:', error);
      return {
        enhancedPrompt: prompt,
        appliedRules: [],
        rulesSummary: '룰 적용 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }

  /**
   * 룰 섹션 생성
   */
  generateRulesSection(rules) {
    if (rules.length === 0) return '';

    // 카테고리별 그룹화
    const rulesByCategory = this.groupRulesByCategory(rules);
    const categories = this.ruleService.getRuleCategories();
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat;
      return acc;
    }, {});

    let rulesSection = '## 🎯 적용 규칙\n\n';
    rulesSection += '다음 규칙들을 반드시 준수해주세요:\n\n';

    // 카테고리별로 룰 나열
    Object.entries(rulesByCategory).forEach(([categoryName, categoryRules]) => {
      const category = categoryMap[categoryName];
      
      if (category) {
        rulesSection += `### ${category.displayName}\n`;
        if (category.description) {
          rulesSection += `*${category.description}*\n\n`;
        }
      }

      categoryRules.forEach((rule, index) => {
        const priorityEmoji = this.getPriorityEmoji(rule.priority);
        rulesSection += `${index + 1}. ${priorityEmoji} **${rule.displayName}**: ${rule.content}\n`;
      });

      rulesSection += '\n';
    });

    return rulesSection;
  }

  /**
   * 프롬프트에 룰 통합
   */
  integrateRulesIntoPrompt(originalPrompt, rulesSection, rules) {
    // 룰의 중요도에 따라 배치 위치 결정
    const highPriorityRules = rules.filter(rule => rule.priority >= 90);
    const hasCriticalRules = highPriorityRules.length > 0;

    if (hasCriticalRules) {
      // 중요한 룰이 있으면 맨 앞에 배치
      return `${rulesSection}\n---\n\n${originalPrompt}`;
    } else {
      // 일반 룰은 프롬프트 뒤에 배치
      return `${originalPrompt}\n\n---\n\n${rulesSection}`;
    }
  }

  /**
   * 룰 요약 생성
   */
  generateRulesSummary(rules) {
    const categoryCount = new Set(rules.map(rule => rule.category)).size;
    const highPriorityCount = rules.filter(rule => rule.priority >= 80).length;
    const temporaryCount = rules.filter(rule => rule.isTemporary).length;

    let summary = `총 ${rules.length}개 룰 적용`;
    
    if (categoryCount > 1) {
      summary += ` (${categoryCount}개 카테고리)`;
    }
    
    if (highPriorityCount > 0) {
      summary += `, 고우선순위 ${highPriorityCount}개`;
    }
    
    if (temporaryCount > 0) {
      summary += `, 임시 룰 ${temporaryCount}개`;
    }

    return summary;
  }

  /**
   * 룰 카테고리별 그룹화
   */
  groupRulesByCategory(rules) {
    return rules.reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push(rule);
      return acc;
    }, {});
  }

  /**
   * 우선순위 이모지 반환
   */
  getPriorityEmoji(priority) {
    if (priority >= 90) return '🔴'; // 매우 높음
    if (priority >= 70) return '🟠'; // 높음
    if (priority >= 50) return '🟡'; // 보통
    if (priority >= 30) return '🔵'; // 낮음
    return '⚪'; // 매우 낮음
  }

  /**
   * 모든 룰 조회 (비활성 포함)
   */
  async getAllRules(userId = null) {
    const categories = this.ruleService.getRuleCategories();
    const allRules = [];

    categories.forEach(category => {
      const categoryRules = this.ruleService.getRulesByCategory(category.name, userId);
      allRules.push(...categoryRules);
    });

    return allRules;
  }

  /**
   * 멘토별 특화 룰 조회 (추후 구현)
   */
  async getMentorSpecificRules(mentorId, userId = null) {
    // TODO: 멘토별 특화 룰 기능 구현
    // 현재는 빈 배열 반환
    return [];
  }

  /**
   * 룰 충돌 검사
   */
  detectRuleConflicts(rules) {
    const conflicts = [];
    
    // 동일한 우선순위의 상충하는 룰 검사
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];
        
        // 같은 카테고리, 같은 우선순위에서 상충 검사
        if (rule1.category === rule2.category && 
            rule1.priority === rule2.priority) {
          
          const conflict = this.analyzeRuleConflict(rule1, rule2);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * 룰 충돌 분석 (간단한 키워드 기반)
   */
  analyzeRuleConflict(rule1, rule2) {
    // 상충하는 키워드 패턴
    const conflictPatterns = [
      { pattern1: /한국어/i, pattern2: /영어|english/i },
      { pattern1: /정중한|정중하게/i, pattern2: /캐주얼|친근한/i },
      { pattern1: /간단한|간단하게/i, pattern2: /자세한|상세한/i },
      { pattern1: /금지|하지 마/i, pattern2: /허용|해도 돼/i }
    ];

    for (const { pattern1, pattern2 } of conflictPatterns) {
      if ((pattern1.test(rule1.content) && pattern2.test(rule2.content)) ||
          (pattern2.test(rule1.content) && pattern1.test(rule2.content))) {
        return {
          rule1: rule1.name,
          rule2: rule2.name,
          type: 'content_conflict',
          description: `"${rule1.displayName}"과 "${rule2.displayName}" 규칙이 서로 상충할 수 있습니다.`
        };
      }
    }

    return null;
  }

  /**
   * 룰 적용 통계
   */
  async getRuleApplicationStats(userId = null, timeRange = '7d') {
    // TODO: 룰 적용 통계 수집 및 분석
    // 현재는 기본 통계만 반환
    const stats = this.ruleService.getRuleStats(userId);
    
    return {
      ...stats,
      applicationsToday: 0, // 추후 구현
      mostUsedRules: [], // 추후 구현
      conflictCount: 0 // 추후 구현
    };
  }

  /**
   * 룰 효과성 분석
   */
  async analyzeRuleEffectiveness(ruleNames, userId = null) {
    // TODO: 룰 효과성 분석 구현
    // A/B 테스트, 사용자 만족도 등을 통한 분석
    return {
      effectivenessScore: 0,
      userSatisfaction: 0,
      adherenceRate: 0,
      suggestions: []
    };
  }

  /**
   * 자동 룰 추천
   */
  async suggestRules(conversationHistory, userId = null) {
    // TODO: 대화 히스토리 분석을 통한 룰 자동 추천
    // 현재는 기본 추천만 제공
    return {
      recommendations: [
        {
          name: 'auto_suggest_korean',
          displayName: '한국어 응답 권장',
          category: 'general',
          content: '사용자가 한국어로 질문할 때는 한국어로 응답해주세요.',
          confidence: 0.8,
          reason: '대화 기록에서 한국어 사용 빈도가 높습니다.'
        }
      ]
    };
  }
}

module.exports = RuleIntegration;