import { ChartData } from '@/types';
import { validateChartData, createChartFromData, csvToChartData, arrayToChartData } from './chartUtils';
import { validateMermaidSyntax, detectMermaidDiagramType, generateMermaidTemplate } from './mermaidUtils';

/**
 * 시각화 타입 정의
 */
export type VisualizationType = 'chart' | 'mermaid' | 'table' | 'unknown';

export interface VisualizationData {
  type: VisualizationType;
  content: string;
  metadata?: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 데이터에서 시각화 타입 자동 감지
 */
export function detectVisualizationType(content: string): VisualizationType {
  try {
    // JSON 파싱 시도
    const parsed = JSON.parse(content);
    
    // Chart.js 형식 확인
    if (validateChartData(parsed)) {
      return 'chart';
    }
    
    // 테이블 데이터 형식 확인 (배열 형태)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return 'table';
    }
  } catch (error) {
    // JSON이 아닌 경우
  }
  
  // Mermaid 다이어그램 확인
  if (detectMermaidDiagramType(content)) {
    return 'mermaid';
  }
  
  // CSV 형식 확인
  const lines = content.trim().split('\n');
  if (lines.length > 1 && lines[0].includes(',')) {
    const firstLine = lines[0].split(',');
    const secondLine = lines[1].split(',');
    if (firstLine.length === secondLine.length && firstLine.length > 1) {
      return 'table';
    }
  }
  
  return 'unknown';
}

/**
 * 시각화 데이터 검증 및 처리
 */
export function processVisualizationData(content: string, type?: VisualizationType): VisualizationData {
  const detectedType = type || detectVisualizationType(content);
  const result: VisualizationData = {
    type: detectedType,
    content,
    isValid: false,
    errors: [],
    warnings: []
  };
  
  switch (detectedType) {
    case 'chart':
      try {
        const parsed = JSON.parse(content);
        if (validateChartData(parsed)) {
          result.isValid = true;
          result.metadata = {
            chartType: parsed.type,
            datasetCount: parsed.data.datasets.length,
            dataPointCount: parsed.data.labels.length
          };
        } else {
          result.errors.push('유효하지 않은 차트 데이터 형식입니다.');
        }
      } catch (error) {
        result.errors.push('JSON 파싱 오류: ' + (error as Error).message);
      }
      break;
      
    case 'mermaid':
      const mermaidValidation = validateMermaidSyntax(content);
      result.isValid = mermaidValidation.isValid;
      result.errors = mermaidValidation.errors;
      result.warnings = mermaidValidation.warnings;
      
      const diagramInfo = detectMermaidDiagramType(content);
      if (diagramInfo) {
        result.metadata = {
          diagramType: diagramInfo.type,
          displayName: diagramInfo.displayName,
          description: diagramInfo.description
        };
      }
      break;
      
    case 'table':
      try {
        // JSON 배열 형태인지 확인
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          result.isValid = true;
          result.metadata = {
            rowCount: parsed.length,
            columnCount: parsed.length > 0 ? Object.keys(parsed[0]).length : 0,
            columns: parsed.length > 0 ? Object.keys(parsed[0]) : []
          };
        }
      } catch (error) {
        // CSV 형태인지 확인
        const lines = content.trim().split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim());
          const dataRows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
          
          const isValidCSV = dataRows.every(row => row.length === headers.length);
          if (isValidCSV) {
            result.isValid = true;
            result.metadata = {
              rowCount: dataRows.length,
              columnCount: headers.length,
              columns: headers,
              format: 'csv'
            };
          } else {
            result.errors.push('CSV 형식이 일관되지 않습니다.');
          }
        } else {
          result.errors.push('테이블 데이터가 부족합니다.');
        }
      }
      break;
      
    default:
      result.errors.push('지원되지 않는 시각화 타입입니다.');
  }
  
  return result;
}

/**
 * 데이터를 다른 시각화 형식으로 변환
 */
export function convertVisualizationData(
  data: VisualizationData,
  targetType: VisualizationType,
  options?: Record<string, any>
): VisualizationData | null {
  if (!data.isValid) {
    return null;
  }
  
  try {
    switch (data.type) {
      case 'table':
        if (targetType === 'chart') {
          return convertTableToChart(data, options);
        }
        break;
        
      case 'chart':
        if (targetType === 'table') {
          return convertChartToTable(data);
        }
        break;
    }
  } catch (error) {
    console.error('변환 오류:', error);
  }
  
  return null;
}

/**
 * 테이블 데이터를 차트로 변환
 */
