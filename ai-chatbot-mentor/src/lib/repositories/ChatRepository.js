/**
 * 채팅 관련 데이터베이스 작업을 담당하는 Repository 클래스
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

class ChatRepository {
  constructor() {
    // 통일된 데이터베이스 경로 사용 (절대 경로로 수정)
    this.dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "..", "data", "chatbot.db");
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

      this.db = new Database(this.dbPath);
    } catch (error) {
      console.error("데이터베이스 초기화 실패:", error);
      throw error;
    }
  }

  /**
   * 현재 한국 시간을 ISO 문자열로 반환
   */
  getCurrentKoreanTimeISO() {
    const now = new Date();
    const koreanOffset = 9 * 60; // 한국은 UTC+9 (분 단위)
    const localOffset = now.getTimezoneOffset(); // 현재 시스템의 UTC 오프셋 (분 단위, 음수)
    const offsetDiff = koreanOffset + localOffset; // 한국 시간과의 차이 (분 단위)

    const koreanTime = new Date(now.getTime() + offsetDiff * 60 * 1000);
    return koreanTime.toISOString();
  }

  /**
   * 새로운 채팅 세션 생성
   */
  createSession(data) {
    const { userId, title, mode, modelUsed, mentorId } = data;

    const stmt = this.db.prepare(`
      INSERT INTO chat_sessions (user_id, title, mode, model_used, mentor_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const koreanTime = this.getCurrentKoreanTimeISO();
    const result = stmt.run(
      userId,
      title,
      mode,
      modelUsed,
      mentorId,
      koreanTime,
      koreanTime
    );

    return this.getSession(result.lastInsertRowid);
  }

  /**
   * 세션 목록 조회
   */
  getSessions(options = {}) {
    const { userId, limit = 20, offset = 0, mode, search } = options;

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
  getSessionsCount(options = {}) {
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
  getSession(sessionId) {
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
  updateSession(sessionId, data) {
    const { title, modelUsed } = data;

    let query = `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP`;
    const params = [];

    if (title !== undefined) {
      query += `, title = ?`;
      params.push(title);
    }

    if (modelUsed !== undefined) {
      query += `, model_used = ?`;
      params.push(modelUsed);
    }

    query += ` WHERE id = ?`;
    params.push(sessionId);

    const stmt = this.db.prepare(query);
    stmt.run(...params);
    return this.getSession(sessionId);
  }

  /**
   * 세션 삭제
   */
  deleteSession(sessionId) {
    // 트랜잭션으로 안전하게 삭제
    const deleteTransaction = this.db.transaction((sessionId) => {
      // 1. 관련 아티팩트들 삭제
      const deleteArtifacts = this.db.prepare(`DELETE FROM artifacts WHERE session_id = ?`);
      const artifactsDeleted = deleteArtifacts.run(sessionId);
      console.log(`세션 ${sessionId}의 아티팩트 ${artifactsDeleted.changes}개 삭제됨`);

      // 2. 관련 메시지들 삭제
      const deleteMessages = this.db.prepare(`DELETE FROM messages WHERE session_id = ?`);
      const messagesDeleted = deleteMessages.run(sessionId);
      console.log(`세션 ${sessionId}의 메시지 ${messagesDeleted.changes}개 삭제됨`);

      // 3. 세션 삭제
      const deleteSession = this.db.prepare(`DELETE FROM chat_sessions WHERE id = ?`);
      return deleteSession.run(sessionId);
    });

    return deleteTransaction(sessionId);
  }

  /**
   * 사용자의 모든 세션 삭제
   */
  deleteAllSessions(userId) {
    // 트랜잭션으로 안전하게 삭제
    const deleteAllTransaction = this.db.transaction((userId) => {
      // 먼저 해당 사용자의 모든 세션 ID 조회
      const sessionIds = this.db.prepare(`SELECT id FROM chat_sessions WHERE user_id = ?`).all(userId);

      if (sessionIds.length === 0) {
        return { changes: 0 };
      }

      let totalArtifactsDeleted = 0;
      let totalMessagesDeleted = 0;

      // 각 세션의 아티팩트와 메시지들 삭제
      const deleteArtifacts = this.db.prepare(`DELETE FROM artifacts WHERE session_id = ?`);
      const deleteMessages = this.db.prepare(`DELETE FROM messages WHERE session_id = ?`);

      sessionIds.forEach(session => {
        const artifactsDeleted = deleteArtifacts.run(session.id);
        const messagesDeleted = deleteMessages.run(session.id);
        totalArtifactsDeleted += artifactsDeleted.changes;
        totalMessagesDeleted += messagesDeleted.changes;
      });

      console.log(`사용자 ${userId}의 아티팩트 ${totalArtifactsDeleted}개, 메시지 ${totalMessagesDeleted}개 삭제됨`);

      // 모든 세션 삭제
      const deleteSessions = this.db.prepare(`DELETE FROM chat_sessions WHERE user_id = ?`);
      return deleteSessions.run(userId);
    });

    return deleteAllTransaction(userId);
  }

  /**
   * 세션의 메시지 목록 조회
   */
  getMessages(sessionId, options = {}) {
    const { limit = 50, offset = 0, before, search } = options;

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
  getMessageCount(sessionId, options = {}) {
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
  getLastMessage(sessionId) {
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
  createMessage(data) {
    const { sessionId, role, content, contentType, metadata } = data;

    const stmt = this.db.prepare(`
      INSERT INTO messages (session_id, role, content, content_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    const koreanTime = this.getCurrentKoreanTimeISO();
    const result = stmt.run(
      sessionId,
      role,
      content,
      contentType || "text",
      metadataStr,
      koreanTime
    );

    // 세션의 updated_at 업데이트
    this.updateSessionTimestamp(sessionId);

    return this.getMessage(result.lastInsertRowid);
  }

  /**
   * 특정 메시지 조회
   */
  getMessage(messageId) {
    const stmt = this.db.prepare(`SELECT * FROM messages WHERE id = ?`);
    return stmt.get(messageId);
  }

  /**
   * 세션 타임스탬프 업데이트
   */
  updateSessionTimestamp(sessionId) {
    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET updated_at = ? 
      WHERE id = ?
    `);

    const koreanTime = this.getCurrentKoreanTimeISO();
    return stmt.run(koreanTime, sessionId);
  }

  /**
   * 사용자의 모든 대화 검색
   */
  searchConversations(userId, searchTerm, options = {}) {
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
  getSessionStats(userId) {
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
      `,
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      const stmt = this.db.prepare(query);
      if (key === "sessionsByMode" || key === "recentActivity") {
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
