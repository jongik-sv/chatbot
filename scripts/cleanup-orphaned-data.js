// scripts/cleanup-orphaned-data.js
const path = require('path');
const fs = require('fs');

// better-sqlite3 모듈 경로를 ai-chatbot-mentor에서 찾기
let Database;
try {
  Database = require('../ai-chatbot-mentor/node_modules/better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 모듈을 찾을 수 없습니다:', e.message);
  process.exit(1);
}

const dbPath = path.join(process.cwd(), 'data', 'chatbot.db');
const uploadsPath = path.join(process.cwd(), 'ai-chatbot-mentor', 'data', 'uploads');

console.log('데이터베이스 경로:', dbPath);
console.log('업로드 폴더 경로:', uploadsPath);

try {
  const db = new Database(dbPath);
  
  // 1. 고아 임베딩 삭제 (참조하는 문서가 없는 임베딩)
  console.log('\n=== 고아 임베딩 정리 ===');
  
  const orphanedEmbeddings = db.prepare(`
    SELECT e.id, e.document_id
    FROM embeddings e
    LEFT JOIN documents d ON e.document_id = d.id
    WHERE d.id IS NULL
  `).all();
  
  console.log(`고아 임베딩 발견: ${orphanedEmbeddings.length}개`);
  
  if (orphanedEmbeddings.length > 0) {
    const deleteOrphanedEmbeddings = db.prepare(`
      DELETE FROM embeddings 
      WHERE document_id NOT IN (SELECT id FROM documents)
    `);
    
    const result = deleteOrphanedEmbeddings.run();
    console.log(`고아 임베딩 삭제 완료: ${result.changes}개`);
  }
  
  // 2. 업로드 폴더의 고아 파일 정리
  console.log('\n=== 고아 파일 정리 ===');
  
  if (fs.existsSync(uploadsPath)) {
    const files = fs.readdirSync(uploadsPath);
    console.log(`업로드 폴더의 파일 수: ${files.length}개`);
    
    // 데이터베이스에 등록된 파일 경로들 조회
    const registeredFiles = db.prepare(`
      SELECT file_path FROM documents WHERE file_path IS NOT NULL
    `).all();
    
    const registeredFilePaths = new Set(
      registeredFiles.map(doc => {
        const filePath = doc.file_path;
        return path.basename(filePath); // 파일명만 추출
      })
    );
    
    console.log(`데이터베이스에 등록된 파일: ${registeredFilePaths.size}개`);
    
    // 고아 파일들 삭제
    let deletedCount = 0;
    for (const file of files) {
      if (!registeredFilePaths.has(file)) {
        const filePath = path.join(uploadsPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`고아 파일 삭제: ${file}`);
          deletedCount++;
        } catch (error) {
          console.error(`파일 삭제 실패 (${file}):`, error.message);
        }
      } else {
        console.log(`유효한 파일 유지: ${file}`);
      }
    }
    
    console.log(`총 ${deletedCount}개의 고아 파일 삭제 완료`);
  } else {
    console.log('업로드 폴더가 존재하지 않습니다.');
  }
  
  // 3. 정리 후 상태 확인
  console.log('\n=== 정리 후 상태 ===');
  
  const finalDocCount = db.prepare('SELECT COUNT(*) as count FROM documents').get();
  const finalEmbeddingCount = db.prepare('SELECT COUNT(*) as count FROM embeddings').get();
  
  console.log(`최종 문서 수: ${finalDocCount.count}`);
  console.log(`최종 임베딩 수: ${finalEmbeddingCount.count}`);
  
  if (fs.existsSync(uploadsPath)) {
    const finalFiles = fs.readdirSync(uploadsPath);
    console.log(`최종 업로드 파일 수: ${finalFiles.length}`);
  }
  
  db.close();
  console.log('\n정리 작업 완료!');
  
} catch (error) {
  console.error('정리 작업 오류:', error);
}