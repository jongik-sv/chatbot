-- 기본 사용자 생성 (인증 시스템 구현 전까지 임시 사용)
INSERT OR IGNORE INTO users (id, username, email, created_at) 
VALUES (1, 'anonymous', 'anonymous@example.com', CURRENT_TIMESTAMP);