-- artifacts 테이블의 외래키 제약 조건 제거
-- SQLite는 외래키 제약 조건을 직접 제거할 수 없으므로 테이블을 재생성

-- 기존 데이터 백업
CREATE TABLE IF NOT EXISTS artifacts_backup AS SELECT * FROM artifacts;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS artifacts;

-- 외래키 제약 조건 없이 새 테이블 생성
CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  message_id INTEGER,
  type TEXT, -- 'code', 'document', 'chart', 'mermaid'
  title TEXT,
  content TEXT,
  language TEXT, -- 코드 언어
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 백업 데이터 복원
INSERT INTO artifacts (id, session_id, message_id, type, title, content, language, created_at)
SELECT id, session_id, message_id, type, title, content, language, created_at 
FROM artifacts_backup;

-- 백업 테이블 삭제
DROP TABLE IF EXISTS artifacts_backup;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id);