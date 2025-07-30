// scripts/regenerate-embeddings.js
// 기존 임베딩을 새로운 한국어 지원 모델로 재생성

const Database = require('better-sqlite3');
const path = require('path');

async function regenerateEmbeddings() {
  console.log('임베딩 재생성 시작...');
  
  try {
    // 데이터베이스 연결
    const dbPath = path.join(__dirname, '..', 'data', 'chatbot.db');
    const db = new Database(dbPath);
    
    console.log(`데이터베이스 연결: ${dbPath}`);
    
    // 기존 임베딩 정보 조회
    const existingEmbeddings = db.prepare(`
      SELECT COUNT(*) as count, 
             COUNT(DISTINCT document_id) as documents
      FROM embeddings
    `).get();
    
    console.log(`기존 임베딩: ${existingEmbeddings.count}개 (${existingEmbeddings.documents}개 문서)`);
    
    if (existingEmbeddings.count === 0) {
      console.log('재생성할 임베딩이 없습니다.');
      return;
    }
    
    // 사용자 확인
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`기존 임베딩 ${existingEmbeddings.count}개를 모두 삭제하고 재생성하시겠습니까? (y/N): `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('작업이 취소되었습니다.');
      return;
    }
    
    // 기존 임베딩 삭제
    console.log('기존 임베딩 삭제 중...');
    const deleteResult = db.prepare('DELETE FROM embeddings').run();
    console.log(`${deleteResult.changes}개 임베딩 삭제 완료`);
    
    // 문서 목록 조회
    const documents = db.prepare(`
      SELECT id, filename, content 
      FROM documents 
      WHERE content IS NOT NULL AND content != ''
      ORDER BY id
    `).all();
    
    console.log(`${documents.length}개 문서의 임베딩을 재생성합니다...`);
    
    // EmbeddingService 동적 로드 (TypeScript)
    const { EmbeddingService } = require('../ai-chatbot-mentor/src/services/EmbeddingService.ts');
    const embeddingService = EmbeddingService.getInstance();
    
    // VectorSearchService 동적 로드 (TypeScript)
    const { VectorSearchService } = require('../ai-chatbot-mentor/src/services/VectorSearchService.ts');
    const vectorSearchService = VectorSearchService.getInstance();
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const doc of documents) {
      try {
        console.log(`처리 중: ${doc.filename} (ID: ${doc.id})`);
        
        // 문서 임베딩 생성 및 저장
        await vectorSearchService.processAndStoreDocument(
          doc.id,
          doc.content,
          'character', // 문자 기반 청킹
          1000        // 청크 크기
        );
        
        processedCount++;
        console.log(`완료: ${doc.filename} (${processedCount}/${documents.length})`);
        
        // 메모리 정리를 위한 잠시 대기
        if (processedCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`실패: ${doc.filename} - ${error.message}`);
        errorCount++;
      }
    }
    
    // 최종 통계
    const finalStats = db.prepare(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT document_id) as documents,
             AVG(LENGTH(embedding)) as avg_size
      FROM embeddings
    `).get();
    
    console.log('\n=== 임베딩 재생성 완료 ===');
    console.log(`성공: ${processedCount}개 문서`);
    console.log(`실패: ${errorCount}개 문서`);
    console.log(`새로운 임베딩: ${finalStats.total}개`);
    console.log(`평균 임베딩 크기: ${Math.round(finalStats.avg_size)}bytes`);
    
    db.close();
    
  } catch (error) {
    console.error('임베딩 재생성 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  regenerateEmbeddings().catch(console.error);
}

module.exports = { regenerateEmbeddings };