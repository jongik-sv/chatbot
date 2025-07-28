const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 경로
const dbPath = path.join(__dirname, '../../data/chatbot.db');

console.log('아티팩트 테이블 스키마 마이그레이션 시작...');
console.log('데이터베이스 경로:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('데이터베이스 연결 실패:', err.message);
    process.exit(1);
  }
  console.log('데이터베이스 연결 성공');
});

// 마이그레이션 실행
db.serialize(() => {
  // 기존 테이블 구조 확인
  db.get("PRAGMA table_info(artifacts)", (err, row) => {
    if (err) {
      console.error('테이블 정보 조회 실패:', err.message);
      return;
    }
  });

  // 새 컬럼들 추가
  const migrations = [
    "ALTER TABLE artifacts ADD COLUMN file_path TEXT;",
    "ALTER TABLE artifacts ADD COLUMN files_info TEXT;", 
    "ALTER TABLE artifacts ADD COLUMN is_project BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE artifacts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;"
  ];

  migrations.forEach((migration, index) => {
    db.run(migration, (err) => {
      if (err) {
        // 컬럼이 이미 존재하는 경우 무시
        if (err.message.includes('duplicate column name')) {
          console.log(`마이그레이션 ${index + 1}: 이미 적용됨 - ${migration}`);
        } else {
          console.error(`마이그레이션 ${index + 1} 실패:`, err.message);
        }
      } else {
        console.log(`마이그레이션 ${index + 1} 성공: ${migration}`);
      }
    });
  });

  // 업데이트된 테이블 구조 확인
  db.all("PRAGMA table_info(artifacts)", (err, rows) => {
    if (err) {
      console.error('테이블 정보 조회 실패:', err.message);
      return;
    }
    
    console.log('\n=== 업데이트된 artifacts 테이블 구조 ===');
    rows.forEach(row => {
      console.log(`${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'} - Default: ${row.dflt_value || 'None'}`);
    });
    
    console.log('\n아티팩트 테이블 스키마 마이그레이션 완료!');
    
    db.close((err) => {
      if (err) {
        console.error('데이터베이스 종료 실패:', err.message);
      } else {
        console.log('데이터베이스 연결 종료');
      }
    });
  });
});