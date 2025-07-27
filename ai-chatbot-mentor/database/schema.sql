-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  mbti_type TEXT,
  preferences TEXT DEFAULT '{}', -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 대화 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT NULL,
  title TEXT,
  mode TEXT DEFAULT 'chat', -- 'chat', 'document', 'mentor', 'mbti'
  model_used TEXT,
  mentor_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mentor_id) REFERENCES mentors(id)
);

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio'
  metadata TEXT DEFAULT '{}', -- JSON (파일 정보, 아티팩트 등)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- 멘토 테이블
CREATE TABLE IF NOT EXISTS mentors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  personality TEXT DEFAULT '{}', -- JSON
  expertise TEXT DEFAULT '[]', -- JSON array
  mbti_type TEXT,
  system_prompt TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 문서 테이블
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  mentor_id INTEGER,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_path TEXT,
  content TEXT,
  metadata TEXT DEFAULT '{}', -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mentor_id) REFERENCES mentors(id)
);

-- 벡터 임베딩 테이블
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER,
  chunk_text TEXT,
  embedding BLOB, -- 벡터 데이터
  chunk_index INTEGER,
  metadata TEXT DEFAULT '{}', -- JSON
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- 멘토 지식 소스 테이블
CREATE TABLE IF NOT EXISTS mentor_knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER,
  source_type TEXT, -- 'youtube', 'webpage', 'document'
  source_url TEXT,
  title TEXT,
  content TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES mentors(id)
);

-- 아티팩트 테이블
CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  message_id INTEGER,
  type TEXT, -- 'code', 'document', 'chart', 'mermaid'
  title TEXT,
  content TEXT,
  language TEXT, -- 코드 언어
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id);