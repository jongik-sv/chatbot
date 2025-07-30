// lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
// const SCHEMA_PATH = path.join(process.cwd(), 'database', 'schema.sql'); // 사용하지 않음

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // 데이터베이스 디렉토리가 없으면 생성
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    
    // WAL 모드 활성화 (성능 향상)
    db.pragma('journal_mode = WAL');
    
    // 외래 키 제약 조건 비활성화 (아티팩트 생성 문제 해결)
    db.pragma('foreign_keys = OFF');
  }
  
  return db;
}

// 스키마 초기화 및 마이그레이션 로직 제거
// 기존 /data/chatbot.db 데이터베이스를 그대로 사용

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// 트랜잭션 헬퍼
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  const txn = database.transaction(fn);
  return txn(database);
}

// 기본 CRUD 헬퍼들
export class BaseRepository {
  protected db: Database.Database;
  
  constructor() {
    this.db = getDatabase();
  }
  
  protected prepare(sql: string) {
    return this.db.prepare(sql);
  }
  
  protected run(sql: string, params?: unknown) {
    return this.db.prepare(sql).run(params);
  }
  
  protected get(sql: string, params?: unknown) {
    return this.db.prepare(sql).get(params);
  }
  
  protected all(sql: string, params?: unknown) {
    return this.db.prepare(sql).all(params);
  }
}