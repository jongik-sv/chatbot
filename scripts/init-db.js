/**
 * SQLite 데이터베이스 초기화 스크립트
 * AI 멀티모달 멘토 챗봇을 위한 데이터베이스 스키마 생성
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 데이터베이스 디렉토리 생성
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'chatbot.db');

console.log('🚀 데이터베이스 초기화를 시작합니다...');
console.log(`📍 데이터베이스 경로: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 데이터베이스 연결 실패:', err.message);
    process.exit(1);
  }
  console.log('✅ SQLite 데이터베이스에 연결되었습니다.');
});

// 테이블 생성 SQL 문
const createTablesSQL = [
  // 사용자 테이블
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    mbti_type TEXT,
    preferences TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // 대화 세션 테이블
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    mode TEXT, -- 'chat', 'document', 'mentor', 'mbti'
    model_used TEXT,
    mentor_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE SET NULL
  )`,

  // 메시지 테이블
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio'
    metadata TEXT, -- JSON (파일 정보, 아티팩트 등)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
  )`,

  // 멘토 테이블
  `CREATE TABLE IF NOT EXISTS mentors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    personality TEXT, -- JSON
    expertise TEXT, -- JSON
    mbti_type TEXT,
    system_prompt TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // 문서 테이블
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mentor_id INTEGER,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE SET NULL
  )`,

  // 벡터 임베딩 테이블
  `CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding BLOB, -- 벡터 데이터
    chunk_index INTEGER NOT NULL,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  )`,

  // 멘토 지식 소스 테이블
  `CREATE TABLE IF NOT EXISTS mentor_knowledge_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentor_id INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'youtube', 'webpage', 'document'
    source_url TEXT,
    title TEXT,
    content TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE
  )`,

  // 아티팩트 테이블
  `CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'code', 'document', 'chart', 'mermaid'
    title TEXT,
    content TEXT NOT NULL,
    language TEXT, -- 코드 언어
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  )`,

  // 설정 테이블
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT NOT NULL, -- 'rules', 'preferences', 'api_keys'
    key TEXT NOT NULL,
    value TEXT,
    is_temporary BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, category, key)
  )`
];

// 인덱스 생성 SQL 문
const createIndexesSQL = [
  'CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_mentors_is_public ON mentors(is_public)',
  'CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_documents_mentor_id ON documents(mentor_id)',
  'CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id)',
  'CREATE INDEX IF NOT EXISTS idx_mentor_knowledge_sources_mentor_id ON mentor_knowledge_sources(mentor_id)',
  'CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_artifacts_message_id ON artifacts(message_id)',
  'CREATE INDEX IF NOT EXISTS idx_settings_user_category ON settings(user_id, category)'
];

// 기본 데이터 삽입 SQL
const insertDefaultDataSQL = [
  // 기본 시스템 사용자
  `INSERT OR IGNORE INTO users (id, username, email, mbti_type, preferences) 
   VALUES (1, 'system', 'system@chatbot.local', NULL, '{"theme": "light", "language": "ko", "autoSave": true}')`,

  // 기본 MBTI 멘토들
  `INSERT OR IGNORE INTO mentors (id, user_id, name, description, personality, expertise, mbti_type, system_prompt, is_public) VALUES 
   (1, 1, 'INTJ 분석가', 'INTJ 성격 유형의 논리적이고 독립적인 멘토', '{"traits": ["logical", "independent", "strategic"], "communicationStyle": "direct", "teachingApproach": "analytical", "responseStyle": "structured"}', '["strategy", "analysis", "planning"]', 'INTJ', 'You are an INTJ personality type mentor. Be logical, independent, and strategic in your responses. Focus on long-term planning and systematic analysis.', true)`,

  `INSERT OR IGNORE INTO mentors (id, user_id, name, description, personality, expertise, mbti_type, system_prompt, is_public) VALUES 
   (2, 1, 'ENFP 활동가', 'ENFP 성격 유형의 열정적이고 창의적인 멘토', '{"traits": ["enthusiastic", "creative", "empathetic"], "communicationStyle": "warm", "teachingApproach": "inspiring", "responseStyle": "encouraging"}', '["creativity", "communication", "motivation"]', 'ENFP', 'You are an ENFP personality type mentor. Be enthusiastic, creative, and empathetic in your responses. Focus on inspiring and motivating others.', true)`,

  `INSERT OR IGNORE INTO mentors (id, user_id, name, description, personality, expertise, mbti_type, system_prompt, is_public) VALUES 
   (3, 1, 'ISTJ 관리자', 'ISTJ 성격 유형의 체계적이고 신뢰할 수 있는 멘토', '{"traits": ["systematic", "reliable", "practical"], "communicationStyle": "clear", "teachingApproach": "step-by-step", "responseStyle": "detailed"}', '["organization", "planning", "execution"]', 'ISTJ', 'You are an ISTJ personality type mentor. Be systematic, reliable, and practical in your responses. Focus on clear step-by-step guidance.', true)`,

  `INSERT OR IGNORE INTO mentors (id, user_id, name, description, personality, expertise, mbti_type, system_prompt, is_public) VALUES 
   (4, 1, 'ESFP 연예인', 'ESFP 성격 유형의 사교적이고 즐거운 멘토', '{"traits": ["social", "fun", "adaptable"], "communicationStyle": "friendly", "teachingApproach": "interactive", "responseStyle": "engaging"}', '["communication", "motivation", "adaptability"]', 'ESFP', 'You are an ESFP personality type mentor. Be social, fun, and adaptable in your responses. Focus on interactive and engaging communication.', true)`
];

// 데이터베이스 초기화 함수
async function initializeDatabase() {
  try {
    // 테이블 생성
    console.log('📋 테이블을 생성하고 있습니다...');
    for (const sql of createTablesSQL) {
      await new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('✅ 모든 테이블이 성공적으로 생성되었습니다.');

    // 인덱스 생성
    console.log('🔍 인덱스를 생성하고 있습니다...');
    for (const sql of createIndexesSQL) {
      await new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('✅ 모든 인덱스가 성공적으로 생성되었습니다.');

    // 기본 데이터 삽입
    console.log('📥 기본 데이터를 삽입하고 있습니다...');
    for (const sql of insertDefaultDataSQL) {
      await new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('✅ 기본 데이터가 성공적으로 삽입되었습니다.');

    // 테이블 목록 확인
    console.log('📊 생성된 테이블 목록:');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });

    console.log('\n🎉 데이터베이스 초기화가 완료되었습니다!');
    console.log(`📊 총 ${tables.length}개의 테이블이 생성되었습니다.`);
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 중 오류가 발생했습니다:', error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✨ 초기화 완료!');
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 초기화 실패:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { initializeDatabase, dbPath };