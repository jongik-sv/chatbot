// app/api/documents/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DocumentStorageService } from '@/services/DocumentStorageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const searchType = searchParams.get('type') || 'documents'; // 'documents' or 'chunks'
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: '검색어가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const storageService = new DocumentStorageService();
    
    if (searchType === 'chunks') {
      // 청크에서 검색
      const chunks = storageService.searchChunks(query.trim(), limit);
      
      // 각 청크의 문서 정보 추가
      const chunksWithDocs = chunks.map(chunk => {
        const document = storageService.getDocumentById(chunk.documentId);
        return {
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          metadata: {
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            wordCount: chunk.wordCount,
            sentences: chunk.sentences
          },
          document: document ? {
            id: document.id,
            filename: document.filename,
            fileType: document.fileType
          } : null,
          createdAt: chunk.createdAt
        };
      });

      return NextResponse.json({
        searchType: 'chunks',
        query: query.trim(),
        results: chunksWithDocs,
        totalResults: chunksWithDocs.length
      });

    } else {
      // 문서에서 검색
      const documents = storageService.searchDocuments(query.trim(), limit);
      
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

      return NextResponse.json({
        searchType: 'documents',
        query: query.trim(),
        results: responseDocuments,
        totalResults: responseDocuments.length
      });
    }

  } catch (error) {
    console.error('문서 검색 오류:', error);
    return NextResponse.json(
      { error: '문서 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, searchType = 'documents', limit = 10, filters } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: '검색어가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const storageService = new DocumentStorageService();
    
    // 고급 검색 (필터 적용)
    if (searchType === 'chunks') {
      const chunks = storageService.searchChunks(query.trim(), limit);
      
      // 필터 적용 (있을 경우)
      let filteredChunks = chunks;
      if (filters) {
        if (filters.fileType) {
          filteredChunks = chunks.filter(chunk => {
            const document = storageService.getDocumentById(chunk.documentId);
            return document && document.fileType === filters.fileType;
          });
        }
      }

      const chunksWithDocs = filteredChunks.map(chunk => {
        const document = storageService.getDocumentById(chunk.documentId);
        return {
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          metadata: {
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            wordCount: chunk.wordCount,
            sentences: chunk.sentences
          },
          document: document ? {
            id: document.id,
            filename: document.filename,
            fileType: document.fileType
          } : null,
          createdAt: chunk.createdAt
        };
      });

      return NextResponse.json({
        searchType: 'chunks',
        query: query.trim(),
        filters: filters || {},
        results: chunksWithDocs,
        totalResults: chunksWithDocs.length
      });

    } else {
      let documents = storageService.searchDocuments(query.trim(), limit);
      
      // 필터 적용
      if (filters) {
        if (filters.fileType) {
          documents = documents.filter(doc => doc.fileType === filters.fileType);
        }
        if (filters.language) {
          documents = documents.filter(doc => doc.language === filters.language);
        }
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          documents = documents.filter(doc => new Date(doc.createdAt) >= fromDate);
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          documents = documents.filter(doc => new Date(doc.createdAt) <= toDate);
        }
      }

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

      return NextResponse.json({
        searchType: 'documents',
        query: query.trim(),
        filters: filters || {},
        results: responseDocuments,
        totalResults: responseDocuments.length
      });
    }

  } catch (error) {
    console.error('고급 문서 검색 오류:', error);
    return NextResponse.json(
      { error: '문서 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}