const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('인증 시스템 마이그레이션 시작...');

try {
  // 데이터베이스 연결
  const dbPath = path.join(process.cwd(), '..', 'data', 'chatbot.db');
  const db = new Database(dbPath);

  // 마이그레이션 파일 읽기
  const migrationPath = path.join(process.cwd(), 'database', 'migration-add-auth.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // SQL 문 분리 및 실행
  const statements = sql.split(';').filter(stmt => stmt.trim());
  
  statements.forEach((stmt, index) => {
    try {
      if (stmt.trim()) {
        db.exec(stmt.trim());
        console.log(`Statement ${index + 1} 실행 완료: ${stmt.trim().split('\n')[0]}...`);
      }
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log(`Statement ${index + 1} 스킵 (이미 존재): ${error.message}`);
      } else {
        console.log(`Statement ${index + 1} 실행 오류: ${error.message}`);
      }
    }
  });

  // 테이블 확인
  console.log('\n테이블 확인:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });

  // users 테이블 스키마 확인
  console.log('\nusers 테이블 필드:');
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  userColumns.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });

  db.close();
  console.log('\n인증 마이그레이션 완료!');

} catch (error) {
  console.error('마이그레이션 실패:', error);
  process.exit(1);
}