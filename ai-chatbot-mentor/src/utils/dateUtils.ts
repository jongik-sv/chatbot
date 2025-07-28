// 한국 시간 기준 날짜/시간 유틸리티 함수들

/**
 * 클라이언트 사이드에서만 실행되는지 확인
 */
function isClient() {
  return typeof window !== 'undefined';
}

/**
 * 한국 시간대로 변환된 Date 객체 반환
 */
export function toKoreanTime(date: string | Date): Date {
  // 유효하지 않은 입력 처리
  if (!date) {
    return new Date();
  }
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  // 유효하지 않은 Date 객체 처리
  if (isNaN(targetDate.getTime())) {
    return new Date();
  }
  
  // 서버 사이드에서는 원본 시간 반환 (하이드레이션 불일치 방지)
  if (!isClient()) {
    return targetDate;
  }
  
  // 한국 시간대 (UTC+9)로 변환
  // 현재 시스템의 시간대 오프셋을 고려하여 한국 시간으로 변환
  const koreanOffset = 9 * 60; // 한국은 UTC+9 (분 단위)
  const localOffset = targetDate.getTimezoneOffset(); // 현재 시스템의 UTC 오프셋 (분 단위, 음수)
  const offsetDiff = koreanOffset + localOffset; // 한국 시간과의 차이 (분 단위)
  
  return new Date(targetDate.getTime() + (offsetDiff * 60 * 1000));
}

/**
 * 한국 시간 기준으로 포맷된 날짜 문자열 반환
 */
export function formatKoreanDate(date: string | Date, options?: {
  includeTime?: boolean;
  includeSeconds?: boolean;
  format?: 'full' | 'short' | 'relative';
}): string {
  const {
    includeTime = true,
    includeSeconds = false,
    format = 'full'
  } = options || {};

  const koreanTime = toKoreanTime(date);
  const now = toKoreanTime(new Date());

  if (format === 'relative') {
    return formatRelativeTime(koreanTime, now);
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    day: 'numeric'
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = false; // 24시간 형식
    
    if (includeSeconds) {
      formatOptions.second = '2-digit';
    }
  }

  return koreanTime.toLocaleString('ko-KR', formatOptions);
}

/**
 * 상대적 시간 표시 (예: "방금 전", "5분 전", "2시간 전")
 */
export function formatRelativeTime(date: string | Date, baseDate?: Date): string {
  // 유효하지 않은 입력 처리
  if (!date) {
    return '알 수 없음';
  }
  
  // 서버 사이드에서는 기본 포맷 반환 (하이드레이션 불일치 방지)
  if (!isClient()) {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(targetDate.getTime())) {
      return '알 수 없음';
    }
    return targetDate.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const targetDate = toKoreanTime(typeof date === 'string' ? new Date(date) : date);
  const now = toKoreanTime(baseDate || new Date());
  
  // 유효하지 않은 Date 객체 처리
  if (isNaN(targetDate.getTime()) || isNaN(now.getTime())) {
    return '알 수 없음';
  }
  
  // 한국 시간 기준으로 차이 계산
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMs < 60000) { // 1분 미만
    return '방금 전';
  } else if (diffMinutes < 60) { // 1시간 미만
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) { // 1일 미만
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) { // 1주 미만
    return `${diffDays}일 전`;
  } else if (diffWeeks < 4) { // 1개월 미만
    return `${diffWeeks}주 전`;
  } else if (diffMonths < 12) { // 1년 미만
    return `${diffMonths}개월 전`;
  } else {
    return `${diffYears}년 전`;
  }
}

/**
 * 채팅 메시지용 시간 포맷 (오늘/어제 구분)
 */
export function formatChatTime(date: string | Date): string {
  // 유효하지 않은 입력 처리
  if (!date) {
    return '알 수 없음';
  }
  
  // 서버 사이드에서는 기본 포맷 반환 (하이드레이션 불일치 방지)
  if (!isClient()) {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(targetDate.getTime())) {
      return '알 수 없음';
    }
    return targetDate.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  const targetDate = toKoreanTime(date);
  const now = toKoreanTime(new Date());
  
  // 유효하지 않은 Date 객체 처리
  if (isNaN(targetDate.getTime()) || isNaN(now.getTime())) {
    return '알 수 없음';
  }
  
  const isToday = targetDate.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = targetDate.toDateString() === yesterday.toDateString();
  
  const timeString = targetDate.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  if (isToday) {
    return timeString;
  } else if (isYesterday) {
    return `어제 ${timeString}`;
  } else {
    return targetDate.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}

/**
 * 대화 지속 시간 계산
 */
export function formatDuration(startDate: string | Date, endDate: string | Date): string {
  // 유효하지 않은 입력 처리
  if (!startDate || !endDate) {
    return '알 수 없음';
  }
  
  const start = toKoreanTime(startDate);
  const end = toKoreanTime(endDate);
  
  // 유효하지 않은 Date 객체 처리
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return '알 수 없음';
  }
  
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return '1분 미만';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }
}

/**
 * 현재 한국 시간 반환
 */
export function getCurrentKoreanTime(): Date {
  return toKoreanTime(new Date());
}

/**
 * 현재 한국 시간을 ISO 문자열로 반환 (데이터베이스 저장용)
 */
export function getCurrentKoreanTimeISO(): string {
  return toKoreanTime(new Date()).toISOString();
}

/**
 * 한국 시간을 ISO 문자열로 변환 (데이터베이스 저장용)
 */
export function toKoreanTimeISO(date: string | Date): string {
  return toKoreanTime(date).toISOString();
}