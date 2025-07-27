// lib/repositories/MessageRepository.ts
import { BaseRepository } from '../database';
import { Message, MessageMetadata } from '../../types';

export class MessageRepository extends BaseRepository {
  /**
   * 새로운 메시지 생성
   */
  create(messageData: Omit<Message, 'id' | 'createdAt'>): Message {
    const stmt = this.prepare(`
      INSERT INTO messages (session_id, role, content, content_type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      messageData.sessionId,
      messageData.role,
      messageData.content,
      messageData.contentType,
      JSON.stringify(messageData.metadata || {})
    );

    return this.getById(result.lastInsertRowid as number)!;
  }

  /**
   * ID로 메시지 조회
   */
  getById(id: number): Message | null {
    const stmt = this.prepare(`
      SELECT * FROM messages WHERE id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToMessage(row);
  }

  /**
   * 세션의 모든 메시지 조회
   */
  getBySessionId(sessionId: number, limit: number = 100, offset: number = 0): Message[] {
    const stmt = this.prepare(`
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(sessionId, limit, offset) as any[];
    return rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * 세션의 최근 메시지들 조회 (컨텍스트용)
   */
  getRecentMessages(sessionId: number, count: number = 10): Message[] {
    const stmt = this.prepare(`
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(sessionId, count) as any[];
    return rows.map(row => this.mapRowToMessage(row)).reverse(); // 시간순으로 정렬
  }

  /**
   * 메시지 업데이트 (주로 메타데이터 업데이트용)
   */
  update(id: number, updates: Partial<Pick<Message, 'content' | 'metadata'>>): Message | null {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      updateFields.push('content = ?');
      values.push(updates.content);
    }

    if (updates.metadata !== undefined) {
      updateFields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    const stmt = this.prepare(`
      UPDATE messages 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getById(id);
  }

  /**
   * 메시지 삭제
   */
  delete(id: number): boolean {
    const stmt = this.prepare(`
      DELETE FROM messages WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 세션의 모든 메시지 삭제
   */
  deleteBySessionId(sessionId: number): number {
    const stmt = this.prepare(`
      DELETE FROM messages WHERE session_id = ?
    `);
    
    const result = stmt.run(sessionId);
    return result.changes;
  }

  /**
   * 메시지 검색
   */
  search(query: string, userId?: number, limit: number = 50): Message[] {
    let sql = `
      SELECT m.* FROM messages m
      JOIN chat_sessions cs ON m.session_id = cs.id
      WHERE m.content LIKE ?
    `;
    const params: any[] = [`%${query}%`];

    if (userId) {
      sql += ' AND cs.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * 세션의 메시지 수 조회
   */
  getMessageCount(sessionId: number): number {
    const stmt = this.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE session_id = ?
    `);
    
    const result = stmt.get(sessionId) as any;
    return result.count;
  }

  /**
   * 데이터베이스 행을 Message 객체로 변환
   */
  private mapRowToMessage(row: any): Message {
    let metadata: MessageMetadata | undefined;
    
    try {
      metadata = row.metadata ? JSON.parse(row.metadata) : undefined;
    } catch (error) {
      console.warn('메시지 메타데이터 파싱 실패:', error);
      metadata = undefined;
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      contentType: row.content_type as 'text' | 'image' | 'audio',
      metadata,
      createdAt: new Date(row.created_at)
    };
  }
}