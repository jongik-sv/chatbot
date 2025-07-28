// lib/repositories/MentorRepository.ts
import { BaseRepository } from '../database';
import { Mentor, MentorPersonality } from '../../types';

export interface CreateMentorData {
  userId?: number;
  name: string;
  description: string;
  personality: MentorPersonality;
  expertise: string[];
  mbtiType?: string;
  systemPrompt: string;
  isPublic?: boolean;
}

export interface UpdateMentorData {
  name?: string;
  description?: string;
  personality?: MentorPersonality;
  expertise?: string[];
  mbtiType?: string;
  systemPrompt?: string;
  isPublic?: boolean;
}

export class MentorRepository extends BaseRepository {
  
  // 멘토 생성
  create(data: CreateMentorData): Mentor {
    const stmt = this.prepare(`
      INSERT INTO mentors (
        user_id, name, description, personality, expertise, 
        mbti_type, system_prompt, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.userId || null,
      data.name,
      data.description,
      JSON.stringify(data.personality),
      JSON.stringify(data.expertise),
      data.mbtiType || null,
      data.systemPrompt,
      data.isPublic || false
    );
    
    const mentor = this.findById(result.lastInsertRowid as number);
    if (!mentor) {
      throw new Error('Failed to create mentor');
    }
    
    return mentor;
  }
  
  // ID로 멘토 조회
  findById(id: number): Mentor | null {
    const stmt = this.prepare(`
      SELECT * FROM mentors WHERE id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;
    
    return this.mapRowToMentor(row);
  }
  
  // 사용자별 멘토 목록 조회
  findByUserId(userId: number): Mentor[] {
    const stmt = this.prepare(`
      SELECT * FROM mentors 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.mapRowToMentor(row));
  }
  
  // 공개 멘토 목록 조회
  findPublicMentors(): Mentor[] {
    const stmt = this.prepare(`
      SELECT * FROM mentors 
      WHERE is_public = TRUE 
      ORDER BY created_at DESC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToMentor(row));
  }
  
  // 모든 멘토 조회 (사용자 소유 + 공개)
  findAllAccessible(userId?: number): Mentor[] {
    let query = `
      SELECT * FROM mentors 
      WHERE is_public = TRUE
    `;
    
    const params: any[] = [];
    
    if (userId) {
      query += ` OR user_id = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const stmt = this.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.mapRowToMentor(row));
  }
  
  // 멘토 업데이트
  update(id: number, data: UpdateMentorData): Mentor | null {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    
    if (data.personality !== undefined) {
      updates.push('personality = ?');
      params.push(JSON.stringify(data.personality));
    }
    
    if (data.expertise !== undefined) {
      updates.push('expertise = ?');
      params.push(JSON.stringify(data.expertise));
    }
    
    if (data.mbtiType !== undefined) {
      updates.push('mbti_type = ?');
      params.push(data.mbtiType);
    }
    
    if (data.systemPrompt !== undefined) {
      updates.push('system_prompt = ?');
      params.push(data.systemPrompt);
    }
    
    if (data.isPublic !== undefined) {
      updates.push('is_public = ?');
      params.push(data.isPublic);
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    params.push(id);
    
    const stmt = this.prepare(`
      UPDATE mentors 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.findById(id);
  }
  
  // 멘토 삭제
  delete(id: number): boolean {
    const stmt = this.prepare(`
      DELETE FROM mentors WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }
  
  // 멘토 소유권 확인
  isOwner(mentorId: number, userId: number): boolean {
    const stmt = this.prepare(`
      SELECT 1 FROM mentors 
      WHERE id = ? AND user_id = ?
    `);
    
    return !!stmt.get(mentorId, userId);
  }
  
  // 멘토 접근 권한 확인 (소유자이거나 공개 멘토)
  hasAccess(mentorId: number, userId?: number): boolean {
    let query = `
      SELECT 1 FROM mentors 
      WHERE id = ? AND (is_public = TRUE
    `;
    
    const params: any[] = [mentorId];
    
    if (userId) {
      query += ` OR user_id = ?`;
      params.push(userId);
    }
    
    query += ')';
    
    const stmt = this.prepare(query);
    return !!stmt.get(...params);
  }
  
  // MBTI 타입별 멘토 조회
  getByMBTIType(mbtiType: string): Mentor[] {
    const stmt = this.prepare(`
      SELECT * FROM mentors 
      WHERE mbti_type = ?
      ORDER BY created_at DESC
    `);
    
    const rows = stmt.all(mbtiType) as any[];
    return rows.map(row => this.mapRowToMentor(row));
  }

  // 모든 멘토 조회
  getAll(): Mentor[] {
    const stmt = this.prepare(`
      SELECT * FROM mentors 
      ORDER BY created_at DESC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToMentor(row));
  }

  // 사용자별 멘토 목록 조회 (별명)
  getByUserId(userId: number): Mentor[] {
    return this.findByUserId(userId);
  }

  // 검색
  search(query: string, userId?: number): Mentor[] {
    const searchTerm = `%${query}%`;
    let sql = `
      SELECT * FROM mentors 
      WHERE (name LIKE ? OR description LIKE ?) 
      AND (is_public = TRUE
    `;
    
    const params: any[] = [searchTerm, searchTerm];
    
    if (userId) {
      sql += ` OR user_id = ?`;
      params.push(userId);
    }
    
    sql += ') ORDER BY created_at DESC';
    
    const stmt = this.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.mapRowToMentor(row));
  }
  
  // 데이터베이스 행을 Mentor 객체로 변환
  private mapRowToMentor(row: any): Mentor {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      personality: JSON.parse(row.personality || '{}'),
      expertise: JSON.parse(row.expertise || '[]'),
      mbtiType: row.mbti_type,
      systemPrompt: row.system_prompt,
      isPublic: !!row.is_public,
      createdAt: new Date(row.created_at)
    };
  }
}