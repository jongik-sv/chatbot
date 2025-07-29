const YouTubeContentExtractor = require('./YouTubeContentExtractor');
const WebsiteContentExtractor = require('./WebsiteContentExtractor');
const path = require('path');
const Database = require('better-sqlite3');

class ExternalContentService {
  constructor() {
    this.youtubeExtractor = new YouTubeContentExtractor();
    this.websiteExtractor = new WebsiteContentExtractor();
    this.db = null;
    this.initDatabase();
  }

  /**
   * 데이터베이스 초기화
   */
  initDatabase() {
    try {
      // ai-chatbot-mentor 디렉토리 내에서 실행되는지 확인
      let dbPath;
      const currentDir = process.cwd();
      console.log('현재 작업 디렉토리:', currentDir);
      
      if (currentDir.includes('ai-chatbot-mentor')) {
        // ai-chatbot-mentor 내에서 실행되는 경우
        dbPath = path.join(currentDir, '..', 'data', 'chatbot.db');
      } else {
        // 프로젝트 루트에서 실행되는 경우
        dbPath = path.join(currentDir, 'data', 'chatbot.db');
      }
      
      console.log('데이터베이스 경로:', dbPath);
      
      // 데이터베이스 디렉토리 확인 및 생성
      const fs = require('fs');
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('데이터베이스 디렉토리 생성:', dbDir);
      }
      
      this.db = new Database(dbPath);
      
      // 외부 콘텐츠 테이블 생성
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS external_contents (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          summary TEXT,
          metadata TEXT,
          custom_gpt_id INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_external_contents_type ON external_contents(type);
        CREATE INDEX IF NOT EXISTS idx_external_contents_url ON external_contents(url);
        CREATE INDEX IF NOT EXISTS idx_external_contents_custom_gpt_id ON external_contents(custom_gpt_id);
        CREATE INDEX IF NOT EXISTS idx_external_contents_created_at ON external_contents(created_at);
      `);

      console.log('외부 콘텐츠 데이터베이스 초기화 완료');
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * URL 타입 감지
   */
  detectContentType(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return 'youtube';
      } else if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        return 'website';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 콘텐츠 추출
   */
  async extractContent(url, options = {}) {
    const contentType = this.detectContentType(url);
    
    if (contentType === 'unknown') {
      throw new Error('지원하지 않는 URL 형식입니다.');
    }

    try {
      let result;
      
      if (contentType === 'youtube') {
        result = await this.youtubeExtractor.extractContent(url);
      } else if (contentType === 'website') {
        result = await this.websiteExtractor.extractContent(url, options);
      }

      // 데이터베이스에 저장
      if (options.saveToDatabase !== false) {
        await this.saveContent(result, options.customGptId);
      }

      return result;
    } catch (error) {
      console.error(`콘텐츠 추출 실패 (${contentType}):`, error);
      throw error;
    }
  }

  /**
   * 콘텐츠를 데이터베이스에 저장
   */
  async saveContent(content, customGptId = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO external_contents 
        (id, type, url, title, content, summary, metadata, custom_gpt_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      
      stmt.run(
        content.id,
        content.type,
        content.url,
        content.title,
        content.content,
        content.summary,
        JSON.stringify(content.metadata),
        customGptId,
        content.createdAt,
        now
      );

      console.log(`콘텐츠 저장 완료: ${content.title}`);
      return content.id;
    } catch (error) {
      console.error('콘텐츠 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 저장된 콘텐츠 검색
   */
  searchContents(query, options = {}) {
    try {
      const {
        contentType,
        customGptId,
        limit = 50,
        offset = 0
      } = options;

      let sql = `
        SELECT id, type, url, title, summary, metadata, created_at, updated_at
        FROM external_contents
        WHERE 1=1
      `;
      const params = [];

      // 텍스트 검색
      if (query && query.trim()) {
        sql += ` AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)`;
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // 타입 필터
      if (contentType && contentType !== 'all') {
        sql += ` AND type = ?`;
        params.push(contentType);
      }

      // 커스텀 GPT 필터
      if (customGptId) {
        sql += ` AND custom_gpt_id = ?`;
        params.push(customGptId);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params);

      // 메타데이터 파싱
      const parsedResults = results.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      }));

      return {
        results: parsedResults,
        total: this.getContentCount(query, { contentType, customGptId })
      };
    } catch (error) {
      console.error('콘텐츠 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 콘텐츠 총 개수 조회
   */
  getContentCount(query, options = {}) {
    try {
      const { contentType, customGptId } = options;

      let sql = `SELECT COUNT(*) as count FROM external_contents WHERE 1=1`;
      const params = [];

      if (query && query.trim()) {
        sql += ` AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)`;
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (contentType && contentType !== 'all') {
        sql += ` AND type = ?`;
        params.push(contentType);
      }

      if (customGptId) {
        sql += ` AND custom_gpt_id = ?`;
        params.push(customGptId);
      }

      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params);
      
      return result.count || 0;
    } catch (error) {
      console.error('콘텐츠 개수 조회 실패:', error);
      return 0;
    }
  }

  /**
   * 콘텐츠 상세 조회
   */
  getContent(contentId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM external_contents WHERE id = ?
      `);
      
      const result = stmt.get(contentId);
      
      if (result) {
        result.metadata = JSON.parse(result.metadata || '{}');
      }
      
      return result;
    } catch (error) {
      console.error('콘텐츠 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 콘텐츠 삭제
   */
  deleteContent(contentId) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM external_contents WHERE id = ?
      `);
      
      const result = stmt.run(contentId);
      
      return result.changes > 0;
    } catch (error) {
      console.error('콘텐츠 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 콘텐츠 목록 조회 (최신순)
   */
  getAllContents(options = {}) {
    try {
      const {
        contentType,
        customGptId,
        limit = 100,
        offset = 0
      } = options;

      let sql = `
        SELECT id, type, url, title, summary, metadata, created_at, updated_at
        FROM external_contents
        WHERE 1=1
      `;
      const params = [];

      if (contentType && contentType !== 'all') {
        sql += ` AND type = ?`;
        params.push(contentType);
      }

      if (customGptId) {
        sql += ` AND custom_gpt_id = ?`;
        params.push(customGptId);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params);

      // 메타데이터 파싱
      const parsedResults = results.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      }));

      return parsedResults;
    } catch (error) {
      console.error('콘텐츠 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    try {
      await this.youtubeExtractor.cleanup();
      await this.websiteExtractor.cleanup();
      
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      console.log('외부 콘텐츠 서비스 리소스 정리 완료');
    } catch (error) {
      console.error('리소스 정리 실패:', error);
    }
  }
}

// 싱글톤 인스턴스
let instance = null;

/**
 * 싱글톤 인스턴스 반환
 */
function getInstance() {
  if (!instance) {
    instance = new ExternalContentService();
  }
  return instance;
}

module.exports = {
  ExternalContentService,
  getInstance
};