import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

interface Project {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectWithCount extends Project {
  contentCount: number;
}

export async function GET(request: NextRequest) {
  try {
    console.log('프로젝트 목록 조회 시작');
    
    const dbPath = process.env.DATABASE_PATH 
      ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
      : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
    const db = new Database(dbPath);
    
    // 프로젝트 목록과 각 프로젝트의 문서 수를 조회
    const query = `
      SELECT 
        p.*,
        COUNT(d.id) as contentCount
      FROM projects p
      LEFT JOIN documents d ON p.id = d.project_id
      GROUP BY p.id
      ORDER BY p.created_at ASC
    `;
    
    const projects = db.prepare(query).all() as ProjectWithCount[];
    
    db.close();
    
    console.log(`프로젝트 목록 조회 완료: ${projects.length}개`);
    
    return NextResponse.json({
      success: true,
      data: projects
    });
    
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '프로젝트 목록 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('프로젝트 생성 시작');
    
    const body = await request.json();
    const { name, description } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: '프로젝트 이름은 필수입니다.' 
        },
        { status: 400 }
      );
    }
    
    const dbPath = process.env.DATABASE_PATH 
      ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
      : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
    const db = new Database(dbPath);
    
    // 프로젝트 생성
    const insertQuery = `
      INSERT INTO projects (user_id, name, description)
      VALUES (?, ?, ?)
    `;
    
    const result = db.prepare(insertQuery).run(1, name.trim(), description?.trim() || null);
    
    // 생성된 프로젝트 조회
    const selectQuery = `
      SELECT 
        p.*,
        0 as contentCount
      FROM projects p
      WHERE p.id = ?
    `;
    
    const newProject = db.prepare(selectQuery).get(result.lastInsertRowid) as ProjectWithCount;
    
    db.close();
    
    console.log('프로젝트 생성 완료:', newProject.name);
    
    return NextResponse.json({
      success: true,
      data: newProject
    }, { status: 201 });
    
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '프로젝트 생성 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('프로젝트 수정 시작');
    
    const body = await request.json();
    const { id, name, description } = body;
    
    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: '프로젝트 ID와 이름은 필수입니다.' 
        },
        { status: 400 }
      );
    }
    
    const dbPath = process.env.DATABASE_PATH 
      ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
      : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
    const db = new Database(dbPath);
    
    // 프로젝트 수정
    const updateQuery = `
      UPDATE projects 
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const result = db.prepare(updateQuery).run(name.trim(), description?.trim() || null, id);
    
    if (result.changes === 0) {
      db.close();
      return NextResponse.json(
        { 
          success: false, 
          error: '프로젝트를 찾을 수 없습니다.' 
        },
        { status: 404 }
      );
    }
    
    // 수정된 프로젝트 조회
    const selectQuery = `
      SELECT 
        p.*,
        COUNT(d.id) as contentCount
      FROM projects p
      LEFT JOIN documents d ON p.id = d.project_id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const updatedProject = db.prepare(selectQuery).get(id) as ProjectWithCount;
    
    db.close();
    
    console.log('프로젝트 수정 완료:', updatedProject.name);
    
    return NextResponse.json({
      success: true,
      data: updatedProject
    });
    
  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '프로젝트 수정 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('프로젝트 삭제 시작');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '프로젝트 ID가 필요합니다.' 
        },
        { status: 400 }
      );
    }
    
    const dbPath = process.env.DATABASE_PATH 
      ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
      : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
    const db = new Database(dbPath);
    
    // 공통 프로젝트 삭제 방지
    if (id === '1') {
      db.close();
      return NextResponse.json(
        { 
          success: false, 
          error: '공통 프로젝트는 삭제할 수 없습니다. 공통 프로젝트는 모든 프로젝트에 영향을 미치는 문서를 관리하는 기본 프로젝트입니다.' 
        },
        { status: 400 }
      );
    }
    
    // 프로젝트에 속한 문서들을 공통 프로젝트로 이동
    const moveDocumentsQuery = `
      UPDATE documents 
      SET project_id = 1 
      WHERE project_id = ?
    `;
    db.prepare(moveDocumentsQuery).run(id);
    
    // 프로젝트 삭제
    const deleteQuery = `DELETE FROM projects WHERE id = ?`;
    const result = db.prepare(deleteQuery).run(id);
    
    if (result.changes === 0) {
      db.close();
      return NextResponse.json(
        { 
          success: false, 
          error: '프로젝트를 찾을 수 없습니다.' 
        },
        { status: 404 }
      );
    }
    
    db.close();
    
    console.log('프로젝트 삭제 완료:', id);
    
    return NextResponse.json({
      success: true,
      message: '프로젝트가 삭제되었습니다. 해당 문서들은 공통 프로젝트로 이동되었습니다.'
    });
    
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '프로젝트 삭제 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}