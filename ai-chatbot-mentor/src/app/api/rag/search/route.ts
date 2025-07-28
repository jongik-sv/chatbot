// app/api/rag/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/services/VectorSearchService';

export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      documentIds, 
      topK = 5, 
      threshold = 0.5,
      includeMetadata = true 
    } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '검색 쿼리가 필요합니다.' },
        { status: 400 }
      );
    }

    // 벡터 검색 수행
    const searchResults = await vectorSearchService.searchSimilarChunks(query, {
      topK,
      threshold,
      documentIds,
      includeMetadata
    });

    // 결과를 문서별로 그룹화
    const groupedResults = searchResults.reduce((acc, result) => {
      const docId = result.documentId;
      if (!acc[docId]) {
        acc[docId] = {
          documentId: docId,
          documentTitle: result.documentTitle,
          documentPath: result.documentPath,
          chunks: [],
          maxSimilarity: 0,
          avgSimilarity: 0
        };
      }
      
      acc[docId].chunks.push({
        chunkIndex: result.chunkIndex,
        chunkText: result.chunkText,
        similarity: result.similarity,
        metadata: result.metadata
      });
      
      acc[docId].maxSimilarity = Math.max(acc[docId].maxSimilarity, result.similarity);
      
      return acc;
    }, {} as Record<number, any>);

    // 평균 유사도 계산 및 정렬
    const documentsWithResults = Object.values(groupedResults).map((doc: any) => {
      doc.avgSimilarity = doc.chunks.reduce((sum: number, chunk: any) => sum + chunk.similarity, 0) / doc.chunks.length;
      doc.chunks = doc.chunks.sort((a: any, b: any) => b.similarity - a.similarity);
      return doc;
    }).sort((a: any, b: any) => b.maxSimilarity - a.maxSimilarity);

    return NextResponse.json({
      success: true,
      query,
      totalResults: searchResults.length,
      documentsMatched: documentsWithResults.length,
      results: {
        allChunks: searchResults,
        byDocument: documentsWithResults
      },
      searchOptions: {
        topK,
        threshold,
        documentIds,
        includeMetadata
      }
    });

  } catch (error) {
    console.error('RAG 검색 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const documentIdsParam = searchParams.get('docs');
    const topK = parseInt(searchParams.get('topK') || '5');
    const threshold = parseFloat(searchParams.get('threshold') || '0.5');

    if (!query) {
      return NextResponse.json(
        { success: false, error: '검색 쿼리가 필요합니다.' },
        { status: 400 }
      );
    }

    const documentIds = documentIdsParam 
      ? documentIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : undefined;

    // 벡터 검색 수행
    const searchResults = await vectorSearchService.searchSimilarChunks(query, {
      topK,
      threshold,
      documentIds,
      includeMetadata: true
    });

    return NextResponse.json({
      success: true,
      query,
      totalResults: searchResults.length,
      results: searchResults.map(result => ({
        documentId: result.documentId,
        documentTitle: result.documentTitle,
        chunkText: result.chunkText.substring(0, 200) + (result.chunkText.length > 200 ? '...' : ''),
        similarity: Math.round(result.similarity * 1000) / 1000,
        chunkIndex: result.chunkIndex
      })),
      searchOptions: {
        topK,
        threshold,
        documentIds
      }
    });

  } catch (error) {
    console.error('RAG 검색 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}