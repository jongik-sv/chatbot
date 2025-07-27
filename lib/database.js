/**
 * 데이터베이스 연결 및 관리 유틸리티
 * SQLite 데이터베이스와의 연결을 관리하고 기본 CRUD 작업을 제공
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'chatbot.db');
  }

  /**
   * 데이터베이스 연결
   */
  async connect() {
    if (this.isConnected && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      // 데이터베이스 디렉토리 확인 및 생성
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('데이터베이스 연결 실패:', err.message);
          reject(err);
        } else {
          console.log('SQLite 데이터베이스에 연결되었습니다.');
          this.isConnected = true;
          
          // WAL 모드 활성화 (성능 향상)
          this.db.run('PRAGMA journal_mode=WAL;');
          // Foreign key 제약 조건 활성화
          this.db.run('PRAGMA foreign_keys=ON;');
          
          resolve(this.db);
        }
      });
    });
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close() {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('데이터베이스 연결 종료 실패:', err.message);
          reject(err);
        } else {
          console.log('데이터베이스 연결이 종료되었습니다.');
          this.isConnected = false;
          this.db = null;
          resolve();
        }
      });
    });
  }

  /**
   * SQL 쿼리 실행 (SELECT)
   */
  async get(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('쿼리 실행 실패:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * SQL 쿼리 실행 (SELECT ALL)
   */
  async all(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('쿼리 실행 실패:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * SQL 쿼리 실행 (INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('쿼리 실행 실패:', err.message);
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * 트랜잭션 실행
   */
  async transaction(operations) {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          const results = [];
          for (const operation of operations) {
            const result = await this.run(operation.sql, operation.params);
            results.push(result);
          }
          
          this.db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  // ===== 사용자 관련 메서드 =====

  /**
   * 사용자 생성
   */
  async createUser(userData) {
    const { username, email, mbtiType, preferences } = userData;
    const sql = `
      INSERT INTO users (username, email, mbti_type, preferences)
      VALUES (?, ?, ?, ?)
    `;
    return await this.run(sql, [username, email, mbtiType, JSON.stringify(preferences || {})]);
  }

  /**
   * 사용자 조회
   */
  async getUser(userId) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const user = await this.get(sql, [userId]);
    if (user && user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }
    return user;
  }

  /**
   * 사용자명으로 사용자 조회
   */
  async getUserByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const user = await this.get(sql, [username]);
    if (user && user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }
    return user;
  }

  // ===== 채팅 세션 관련 메서드 =====

  /**
   * 채팅 세션 생성
   */
  async createChatSession(sessionData) {
    const { userId, title, mode, modelUsed, mentorId } = sessionData;
    const sql = `
      INSERT INTO chat_sessions (user_id, title, mode, model_used, mentor_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [userId, title, mode, modelUsed, mentorId]);
  }

  /**
   * 사용자의 채팅 세션 목록 조회
   */
  async getUserChatSessions(userId, limit = 50) {
    const sql = `
      SELECT cs.*, m.name as mentor_name
      FROM chat_sessions cs
      LEFT JOIN mentors m ON cs.mentor_id = m.id
      WHERE cs.user_id = ?
      ORDER BY cs.updated_at DESC
      LIMIT ?
    `;
    return await this.all(sql, [userId, limit]);
  }

  /**
   * 채팅 세션 업데이트
   */
  async updateChatSession(sessionId, updates) {
    const { title, modelUsed, mentorId } = updates;
    const sql = `
      UPDATE chat_sessions 
      SET title = COALESCE(?, title),
          model_used = COALESCE(?, model_used),
          mentor_id = COALESCE(?, mentor_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.run(sql, [title, modelUsed, mentorId, sessionId]);
  }

  // ===== 메시지 관련 메서드 =====

  /**
   * 메시지 생성
   */
  async createMessage(messageData) {
    const { sessionId, role, content, contentType, metadata } = messageData;
    const sql = `
      INSERT INTO messages (session_id, role, content, content_type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [
      sessionId, 
      role, 
      content, 
      contentType || 'text', 
      metadata ? JSON.stringify(metadata) : null
    ]);
  }

  /**
   * 세션의 메시지 목록 조회
   */
  async getSessionMessages(sessionId, limit = 100) {
    const sql = `
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC
      LIMIT ?
    `;
    const messages = await this.all(sql, [sessionId, limit]);
    return messages.map(msg => {
      if (msg.metadata) {
        msg.metadata = JSON.parse(msg.metadata);
      }
      return msg;
    });
  }

  // ===== 멘토 관련 메서드 =====

  /**
   * 멘토 생성
   */
  async createMentor(mentorData) {
    const { 
      userId, name, description, personality, 
      expertise, mbtiType, systemPrompt, isPublic 
    } = mentorData;
    
    const sql = `
      INSERT INTO mentors (
        user_id, name, description, personality, 
        expertise, mbti_type, system_prompt, is_public
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    return await this.run(sql, [
      userId, name, description,
      JSON.stringify(personality || {}),
      JSON.stringify(expertise || []),
      mbtiType, systemPrompt, isPublic || false
    ]);
  }

  /**
   * 멘토 조회
   */
  async getMentor(mentorId) {
    const sql = 'SELECT * FROM mentors WHERE id = ?';
    const mentor = await this.get(sql, [mentorId]);
    if (mentor) {
      if (mentor.personality) mentor.personality = JSON.parse(mentor.personality);
      if (mentor.expertise) mentor.expertise = JSON.parse(mentor.expertise);
    }
    return mentor;
  }

  /**
   * 사용자의 멘토 목록 조회
   */
  async getUserMentors(userId) {
    const sql = `
      SELECT * FROM mentors 
      WHERE user_id = ? OR is_public = 1
      ORDER BY created_at DESC
    `;
    const mentors = await this.all(sql, [userId]);
    return mentors.map(mentor => {
      if (mentor.personality) mentor.personality = JSON.parse(mentor.personality);
      if (mentor.expertise) mentor.expertise = JSON.parse(mentor.expertise);
      return mentor;
    });
  }

  /**
   * MBTI 타입별 멘토 조회
   */
  async getMentorsByMBTI(mbtiType) {
    const sql = 'SELECT * FROM mentors WHERE mbti_type = ? AND is_public = 1';
    const mentors = await this.all(sql, [mbtiType]);
    return mentors.map(mentor => {
      if (mentor.personality) mentor.personality = JSON.parse(mentor.personality);
      if (mentor.expertise) mentor.expertise = JSON.parse(mentor.expertise);
      return mentor;
    });
  }

  // ===== 문서 관련 메서드 =====

  /**
   * 문서 생성
   */
  async createDocument(documentData) {
    const { userId, mentorId, filename, fileType, filePath, content, metadata } = documentData;
    const sql = `
      INSERT INTO documents (user_id, mentor_id, filename, file_type, file_path, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [
      userId, mentorId, filename, fileType, filePath, content,
      metadata ? JSON.stringify(metadata) : null
    ]);
  }

  /**
   * 사용자의 문서 목록 조회
   */
  async getUserDocuments(userId) {
    const sql = 'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC';
    const documents = await this.all(sql, [userId]);
    return documents.map(doc => {
      if (doc.metadata) doc.metadata = JSON.parse(doc.metadata);
      return doc;
    });
  }

  // ===== 설정 관련 메서드 =====

  /**
   * 설정 저장
   */
  async setSetting(userId, category, key, value, isTemporary = false) {
    const sql = `
      INSERT OR REPLACE INTO settings (user_id, category, key, value, is_temporary, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    return await this.run(sql, [userId, category, key, value, isTemporary]);
  }

  /**
   * 설정 조회
   */
  async getSetting(userId, category, key) {
    const sql = 'SELECT value FROM settings WHERE user_id = ? AND category = ? AND key = ?';
    const result = await this.get(sql, [userId, category, key]);
    return result ? result.value : null;
  }

  /**
   * 카테고리별 설정 조회
   */
  async getSettingsByCategory(userId, category) {
    const sql = 'SELECT key, value, is_temporary FROM settings WHERE user_id = ? AND category = ?';
    const settings = await this.all(sql, [userId, category]);
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = {
        value: setting.value,
        isTemporary: setting.is_temporary
      };
    });
    return result;
  }

  // ===== 헬스 체크 =====

  /**
   * 데이터베이스 상태 확인
   */
  async healthCheck() {
    try {
      await this.get('SELECT 1 as status');
      return { status: 'healthy', connected: this.isConnected };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// 싱글톤 인스턴스 생성
const database = new Database();

// 프로세스 종료 시 데이터베이스 연결 종료
process.on('SIGINT', async () => {
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await database.close();
  process.exit(0);
});

module.exports = database;