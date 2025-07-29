/**
 * 룰 설정 관리 서비스
 */

const { getDatabase } = require('../database');

class RuleService {
  constructor() {
    this.db = getDatabase();
    this.initializeDefaultRules();
  }

  /**
   * 기본 룰 카테고리 및 룰 초기화
   */
  initializeDefaultRules() {
    const defaultCategories = [
      {
        name: 'general',
        displayName: '일반 응답 규칙',
        description: '전체 대화에 적용되는 기본 규칙',
        priority: 100
      },
      {
        name: 'safety',
        displayName: '안전 및 윤리 규칙',
        description: '안전하고 윤리적인 응답을 위한 규칙',
        priority: 90
      },
      {
        name: 'format',
        displayName: '응답 형식 규칙',
        description: '응답의 형식과 구조에 관한 규칙',
        priority: 80
      },
      {
        name: 'domain',
        displayName: '도메인별 규칙',
        description: '특정 주제나 분야에 대한 전문적 규칙',
        priority: 70
      },
      {
        name: 'temporary',
        displayName: '임시 규칙',
        description: '일시적으로 적용되는 규칙',
        priority: 60
      }
    ];

    const defaultRules = [
      {
        category: 'general',
        name: 'korean_response',
        displayName: '한국어 응답',
        content: '모든 응답은 한국어로 작성해주세요.',
        isActive: true,
        priority: 100
      },
      {
        category: 'general',
        name: 'helpful_tone',
        displayName: '도움이 되는 톤',
        content: '친근하고 도움이 되는 톤으로 응답해주세요.',
        isActive: true,
        priority: 90
      },
      {
        category: 'safety',
        name: 'no_harmful_content',
        displayName: '유해 콘텐츠 금지',
        content: '폭력적이거나 유해한 내용은 생성하지 마세요.',
        isActive: true,
        priority: 100
      },
      {
        category: 'format',
        name: 'structured_response',
        displayName: '구조화된 응답',
        content: '복잡한 내용은 목록이나 단계별로 구조화하여 응답해주세요.',
        isActive: true,
        priority: 80
      }
    ];

    // 카테고리 초기화 (존재하지 않는 경우만)
    defaultCategories.forEach(category => {
      const existing = this.db.prepare(`
        SELECT id FROM settings 
        WHERE category = 'rule_categories' AND key = ?
      `).get(category.name);

      if (!existing) {
        this.db.prepare(`
          INSERT INTO settings (user_id, category, key, value, created_at, updated_at)
          VALUES (NULL, 'rule_categories', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(category.name, JSON.stringify(category));
      }
    });

    // 기본 룰 초기화 (존재하지 않는 경우만)
    defaultRules.forEach(rule => {
      const existing = this.db.prepare(`
        SELECT id FROM settings 
        WHERE category = 'rules' AND key = ?
      `).get(rule.name);

      if (!existing) {
        this.db.prepare(`
          INSERT INTO settings (user_id, category, key, value, created_at, updated_at)
          VALUES (NULL, 'rules', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(rule.name, JSON.stringify({
          ...rule,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      }
    });
  }

  /**
   * 룰 카테고리 목록 조회
   */
  getRuleCategories() {
    const categories = this.db.prepare(`
      SELECT key, value FROM settings 
      WHERE category = 'rule_categories'
      ORDER BY json_extract(value, '$.priority') DESC
    `).all();

    return categories.map(cat => ({
      name: cat.key,
      ...JSON.parse(cat.value)
    }));
  }

  /**
   * 특정 카테고리의 룰 목록 조회
   */
  getRulesByCategory(categoryName, userId = null) {
    let query = `
      SELECT key, value, is_temporary FROM settings 
      WHERE category = 'rules' 
      AND json_extract(value, '$.category') = ?
    `;
    const params = [categoryName];

    if (userId) {
      query += ` AND (user_id IS NULL OR user_id = ?)`;
      params.push(userId);
    } else {
      query += ` AND user_id IS NULL`;
    }

    query += ` ORDER BY json_extract(value, '$.priority') DESC, key`;

    const rules = this.db.prepare(query).all(...params);

    return rules.map(rule => ({
      name: rule.key,
      isTemporary: Boolean(rule.is_temporary),
      ...JSON.parse(rule.value)
    }));
  }

  /**
   * 모든 활성 룰 조회 (우선순위 순)
   */
  getActiveRules(userId = null) {
    let query = `
      SELECT key, value, is_temporary FROM settings 
      WHERE category = 'rules' 
      AND json_extract(value, '$.isActive') = 1
    `;
    const params = [];

    if (userId) {
      query += ` AND (user_id IS NULL OR user_id = ?)`;
      params.push(userId);
    } else {
      query += ` AND user_id IS NULL`;
    }

    query += ` ORDER BY json_extract(value, '$.priority') DESC, key`;

    const rules = this.db.prepare(query).all(...params);

    return rules.map(rule => ({
      name: rule.key,
      isTemporary: Boolean(rule.is_temporary),
      ...JSON.parse(rule.value)
    }));
  }

  /**
   * 특정 룰 조회
   */
  getRule(ruleName, userId = null) {
    let query = `
      SELECT key, value, is_temporary FROM settings 
      WHERE category = 'rules' AND key = ?
    `;
    const params = [ruleName];

    if (userId) {
      query += ` AND (user_id IS NULL OR user_id = ?)`;
      params.push(userId);
    } else {
      query += ` AND user_id IS NULL`;
    }

    const rule = this.db.prepare(query).get(...params);

    if (!rule) return null;

    return {
      name: rule.key,
      isTemporary: Boolean(rule.is_temporary),
      ...JSON.parse(rule.value)
    };
  }

  /**
   * 새로운 룰 생성
   */
  createRule(ruleData, userId = null) {
    const {
      name,
      displayName,
      category,
      content,
      priority = 50,
      isActive = true,
      isTemporary = false,
      expiresAt = null
    } = ruleData;

    // 입력 검증
    if (!name || !displayName || !category || !content) {
      throw new Error('룰 이름, 표시명, 카테고리, 내용은 필수입니다.');
    }

    // 중복 검사
    const existing = this.getRule(name, userId);
    if (existing) {
      throw new Error('이미 존재하는 룰 이름입니다.');
    }

    // 카테고리 검증
    const categories = this.getRuleCategories();
    if (!categories.find(cat => cat.name === category)) {
      throw new Error('존재하지 않는 카테고리입니다.');
    }

    const ruleValue = {
      name,
      displayName,
      category,
      content,
      priority,
      isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt
    };

    this.db.prepare(`
      INSERT INTO settings (user_id, category, key, value, is_temporary, created_at, updated_at)
      VALUES (?, 'rules', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(userId, name, JSON.stringify(ruleValue), isTemporary ? 1 : 0);

    return this.getRule(name, userId);
  }

  /**
   * 룰 업데이트
   */
  updateRule(ruleName, updateData, userId = null) {
    const existingRule = this.getRule(ruleName, userId);
    if (!existingRule) {
      throw new Error('존재하지 않는 룰입니다.');
    }

    // 카테고리 변경 시 검증
    if (updateData.category && updateData.category !== existingRule.category) {
      const categories = this.getRuleCategories();
      if (!categories.find(cat => cat.name === updateData.category)) {
        throw new Error('존재하지 않는 카테고리입니다.');
      }
    }

    const updatedRule = {
      ...existingRule,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // name 필드 제거 (키로 사용되므로)
    delete updatedRule.name;
    delete updatedRule.isTemporary;

    this.db.prepare(`
      UPDATE settings 
      SET value = ?, is_temporary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE category = 'rules' AND key = ? AND (user_id IS NULL OR user_id = ?)
    `).run(
      JSON.stringify(updatedRule),
      updateData.isTemporary ? 1 : 0,
      ruleName,
      userId
    );

    return this.getRule(ruleName, userId);
  }

  /**
   * 룰 삭제
   */
  deleteRule(ruleName, userId = null) {
    const existingRule = this.getRule(ruleName, userId);
    if (!existingRule) {
      throw new Error('존재하지 않는 룰입니다.');
    }

    const result = this.db.prepare(`
      DELETE FROM settings 
      WHERE category = 'rules' AND key = ? AND (user_id IS NULL OR user_id = ?)
    `).run(ruleName, userId);

    return result.changes > 0;
  }

  /**
   * 룰 활성화/비활성화
   */
  toggleRule(ruleName, isActive, userId = null) {
    return this.updateRule(ruleName, { isActive }, userId);
  }

  /**
   * 임시 룰 생성 (세션별)
   */
  createTemporaryRule(ruleData, userId, expiresInMinutes = 60) {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    
    return this.createRule({
      ...ruleData,
      isTemporary: true,
      expiresAt
    }, userId);
  }

  /**
   * 만료된 임시 룰 정리
   */
  cleanupExpiredRules() {
    const now = new Date().toISOString();
    
    const result = this.db.prepare(`
      DELETE FROM settings 
      WHERE category = 'rules' 
      AND is_temporary = 1
      AND json_extract(value, '$.expiresAt') < ?
    `).run(now);

    return result.changes;
  }

  /**
   * 프롬프트용 룰 텍스트 생성
   */
  generateRulesPrompt(userId = null, categoryFilter = null) {
    let rules = this.getActiveRules(userId);

    // 카테고리 필터 적용
    if (categoryFilter) {
      rules = rules.filter(rule => rule.category === categoryFilter);
    }

    if (rules.length === 0) {
      return '';
    }

    // 카테고리별로 그룹화
    const rulesByCategory = rules.reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push(rule);
      return acc;
    }, {});

    // 카테고리 정보 가져오기
    const categories = this.getRuleCategories();
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat;
      return acc;
    }, {});

    // 프롬프트 생성
    let prompt = '다음 규칙들을 반드시 따라주세요:\n\n';

    Object.entries(rulesByCategory).forEach(([categoryName, categoryRules]) => {
      const category = categoryMap[categoryName];
      if (category) {
        prompt += `## ${category.displayName}\n`;
        if (category.description) {
          prompt += `${category.description}\n\n`;
        }
      }

      categoryRules.forEach((rule, index) => {
        prompt += `${index + 1}. **${rule.displayName}**: ${rule.content}\n`;
      });

      prompt += '\n';
    });

    return prompt.trim();
  }

  /**
   * 룰 통계 조회
   */
  getRuleStats(userId = null) {
    const totalRules = this.db.prepare(`
      SELECT COUNT(*) as count FROM settings 
      WHERE category = 'rules' AND (user_id IS NULL OR user_id = ?)
    `).get(userId).count;

    const activeRules = this.db.prepare(`
      SELECT COUNT(*) as count FROM settings 
      WHERE category = 'rules' 
      AND json_extract(value, '$.isActive') = 1
      AND (user_id IS NULL OR user_id = ?)
    `).get(userId).count;

    const temporaryRules = this.db.prepare(`
      SELECT COUNT(*) as count FROM settings 
      WHERE category = 'rules' 
      AND is_temporary = 1
      AND (user_id IS NULL OR user_id = ?)
    `).get(userId).count;

    const rulesByCategory = this.db.prepare(`
      SELECT 
        json_extract(value, '$.category') as category,
        COUNT(*) as count
      FROM settings 
      WHERE category = 'rules' AND (user_id IS NULL OR user_id = ?)
      GROUP BY json_extract(value, '$.category')
    `).all(userId);

    return {
      totalRules,
      activeRules,
      temporaryRules,
      rulesByCategory: rulesByCategory.reduce((acc, item) => {
        acc[item.category] = item.count;
        return acc;
      }, {})
    };
  }

  /**
   * 룰 검색
   */
  searchRules(searchTerm, userId = null) {
    const query = `
      SELECT key, value, is_temporary FROM settings 
      WHERE category = 'rules' 
      AND (
        key LIKE ? OR 
        json_extract(value, '$.displayName') LIKE ? OR
        json_extract(value, '$.content') LIKE ?
      )
      AND (user_id IS NULL OR user_id = ?)
      ORDER BY json_extract(value, '$.priority') DESC, key
    `;

    const searchPattern = `%${searchTerm}%`;
    const rules = this.db.prepare(query).all(
      searchPattern, searchPattern, searchPattern, userId
    );

    return rules.map(rule => ({
      name: rule.key,
      isTemporary: Boolean(rule.is_temporary),
      ...JSON.parse(rule.value)
    }));
  }
}

module.exports = RuleService;