function convertTableToChart(
  tableData: VisualizationData,
  options?: Record<string, any>
): VisualizationData {
  const chartType = options?.chartType || 'bar';
  const labelColumn = options?.labelColumn || 0;
  const valueColumns = options?.valueColumns || [1];
  
  let chartData: ChartData | null = null;
  
  try {
    // JSON 배열 형태인 경우
    const parsed = JSON.parse(tableData.content);
    if (Array.isArray(parsed)) {
      const columns = Object.keys(parsed[0]);
      const labelKey = columns[labelColumn] || columns[0];
      const valueKeys = valueColumns.map(i => columns[i]).filter(Boolean);
      
      chartData = arrayToChartData(parsed, chartType, labelKey, valueKeys);
    }
  } catch (error) {
    // CSV 형태인 경우
    chartData = csvToChartData(tableData.content, chartType);
  }
  
  if (chartData) {
    return {
      type: 'chart',
      content: JSON.stringify(chartData, null, 2),
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        chartType: chartData.type,
        datasetCount: chartData.data.datasets.length,
        dataPointCount: chartData.data.labels.length,
        convertedFrom: 'table'
      }
    };
  }
  
  return {
    type: 'chart',
    content: '',
    isValid: false,
    errors: ['테이블을 차트로 변환할 수 없습니다.'],
    warnings: []
  };
}

/**
 * 차트 데이터를 테이블로 변환
 */
function convertChartToTable(chartData: VisualizationData): VisualizationData {
  try {
    const parsed = JSON.parse(chartData.content) as ChartData;
    const { labels, datasets } = parsed.data;
    
    // JSON 배열 형태로 변환
    const tableData = labels.map((label, index) => {
      const row: Record<string, any> = { label };
      datasets.forEach(dataset => {
        row[dataset.label] = dataset.data[index] || 0;
      });
      return row;
    });
    
    return {
      type: 'table',
      content: JSON.stringify(tableData, null, 2),
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        rowCount: tableData.length,
        columnCount: Object.keys(tableData[0] || {}).length,
        columns: Object.keys(tableData[0] || {}),
        convertedFrom: 'chart'
      }
    };
  } catch (error) {
    return {
      type: 'table',
      content: '',
      isValid: false,
      errors: ['차트를 테이블로 변환할 수 없습니다.'],
      warnings: []
    };
  }
}

/**
 * 시각화 데이터 최적화
 */
export function optimizeVisualizationData(data: VisualizationData): VisualizationData {
  const optimized = { ...data };
  
  switch (data.type) {
    case 'chart':
      try {
        const parsed = JSON.parse(data.content);
        
        // 데이터 포인트가 너무 많은 경우 샘플링
        if (parsed.data.labels.length > 50) {
          const step = Math.ceil(parsed.data.labels.length / 50);
          parsed.data.labels = parsed.data.labels.filter((_: any, index: number) => index % step === 0);
          parsed.data.datasets = parsed.data.datasets.map((dataset: any) => ({
            ...dataset,
            data: dataset.data.filter((_: any, index: number) => index % step === 0)
          }));
          
          optimized.warnings.push('데이터 포인트가 많아 샘플링되었습니다.');
        }
        
        optimized.content = JSON.stringify(parsed, null, 2);
      } catch (error) {
        optimized.errors.push('차트 최적화 중 오류가 발생했습니다.');
      }
      break;
      
    case 'mermaid':
      // Mermaid 다이어그램 최적화는 mermaidUtils에서 처리
      break;
  }
  
  return optimized;
}

/**
 * 시각화 추천 시스템
 */
export function recommendVisualization(data: any[]): {
  recommended: VisualizationType;
  alternatives: VisualizationType[];
  reasons: string[];
} {
  const reasons: string[] = [];
  let recommended: VisualizationType = 'table';
  const alternatives: VisualizationType[] = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    return { recommended: 'table', alternatives: [], reasons: ['데이터가 없습니다.'] };
  }
  
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  const numericColumns = columns.filter(col => 
    data.every(row => typeof row[col] === 'number' || !isNaN(Number(row[col])))
  );
  
  // 숫자 컬럼이 많은 경우 차트 추천
  if (numericColumns.length >= 2) {
    recommended = 'chart';
    reasons.push('숫자 데이터가 많아 차트로 시각화하기 적합합니다.');
    alternatives.push('table');
    
    // 데이터 포인트 수에 따른 차트 타입 추천
    if (data.length <= 10) {
      reasons.push('데이터 포인트가 적어 막대 차트나 파이 차트가 적합합니다.');
    } else if (data.length <= 50) {
      reasons.push('적당한 데이터 포인트로 선 차트나 막대 차트가 적합합니다.');
    } else {
      reasons.push('데이터 포인트가 많아 선 차트가 적합합니다.');
    }
  }
  
  // 시간 관련 데이터인 경우
  const hasTimeColumn = columns.some(col => 
    col.toLowerCase().includes('time') || 
    col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('year') ||
    col.toLowerCase().includes('month')
  );
  
  if (hasTimeColumn && numericColumns.length > 0) {
    recommended = 'chart';
    reasons.push('시간 관련 데이터가 있어 시계열 차트가 적합합니다.');
  }
  
  // 카테고리 데이터가 많은 경우
  const categoryColumns = columns.filter(col => 
    data.every(row => typeof row[col] === 'string')
  );
  
  if (categoryColumns.length > numericColumns.length) {
    alternatives.unshift('table');
    reasons.push('카테고리 데이터가 많아 테이블 형태가 적합할 수 있습니다.');
  }
  
  return { recommended, alternatives, reasons };
}