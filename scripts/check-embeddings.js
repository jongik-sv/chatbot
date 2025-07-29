// scripts/check-embeddings.js
const path = require('path');

// better-sqlite3 모듈 경로를 ai-chatbot-mentor에서 찾기
let Database;
try {
  Database = require('../ai-chatbot-mentor/node_modules/better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 모듈을 찾을 수 없습니다:', e.message);
  process.exit(1);
}

const dbPath = path.join(process.cwd(), 'data', 'chatbot.db');
console.log('데이터베이스 경로:', dbPath);

try {
  const db = new Database(dbPath);
  
  // 문서 수 확인
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get();
  console.log(`총 문서 수: ${docCount.count}`);
  
  // 임베딩 수 확인
  const embeddingCount = db.prepare('SELECT COUNT(*) as count FROM embeddings').get();
  console.log(`총 임베딩 수: ${embeddingCount.count}`);
  
  // 문서별 임베딩 수 확인
  const docEmbeddings = db.prepare(`
    SELECT d.id, d.filename, COUNT(e.id) as embedding_count
    FROM documents d
    LEFT JOIN embeddings e ON d.id = e.document_id
    GROUP BY d.id, d.filename
    ORDER BY d.id
  `).all();
  
  console.log('\n문서별 임베딩 상태:');
  docEmbeddings.forEach(doc => {
    console.log(`ID: ${doc.id}, 파일명: ${doc.filename}, 임베딩 수: ${doc.embedding_count}`);
  });
  
  // 최근 메시지 확인
  const recentMessages = db.prepare(`
    SELECT s.id as session_id, s.mode, s.title, m.role, m.content, m.metadata
    FROM chat_sessions s
    LEFT JOIN messages m ON s.id = m.session_id
    WHERE s.mode = 'document'
    ORDER BY s.created_at DESC, m.created_at DESC
    LIMIT 5
  `).all();
  
  console.log('\n최근 문서 기반 세션 메시지:');
  recentMessages.forEach(msg => {
    console.log(`세션 ${msg.session_id} (${msg.mode}): ${msg.role} - ${msg.content?.substring(0, 50)}...`);
    if (msg.metadata) {
      try {
        const metadata = JSON.parse(msg.metadata);
        console.log(`  메타데이터:`, metadata);
      } catch (e) {
        console.log(`  메타데이터 파싱 오류:`, msg.metadata);
      }
    }
  });
  
  db.close();
} catch (error) {
  console.error('데이터베이스 확인 오류:', error);
}