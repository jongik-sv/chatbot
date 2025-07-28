import { ChartData } from '@/types';

/**
 * 차트 데이터 검증
 */
export function validateChartData(data: any): data is ChartData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 필수 필드 검증
  if (!data.type || !data.data) {
    return false;
  }

  // 지원되는 차트 타입 검증
  const supportedTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'scatter', 'bubble'];
  if (!supportedTypes.includes(data.type)) {
    return false;
  }

  // 데이터 구조 검증
  if (!data.data.labels || !Array.isArray(data.data.labels)) {
    return false;
  }

  if (!data.data.datasets || !Array.isArray(data.data.datasets)) {
    return false;
  }

  // 각 데이터셋 검증
  for (const dataset of data.data.datasets) {
    if (!dataset.label || !dataset.data || !Array.isArray(dataset.data)) {
      return false;
    }
  }

  return true;
}

/**
 * 기본 차트 옵션 생성
 */
export function getDefaultChartOptions(type: ChartData['type']) {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  switch (type) {
    case 'bar':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      };

    case 'line':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        elements: {
          line: {
            tension: 0.1,
          },
        },
      };

    case 'pie':
    case 'doughnut':
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            position: 'right' as const,
          },
        },
      };

    case 'radar':
      return {
        ...baseOptions,
        scales: {
          r: {
            beginAtZero: true,
          },
        },
      };

    case 'scatter':
    case 'bubble':
      return {
        ...baseOptions,
        scales: {
          x: {
            type: 'linear' as const,
            position: 'bottom' as const,
          },
          y: {
            beginAtZero: true,
          },
        },
      };

    default:
      return baseOptions;
  }
}

/**
 * 색상 팔레트 생성
 */
export function generateColorPalette(count: number): string[] {
  const colors = [
    '#3B82F6', // blue-500
    '#EF4444', // red-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#8B5CF6', // violet-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
    '#84CC16', // lime-500
    '#EC4899', // pink-500
    '#6366F1', // indigo-500
  ];

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }

  return result;
}

/**
 * 투명도가 적용된 색상 생성
 */
export function generateColorWithAlpha(color: string, alpha: number): string {
  // HEX 색상을 RGBA로 변환
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 데이터에서 자동으로 차트 데이터 생성
 */
export function createChartFromData(
  type: ChartData['type'],
  labels: string[],
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>,
  options?: Partial<ChartData['options']>
): ChartData {
  const colors = generateColorPalette(datasets.length);

  const processedDatasets = datasets.map((dataset, index) => {
    const color = dataset.color || colors[index];
    
    return {
      label: dataset.label,
      data: dataset.data,
      backgroundColor: type === 'line' 
        ? generateColorWithAlpha(color, 0.2)
        : type === 'pie' || type === 'doughnut'
        ? generateColorPalette(dataset.data.length)
        : color,
      borderColor: color,
      borderWidth: type === 'line' ? 2 : 1,
      fill: type === 'line' ? false : undefined,
    };
  });

  return {
    type,
    data: {
      labels,
      datasets: processedDatasets,
    },
    options: {
      ...getDefaultChartOptions(type),
      ...options,
    },
  };
}

/**
 * CSV 데이터를 차트 데이터로 변환
 */
export function csvToChartData(
  csvText: string,
  type: ChartData['type'] = 'bar'
): ChartData | null {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return null;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const labels = headers.slice(1); // 첫 번째 열은 라벨로 사용

    const datasets: Array<{
      label: string;
      data: number[];
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const label = values[0];
      const data = values.slice(1).map(v => parseFloat(v) || 0);

      datasets.push({
        label,
        data,
      });
    }

    return createChartFromData(type, labels, datasets);
  } catch (error) {
    console.error('CSV 파싱 오류:', error);
    return null;
  }
}

/**
 * JSON 배열을 차트 데이터로 변환
 */
export function arrayToChartData(
  data: Array<Record<string, any>>,
  type: ChartData['type'] = 'bar',
  labelKey: string = 'label',
  valueKeys: string[] = ['value']
): ChartData | null {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const labels = data.map(item => String(item[labelKey] || ''));
    
    const datasets = valueKeys.map(key => ({
      label: key,
      data: data.map(item => Number(item[key]) || 0),
    }));

    return createChartFromData(type, labels, datasets);
  } catch (error) {
    console.error('배열 변환 오류:', error);
    return null;
  }
}

/**
 * 차트 데이터를 CSV로 내보내기
 */
export function chartDataToCSV(chartData: ChartData): string {
  const { labels, datasets } = chartData.data;
  
  // 헤더 생성
  const headers = ['Label', ...datasets.map(d => d.label)];
  
  // 데이터 행 생성
  const rows = labels.map((label, index) => {
    const values = datasets.map(dataset => dataset.data[index] || 0);
    return [label, ...values];
  });

  // CSV 문자열 생성
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * 차트 타입별 추천 설정
 */
export function getRecommendedSettings(type: ChartData['type']) {
  const settings = {
    bar: {
      description: '카테고리별 데이터 비교에 적합',
      bestFor: ['비교', '순위', '분포'],
      maxDataPoints: 20,
      maxDatasets: 5,
    },
    line: {
      description: '시간에 따른 변화 추이 표시에 적합',
      bestFor: ['추세', '시계열', '변화'],
      maxDataPoints: 50,
      maxDatasets: 3,
    },
    pie: {
      description: '전체에서 각 부분의 비율 표시에 적합',
      bestFor: ['비율', '구성', '점유율'],
      maxDataPoints: 8,
      maxDatasets: 1,
    },
    doughnut: {
      description: '파이 차트와 유사하지만 중앙에 추가 정보 표시 가능',
      bestFor: ['비율', '구성', '점유율'],
      maxDataPoints: 8,
      maxDatasets: 1,
    },
    radar: {
      description: '여러 지표의 균형과 패턴 비교에 적합',
      bestFor: ['성능 비교', '다차원 분석', '균형'],
      maxDataPoints: 8,
      maxDatasets: 3,
    },
    scatter: {
      description: '두 변수 간의 상관관계 분석에 적합',
      bestFor: ['상관관계', '분포', '패턴'],
      maxDataPoints: 100,
      maxDatasets: 3,
    },
    bubble: {
      description: '세 변수 간의 관계 분석에 적합',
      bestFor: ['3차원 분석', '복합 관계', '크기 비교'],
      maxDataPoints: 50,
      maxDatasets: 3,
    },
  };

  return settings[type] || settings.bar;
}