import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';

interface YouTubeVideoInfo {
  videoId: string;
  title?: string;
  description?: string;
  channelName?: string;
  publishedAt?: string;
  duration?: string;
  viewCount?: string;
  thumbnailUrl?: string;
}

interface YouTubeTranscriptItem {
  text: string;
  start: number;
  duration: number;
}

interface ProcessedYouTubeContent {
  videoInfo: YouTubeVideoInfo;
  transcript: string;
  transcriptItems: YouTubeTranscriptItem[];
  summary?: string;
  keywords?: string[];
}

export class YouTubeContentService {
  private static instance: YouTubeContentService;

  private constructor() {}

  public static getInstance(): YouTubeContentService {
    if (!YouTubeContentService.instance) {
      YouTubeContentService.instance = new YouTubeContentService();
    }
    return YouTubeContentService.instance;
  }

  /**
   * YouTube URL에서 비디오 ID 추출
   */
  public extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * YouTube 비디오 메타데이터 추출 (oEmbed API 사용)
   */
  public async getVideoMetadata(videoId: string): Promise<YouTubeVideoInfo> {
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await axios.get(oEmbedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = response.data;
      return {
        videoId,
        title: data.title || '',
        channelName: data.author_name || '',
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        description: '',
        publishedAt: '',
        duration: '',
        viewCount: ''
      };
    } catch (error) {
      console.warn('YouTube 메타데이터 추출 실패:', error);
      return {
        videoId,
        title: `YouTube 비디오 (${videoId})`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };
    }
  }

  /**
   * YouTube 비디오 자막 추출
   */
  public async getTranscript(videoId: string, lang: string = 'ko'): Promise<YouTubeTranscriptItem[]> {
    try {
      // 먼저 한국어 자막 시도
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: lang,
        country: 'KR'
      });
      return transcript.map(item => ({
        text: item.text,
        start: item.offset / 1000, // 밀리초를 초로 변환
        duration: item.duration / 1000
      }));
    } catch (error) {
      try {
        // 한국어 자막이 없으면 영어 자막 시도
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: 'en',
          country: 'US'
        });
        return transcript.map(item => ({
          text: item.text,
          start: item.offset / 1000,
          duration: item.duration / 1000
        }));
      } catch (fallbackError) {
        try {
          // 언어 옵션 없이 기본 자막 시도
          const transcript = await YoutubeTranscript.fetchTranscript(videoId);
          return transcript.map(item => ({
            text: item.text,
            start: item.offset / 1000,
            duration: item.duration / 1000
          }));
        } catch (finalError) {
          console.error('자막 추출 실패:', finalError);
          throw new Error('자막을 찾을 수 없습니다. 이 비디오에는 자막이 제공되지 않을 수 있습니다.');
        }
      }
    }
  }

  /**
   * 자막 텍스트를 하나의 문자열로 합치기
   */
  public combineTranscriptText(transcriptItems: YouTubeTranscriptItem[]): string {
    return transcriptItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 자막이 없을 때 비디오 메타데이터를 기반으로 대체 콘텐츠 생성
   */
  private generateFallbackContent(videoInfo: YouTubeVideoInfo): string {
    const parts = [];
    
    // 제목
    if (videoInfo.title) {
      parts.push(`제목: ${videoInfo.title}`);
    }
    
    // 채널명
    if (videoInfo.channelTitle) {
      parts.push(`채널: ${videoInfo.channelTitle}`);
    }
    
    // 설명 (처음 500자만 사용)
    if (videoInfo.description) {
      const description = videoInfo.description.length > 500 
        ? videoInfo.description.substring(0, 500) + '...'
        : videoInfo.description;
      parts.push(`설명: ${description}`);
    }
    
    // 태그들
    if (videoInfo.tags && videoInfo.tags.length > 0) {
      parts.push(`태그: ${videoInfo.tags.slice(0, 10).join(', ')}`);
    }
    
    // 기본 정보
    const metadata = [];
    if (videoInfo.duration) metadata.push(`길이: ${videoInfo.duration}`);
    if (videoInfo.viewCount) metadata.push(`조회수: ${videoInfo.viewCount.toLocaleString()}회`);
    if (videoInfo.publishedAt) metadata.push(`게시일: ${videoInfo.publishedAt}`);
    
    if (metadata.length > 0) {
      parts.push(`정보: ${metadata.join(', ')}`);
    }
    
    // 자막 부재 안내
    parts.push('참고: 이 비디오는 자막이 제공되지 않아 메타데이터를 기반으로 내용을 구성했습니다. 더 정확한 정보를 원하시면 비디오를 직접 시청해주세요.');
    
    return parts.join('\n\n');
  }

  /**
   * YouTube 콘텐츠 전체 처리
   */
  public async processYouTubeContent(url: string): Promise<ProcessedYouTubeContent> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('유효하지 않은 YouTube URL입니다.');
    }

    try {
      // 먼저 비디오 메타데이터 가져오기
      const videoInfo = await this.getVideoMetadata(videoId);
      
      // 자막 가져오기 시도 (실패해도 계속 진행)
      let transcriptItems: YouTubeTranscriptItem[] = [];
      let transcript = '';
      
      try {
        transcriptItems = await this.getTranscript(videoId);
        transcript = this.combineTranscriptText(transcriptItems);
        console.log(`자막 추출 성공: ${transcript.length}자`);
      } catch (transcriptError) {
        console.warn(`자막 추출 실패 (비디오 ID: ${videoId}):`, transcriptError.message);
        
        // 자막이 없을 때는 비디오 정보로 대체 텍스트 생성
        transcript = this.generateFallbackContent(videoInfo);
        console.log('자막 대신 비디오 메타데이터 기반 콘텐츠 생성');
      }
      
      return {
        videoInfo,
        transcript,
        transcriptItems,
        summary: this.generateBasicSummary(transcript),
        keywords: this.extractKeywords(transcript)
      };
    } catch (error) {
      console.error('YouTube 콘텐츠 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 기본적인 요약 생성 (첫 500자)
   */
  private generateBasicSummary(transcript: string): string {
    if (transcript.length <= 500) {
      return transcript;
    }
    return transcript.substring(0, 500) + '...';
  }

  /**
   * 간단한 키워드 추출 (빈도 기반)
   */
  private extractKeywords(transcript: string): string[] {
    const words = transcript
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // 빈도순으로 정렬하여 상위 10개 키워드 반환
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * 불용어 체크 (간단한 한국어/영어 불용어)
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '그', '이', '저', '것', '수', '등', '들', '더', '또', '잘', '너무', '정말', '그냥', '좀'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * 타임스탬프가 포함된 자막 텍스트 생성
   */
  public generateTimestampedTranscript(transcriptItems: YouTubeTranscriptItem[]): string {
    return transcriptItems
      .map(item => {
        const minutes = Math.floor(item.start / 60);
        const seconds = Math.floor(item.start % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        return `[${timestamp}] ${item.text}`;
      })
      .join('\n');
  }

  /**
   * URL 유효성 검사
   */
  public isValidYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }
}

export default YouTubeContentService;