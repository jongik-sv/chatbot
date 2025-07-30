/**
 * 프로젝트 기능 추가를 위한 데이터베이스 마이그레이션 스크립트
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'chatbot.db');

console.log('🚀 프로젝트 마이그레이션을 시작합니다...');
console.log(`📍 데이터베이스 경로: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 데이터베이스 연결 실패:', err.message);
    process.exit(1);
  }
  console.log('✅ SQLite 데이터베이스에 연결되었습니다.');
});

// 마이그레이션 SQL 문
const migrationSQL = [
  // 프로젝트 테이블 생성
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // documents 테이블에 project_id 컬럼 추가 (이미 있다면 무시)
  `ALTER TABLE documents ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`,

  // 인덱스 생성
  `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id)`,

  // 기본 프로젝트들 삽입
  `INSERT OR IGNORE INTO projects (id, user_id, name, description) VALUES 
   (1, 1, '기본 프로젝트', '분류되지 않은 콘텐츠들')`,

  `INSERT OR IGNORE INTO projects (id, user_id, name, description) VALUES 
   (2, 1, '웹 개발', '웹 개발 관련 문서들')`,

  `INSERT OR IGNORE INTO projects (id, user_id, name, description) VALUES 
   (3, 1, 'AI/ML', '인공지능 및 머신러닝 자료')`,

  // 기존 문서들을 기본 프로젝트에 할당
  `UPDATE documents SET project_id = 1 WHERE project_id IS NULL`
];

// 마이그레이션 실행 함수
async function runMigration() {
  try {
    console.log('📋 마이그레이션을 실행하고 있습니다...');
    
    for (const sql of migrationSQL) {
      await new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) {
            // project_id 컬럼이 이미 존재하는 경우 무시
            if (err.message.includes('duplicate column name')) {
              console.log('⚠️  project_id 컬럼이 이미 존재합니다.');
              resolve();
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        });
      });
    }
    
    console.log('✅ 모든 마이그레이션이 성공적으로 완료되었습니다.');

    // 테이블 목록 확인
    console.log('📊 현재 테이블 목록:');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });

    // 프로젝트 수 확인
    const projectCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM projects", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`\n🎉 마이그레이션이 완료되었습니다!`);
    console.log(`📊 현재 프로젝트 수: ${projectCount}개`);
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류가 발생했습니다:', error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✨ 마이그레이션 완료!');
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 마이그레이션 실패:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { runMigration };