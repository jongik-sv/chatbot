-- 멘토 피드백 테이블
CREATE TABLE IF NOT EXISTS mentor_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'unhelpful', 'inappropriate', 'inaccurate', 'excellent')),
  comment TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES mentors(id),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- 멘토 개선 로그 테이블
CREATE TABLE IF NOT EXISTS mentor_improvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('personality', 'knowledge', 'communication', 'accuracy')),
  suggestion TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  implementation_hint TEXT,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES mentors(id)
);

-- 멘토 테이블에 개선 관련 컬럼 추가
ALTER TABLE mentors ADD COLUMN last_improvement DATETIME;
ALTER TABLE mentors ADD COLUMN improvement_count INTEGER DEFAULT 0;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_id ON mentor_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_session_id ON mentor_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_timestamp ON mentor_feedback(timestamp);
CREATE INDEX IF NOT EXISTS idx_mentor_improvements_mentor_id ON mentor_improvements(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_improvements_applied_at ON mentor_improvements(applied_at);