/**
 * 채팅 관련 데이터베이스 작업을 담당하는 Repository 클래스
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ChatRepository {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'chatbot.db');
    this.db = null;
    this.initDatabase();
  }

  initDatabase() {
    try {
      // 데이터베이스 디렉토리 확인 및 생성
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath);
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 새로운 채팅 세션 생성
   */
  async createSession(data) {
    const { userId, title, mode, modelUsed, mentorId } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO chat_sessions (user_id, title, mode, model_used, mentor_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, title, mode, modelUsed, mentorId);
    
    return this.getSession(result.lastInsertRowid);
  }

  /**
   * 세션 목록 조회
   */
  async getSessions(options = {}) {
    const { 
      userId, 
      limit = 20, 
      offset = 0, 
      mode,
      search 
    } = options;

    let query = `
      SELECT 
        cs.*,
        m.name as mentor_name,
        u.username
      FROM chat_sessions cs
      LEFT JOIN mentors m ON cs.mentor_id = m.id
      LEFT JOIN users u ON cs.user_id = u.id
      WHERE cs.user_id = ?
    `;

    const params = [userId];

    if (mode) {
      query += ` AND cs.mode = ?`;
      params.push(mode);
    }

    if (search) {
      query += ` AND cs.title LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY cs.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 세션 수 조회
   */
  async getSessionsCount(options = {}) {
    const { userId, mode, search } = options;

    let query = `SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = ?`;
    const params = [userId];

    if (mode) {
      query += ` AND mode = ?`;
      params.push(mode);
    }

    if (search) {
      query += ` AND title LIKE ?`;
      params.push(`%${search}%`);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }

  /**
   * 특정 세션 조회
   */
  async getSession(sessionId) {
    const stmt = this.db.prepare(`
      SELECT 
        cs.*,
        m.name as mentor_name,
        u.username
      FROM chat_sessions cs
      LEFT JOIN mentors m ON cs.mentor_id = m.id
      LEFT JOIN users u ON cs.user_id = u.id
      WHERE cs.id = ?
    `);
    
    return stmt.get(sessionId);
  }

  /**
   * 세션 업데이트
   */
  async updateSession(sessionId, data) {
    const { title } = data;
    
    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(title, sessionId);
    return this.getSession(sessionId);
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId) {
    // 관련 메시지들도 함께 삭제됨 (CASCADE)
    const stmt = this.db.prepare(`DELETE FROM chat_sessions WHERE id = ?`);
    return stmt.run(sessionId);
  }

  /**
   * 세션의 메시지 목록 조회
   */
  async getMessages(sessionId, options = {}) {
    const { 
      limit = 50, 
      offset = 0, 
      before,
      search 
    } = options;

    let query = `
      SELECT * FROM messages 
      WHERE session_id = ?
    `;

    const params = [sessionId];

    if (before) {
      query += ` AND id < ?`;
      params.push(before);
    }

    if (search) {
      query += ` AND content LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 세션의 메시지 수 조회
   */
  async getMessageCount(sessionId, options = {}) {
    const { search } = options;

    let query = `SELECT COUNT(*) as count FROM messages WHERE session_id = ?`;
    const params = [sessionId];

    if (search) {
      query += ` AND content LIKE ?`;
      params.push(`%${search}%`);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }

  /**
   * 세션의 마지막 메시지 조회
   */
  async getLastMessage(sessionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    return stmt.get(sessionId);
  }

  /**
   * 메시지 생성
   */
  async createMessage(data) {
    const { sessionId, role, content, contentType, metadata } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO messages (session_id, role, content, content_type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    const result = stmt.run(sessionId, role, content, contentType || 'text', metadataStr);
    
    // 세션의 updated_at 업데이트
    this.updateSessionTimestamp(sessionId);
    
    return this.getMessage(result.lastInsertRowid);
  }

  /**
   * 특정 메시지 조회
   */
  async getMessage(messageId) {
    const stmt = this.db.prepare(`SELECT * FROM messages WHERE id = ?`);
    return stmt.get(messageId);
  }

  /**
   * 세션 타임스탬프 업데이트
   */
  async updateSessionTimestamp(sessionId) {
    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    return stmt.run(sessionId);
  }

  /**
   * 사용자의 모든 대화 검색
   */
  async searchConversations(userId, searchTerm, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const query = `
      SELECT DISTINCT
        cs.id,
        cs.title,
        cs.mode,
        cs.created_at,
        cs.updated_at,
        m.content as matched_content,
        m.role as matched_role,
        m.created_at as message_created_at
      FROM chat_sessions cs
      INNER JOIN messages m ON cs.id = m.session_id
      WHERE cs.user_id = ? AND m.content LIKE ?
      ORDER BY cs.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(query);
    return stmt.all(userId, `%${searchTerm}%`, limit, offset);
  }

  /**
   * 세션 통계 조회
   */
  async getSessionStats(userId) {
    const queries = {
      totalSessions: `SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = ?`,
      totalMessages: `
        SELECT COUNT(m.id) as count 
        FROM messages m 
        INNER JOIN chat_sessions cs ON m.session_id = cs.id 
        WHERE cs.user_id = ?
      `,
      sessionsByMode: `
        SELECT mode, COUNT(*) as count 
        FROM chat_sessions 
        WHERE user_id = ? 
        GROUP BY mode
      `,
      recentActivity: `
        SELECT DATE(updated_at) as date, COUNT(*) as count
        FROM chat_sessions 
        WHERE user_id = ? AND updated_at >= datetime('now', '-30 days')
        GROUP BY DATE(updated_at)
        ORDER BY date DESC
      `
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const stmt = this.db.prepare(query);
      if (key === 'sessionsByMode' || key === 'recentActivity') {
        results[key] = stmt.all(userId);
      } else {
        const result = stmt.get(userId);
        results[key] = result.count;
      }
    }

    return results;
  }
}

module.exports = ChatRepository;