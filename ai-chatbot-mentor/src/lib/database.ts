// lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'chatbot.db');
const SCHEMA_PATH = path.join(process.cwd(), 'database', 'schema.sql');

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
    
    // 외래 키 제약 조건 활성화
    db.pragma('foreign_keys = ON');
    
    // 스키마 초기화
    initializeSchema();
  }
  
  return db;
}

function initializeSchema() {
  if (!db) return;
  
  try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('Database schema initialized successfully');
    
    // 마이그레이션 실행
    runMigrations();
    
    // 기본 데이터 삽입
    const initDataPath = path.join(process.cwd(), 'database', 'init-data.sql');
    if (fs.existsSync(initDataPath)) {
      const initData = fs.readFileSync(initDataPath, 'utf8');
      db.exec(initData);
      console.log('Database initial data inserted successfully');
    }
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

function runMigrations() {
  if (!db) return;
  
  try {
    // file_size 컬럼 추가 마이그레이션
    const migrationPath = path.join(process.cwd(), 'database', 'migration-add-file-size.sql');
    if (fs.existsSync(migrationPath)) {
      // 컬럼이 이미 존재하는지 확인
      const columnsQuery = db.prepare("PRAGMA table_info(documents)");
      const columns = columnsQuery.all() as any[];
      const hasFileSizeColumn = columns.some(col => col.name === 'file_size');
      
      if (!hasFileSizeColumn) {
        console.log('Running migration: Add file_size column to documents table');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        db.exec(migration);
        console.log('Migration completed: file_size column added');
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
    // 마이그레이션 실패는 치명적이지 않으므로 계속 진행
  }
}

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