import { NextRequest, NextResponse } from 'next/server';
import { documentRepository } from '@/lib/repositories/DocumentRepository';
import path from 'path';
import Database from 'better-sqlite3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mentorId = searchParams.get('mentorId');
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 프로젝트별 문서 필터링을 위한 직접 DB 쿼리
    if (projectId) {
      const dbPath = path.join(process.cwd(), '..', 'data', 'chatbot.db');
      const db = new Database(dbPath);
      
      // 선택된 프로젝트와 공통 프로젝트(id=1)의 문서들을 조회
      const query = `
        SELECT * FROM documents 
        WHERE project_id = ? OR project_id = 1
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const documents = db.prepare(query).all(parseInt(projectId), limit, offset);
      db.close();
      
      return NextResponse.json({
        success: true,
        data: documents
      });
    }

    // 기존 로직 (프로젝트 필터링 없음)
    const documents = documentRepository.listDocuments({
      userId: userId ? parseInt(userId) : undefined,
      mentorId: mentorId ? parseInt(mentorId) : undefined,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('문서 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '문서 목록 조회에 실패했습니다.' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('직접 내용 입력 저장 시작');
    
    const body = await request.json();
    const { title, content, projectId, type = 'direct_input' } = body;
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: '제목은 필수입니다.' 
        },
        { status: 400 }
      );
    }
    
    if (!content || !content.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: '내용은 필수입니다.' 
        },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), '..', 'data', 'chatbot.db');
    const db = new Database(dbPath);
    
    // 문서 삽입
    const insertQuery = `
      INSERT INTO documents (
        user_id, 
        project_id, 
        filename, 
        file_type, 
        file_path, 
        content, 
        file_size, 
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const metadata = JSON.stringify({
      type: type,
      isDirectInput: true,
      createdBy: 'direct_input',
      originalTitle: title.trim()
    });
    
    const result = db.prepare(insertQuery).run(
      1, // user_id (시스템 사용자)
      projectId || 1, // project_id
      title.trim(), // filename
      'text/plain', // file_type
      '', // file_path (직접 입력이므로 빈 값)
      content.trim(), // content
      content.trim().length, // file_size (글자 수)
      metadata
    );
    
    const documentId = result.lastInsertRowid;
    
    // RAG를 위한 청크 생성 및 임베딩
    await generateChunksAndEmbeddings(db, documentId as number, content.trim());
    
    db.close();
    
    console.log('직접 내용 입력 저장 완료:', documentId);
    
    return NextResponse.json({
      success: true,
      data: {
        id: documentId,
        title: title.trim(),
        type: type
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('직접 내용 입력 저장 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '콘텐츠 저장 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

// 청크 생성 및 임베딩 함수
async function generateChunksAndEmbeddings(db: Database.Database, documentId: number, content: string) {
  try {
    console.log(`문서 ${documentId}의 청크 생성 시작`);
    
    // 500 토큰 정도로 청크 분할 (대략 500개 글자)
    const chunkSize = 500;
    const chunks: string[] = [];
    
    // 줄바꿈과 문단을 고려한 청크 분할
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        if (paragraph.length <= chunkSize) {
          currentChunk = paragraph;
        } else {
          // 긴 문단은 문장 단위로 분할
          const sentences = paragraph.split(/[.!?]\s+/);
          currentChunk = '';
          
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= chunkSize) {
              currentChunk += (currentChunk ? '. ' : '') + sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk.trim() + '.');
              }
              currentChunk = sentence;
            }
          }
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    console.log(`청크 ${chunks.length}개 생성 완료`);
    
    // 청크를 embeddings 테이블에 저장 (임베딩은 null로 저장)
    const insertChunkQuery = `
      INSERT INTO embeddings (document_id, chunk_text, chunk_index, embedding, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkMetadata = JSON.stringify({
        chunkSize: chunks[i].length,
        position: i,
        totalChunks: chunks.length
      });
      
      db.prepare(insertChunkQuery).run(
        documentId,
        chunks[i],
        i,
        null, // 임베딩은 나중에 별도 프로세스에서 생성
        chunkMetadata
      );
    }
    
    console.log(`문서 ${documentId}의 청크 저장 완료`);
    
  } catch (error) {
    console.error('청크 생성 오류:', error);
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: '문서 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const deleted = documentRepository.deleteDocument(
      parseInt(documentId),
      userId ? parseInt(userId) : undefined
    );

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '문서가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '문서 삭제에 실패했습니다.' 
      },
      { status: 500 }
    );
  }
}