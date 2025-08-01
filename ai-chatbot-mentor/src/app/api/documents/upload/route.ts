// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentProcessingService } from '@/services/DocumentProcessingService';
import { DocumentStorageService } from '@/services/DocumentStorageService';
import { vectorSearchService } from '@/services/VectorSearchService';

const TEMP_DIR = path.join(process.cwd(), 'data', 'temp');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 지원합니다.` },
        { status: 400 }
      );
    }

    // 파일명 검증
    if (!DocumentProcessingService.validateFilename(file.name)) {
      return NextResponse.json(
        { error: '파일명에 유효하지 않은 문자가 포함되어 있습니다.' },
        { status: 400 }
      );
    }

    // 지원되는 파일 형식 검증
    if (!DocumentProcessingService.isSupportedFileType(file.name)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. PDF, DOCX, TXT 파일만 지원합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 추가 검증
    if (!DocumentProcessingService.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: '파일 크기가 허용 범위를 초과합니다.' },
        { status: 400 }
      );
    }

    // 임시 파일로 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 임시 디렉터리 생성
    const fs = await import('fs');
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // 임시 파일 경로 생성
    const tempId = uuidv4();
    const fileExtension = path.extname(file.name);
    const tempFilePath = path.join(TEMP_DIR, `${tempId}${fileExtension}`);

    // 임시 파일로 저장
    await writeFile(tempFilePath, buffer);

    try {
      // 문서 처리
      const processedDoc = await DocumentProcessingService.processDocument(tempFilePath, file.name);
      
      // documents 테이블에만 저장 (document_chunks 제거)
      const Database = require('better-sqlite3');
      const path = require('path');
      
      const dbPath = process.env.DATABASE_PATH 
        ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
        : path.resolve(process.cwd(), '..', 'data', 'chatbot.db');
      const db = new Database(dbPath);
      
      // documents 테이블에 직접 저장
      const insertQuery = `
        INSERT INTO documents (
          user_id, project_id, filename, file_type, file_path, 
          content, file_size, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const metadata = {
        wordCount: processedDoc.metadata.wordCount || 0,
        language: processedDoc.metadata.language || 'unknown',
        summary: processedDoc.metadata.summary || '',
        fileSize: processedDoc.metadata.fileSize || 0,
        createdAt: processedDoc.metadata.createdAt,
        documentId: processedDoc.id
      };
      
      const result = db.prepare(insertQuery).run(
        1, // user_id (시스템 사용자)
        parseInt(projectId) || 1, // project_id
        processedDoc.filename,
        processedDoc.fileType,
        tempFilePath, // 임시 파일 경로
        processedDoc.content,
        processedDoc.metadata.fileSize || 0,
        JSON.stringify(metadata),
        new Date().toISOString()
      );
      
      const documentId = result.lastInsertRowid as string;
      db.close();
      
      // 임시 파일 정리
      fs.unlinkSync(tempFilePath);
      
      // VectorSearchService를 사용하여 임베딩 생성 (토큰 기반)
      let embeddingStatus = 'pending';
      try {
        await vectorSearchService.processAndStoreDocument(
          parseInt(documentId),
          processedDoc.content,
          'token',  // 토큰 기반 청킹으로 변경
          500,      // 500 토큰 크기
          50        // 50 토큰 오버랩
        );
        embeddingStatus = 'completed';
        console.log(`PDF 문서 ${documentId}의 임베딩 생성 완료`);
      } catch (embeddingError) {
        console.error(`PDF 문서 ${documentId} 임베딩 생성 실패:`, embeddingError);
        embeddingStatus = 'failed';
      }
      
      // 응답 데이터 준비
      const responseData = {
        success: true,
        document: {
          id: documentId,
          filename: processedDoc.filename,
          fileType: processedDoc.fileType,
          wordCount: processedDoc.metadata.wordCount,
          language: processedDoc.metadata.language,
          summary: processedDoc.metadata.summary,
          chunkCount: 0, // embeddings 테이블에서 관리
          fileSize: processedDoc.metadata.fileSize,
          createdAt: processedDoc.metadata.createdAt,
          embeddingStatus
        }
      };

      return NextResponse.json(responseData, { status: 201 });

    } catch (processingError) {
      // 처리 실패 시 임시 파일 정리
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      console.error('문서 처리 오류:', processingError);
      return NextResponse.json(
        { error: `문서 처리 중 오류가 발생했습니다: ${processingError.message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const fileType = searchParams.get('fileType') || undefined;
    const search = searchParams.get('search') || undefined;

    const storageService = new DocumentStorageService();
    
    let documents;
    if (search) {
      documents = storageService.searchDocuments(search, limit);
    } else {
      documents = storageService.getDocuments(limit, offset, fileType);
    }

    // 응답 데이터에서 content 필드 제외 (큰 데이터이므로)
    const responseDocuments = documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      fileType: doc.fileType,
      wordCount: doc.wordCount,
      language: doc.language,
      summary: doc.summary,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));

    const stats = storageService.getDocumentStats();

    return NextResponse.json({
      documents: responseDocuments,
      stats,
      pagination: {
        limit,
        offset,
        total: stats.totalDocuments
      }
    });

  } catch (error) {
    console.error('문서 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '문서 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}