const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/chatbot.db');
const migrationPath = path.join(__dirname, '../database/migration-mentor-improvement.sql');

const db = new sqlite3.Database(dbPath);

// 마이그레이션 SQL 읽기
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// SQL 문을 세미콜론으로 분리
const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

console.log('멘토 개선 시스템 마이그레이션 시작...');

// 각 SQL 문을 순차적으로 실행
let completed = 0;
statements.forEach((statement, index) => {
  db.run(statement.trim(), function(err) {
    if (err) {
      console.error(`Statement ${index + 1} 실행 오류:`, err.message);
      console.error('SQL:', statement.trim());
    } else {
      console.log(`Statement ${index + 1} 실행 완료`);
    }
    
    completed++;
    if (completed === statements.length) {
      console.log('마이그레이션 완료!');
      db.close();
    }
  });
});