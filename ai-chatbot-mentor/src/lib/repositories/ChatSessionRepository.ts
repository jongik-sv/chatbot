// lib/repositories/ChatSessionRepository.ts
import { BaseRepository } from '../database';
import { ChatSession } from '../../types';

export class ChatSessionRepository extends BaseRepository {
  /**
   * 새로운 채팅 세션 생성
   */
  create(sessionData: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>): ChatSession {
    const stmt = this.prepare(`
      INSERT INTO chat_sessions (user_id, title, mode, model_used, mentor_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      sessionData.userId,
      sessionData.title,
      sessionData.mode,
      sessionData.modelUsed,
      sessionData.mentorId || null
    );

    return this.getById(result.lastInsertRowid as number)!;
  }

  /**
   * ID로 세션 조회
   */
  getById(id: number): ChatSession | null {
    const stmt = this.prepare(`
      SELECT * FROM chat_sessions WHERE id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToSession(row);
  }

  /**
   * 사용자의 모든 세션 조회
   */
  getByUserId(userId: number, limit: number = 50, offset: number = 0): ChatSession[] {
    const stmt = this.prepare(`
      SELECT * FROM chat_sessions 
      WHERE user_id = ? 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, limit, offset) as any[];
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * 세션 업데이트 (제목, 마지막 업데이트 시간 등)
   */
  update(id: number, updates: Partial<Pick<ChatSession, 'title' | 'modelUsed'>>): ChatSession | null {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }

    if (updates.modelUsed !== undefined) {
      updateFields.push('model_used = ?');
      values.push(updates.modelUsed);
    }

    if (updateFields.length === 0) {
      return this.getById(id);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.prepare(`
      UPDATE chat_sessions 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getById(id);
  }

  /**
   * 세션 삭제
   */
  delete(id: number): boolean {
    const stmt = this.prepare(`
      DELETE FROM chat_sessions WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 세션의 마지막 업데이트 시간 갱신
   */
  updateLastActivity(id: number): void {
    const stmt = this.prepare(`
      UPDATE chat_sessions 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    stmt.run(id);
  }

  /**
   * 데이터베이스 행을 ChatSession 객체로 변환
   */
  private mapRowToSession(row: any): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      mode: row.mode as 'chat' | 'document' | 'mentor' | 'mbti',
      modelUsed: row.model_used,
      mentorId: row.mentor_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}