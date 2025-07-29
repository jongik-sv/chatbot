const { YoutubeTranscript } = require('youtube-transcript');
const puppeteer = require('puppeteer');

class YouTubeContentExtractor {
  constructor() {
    this.browser = null;
  }

  /**
   * YouTube URL에서 비디오 ID 추출
   */
  extractVideoId(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('youtu.be')) {
        // youtu.be/VIDEO_ID 형식
        return urlObj.pathname.substring(1).split('?')[0];
      } else if (hostname.includes('youtube.com')) {
        if (urlObj.pathname.includes('/watch')) {
          // youtube.com/watch?v=VIDEO_ID 형식
          return urlObj.searchParams.get('v');
        } else if (urlObj.pathname.includes('/embed/')) {
          // youtube.com/embed/VIDEO_ID 형식
          return urlObj.pathname.split('/embed/')[1]?.split('?')[0];
        }
      }
      
      return null;
    } catch (error) {
      console.error('비디오 ID 추출 실패:', error);
      return null;
    }
  }

  /**
   * Puppeteer 브라우저 초기화
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        timeout: 30000
      });
    }
    return this.browser;
  }

  /**
   * 브라우저 종료
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * YouTube 페이지에서 메타데이터 추출
   */
  async extractVideoMetadata(videoId) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // YouTube 비디오 페이지로 이동
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      await page.goto(videoUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // 페이지 로딩 대기
      await page.waitForSelector('h1.ytd-video-primary-info-renderer', { timeout: 15000 });

      // 메타데이터 추출
      const metadata = await page.evaluate(() => {
        const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 
                     document.querySelector('meta[property="og:title"]')?.content ||
                     document.title;
        
        const description = document.querySelector('meta[name="description"]')?.content ||
                          document.querySelector('meta[property="og:description"]')?.content ||
                          '';
        
        const channelName = document.querySelector('#text.ytd-channel-name a')?.textContent?.trim() ||
                           document.querySelector('meta[property="og:site_name"]')?.content ||
                           '';
        
        const duration = document.querySelector('meta[property="og:video:duration"]')?.content ||
                        document.querySelector('.ytp-time-duration')?.textContent?.trim() ||
                        '';
        
        const viewCount = document.querySelector('#count .view-count')?.textContent?.trim() ||
                         document.querySelector('meta[property="og:video:view_count"]')?.content ||
                         '';
        
        const publishDate = document.querySelector('meta[property="og:video:release_date"]')?.content ||
                           document.querySelector('#date')?.textContent?.trim() ||
                           '';

        const thumbnail = document.querySelector('meta[property="og:image"]')?.content ||
                         document.querySelector('link[itemprop="thumbnailUrl"]')?.href ||
                         '';

        return {
          title,
          description,
          channelName,
          duration,
          viewCount,
          publishDate,
          thumbnail
        };
      });

      await page.close();
      return metadata;
    } catch (error) {
      console.error('메타데이터 추출 실패:', error);
      await page.close();
      throw error;
    }
  }

  /**
   * YouTube 자막 추출
   */
  async extractTranscript(videoId) {
    try {
      console.log(`자막 추출 시도: ${videoId}`);
      
      // 한국어 자막 우선 시도
      let transcriptItems = [];
      
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: 'ko',
          country: 'KR'
        });
        console.log('한국어 자막 추출 성공');
      } catch (koError) {
        console.log('한국어 자막 없음, 영어 자막 시도');
        try {
          transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: 'en',
            country: 'US'
          });
          console.log('영어 자막 추출 성공');
        } catch (enError) {
          console.log('영어 자막 없음, 기본 자막 시도');
          transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
          console.log('기본 자막 추출 성공');
        }
      }

      if (!transcriptItems || transcriptItems.length === 0) {
        return null;
      }

      // 자막 텍스트 결합
      const fullTranscript = transcriptItems
        .map(item => item.text)
        .join(' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        language: transcriptItems[0]?.lang || 'unknown',
        text: fullTranscript,
        segments: transcriptItems.map(item => ({
          start: item.offset / 1000,
          duration: item.duration / 1000,
          text: item.text
        }))
      };
    } catch (error) {
      console.error('자막 추출 실패:', error);
      return null;
    }
  }

  /**
   * YouTube 콘텐츠 전체 추출
   */
  async extractContent(url) {
    try {
      console.log(`YouTube 콘텐츠 추출 시작: ${url}`);
      
      // 비디오 ID 추출
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('유효하지 않은 YouTube URL입니다.');
      }

      console.log(`비디오 ID: ${videoId}`);

      // 병렬로 메타데이터와 자막 추출
      const [metadata, transcript] = await Promise.all([
        this.extractVideoMetadata(videoId).catch(error => {
          console.error('메타데이터 추출 실패:', error);
          return {
            title: 'YouTube 비디오',
            description: '',
            channelName: '',
            duration: '',
            viewCount: '',
            publishDate: '',
            thumbnail: ''
          };
        }),
        this.extractTranscript(videoId).catch(error => {
          console.error('자막 추출 실패:', error);
          return null;
        })
      ]);

      // 콘텐츠 조합
      let content = `제목: ${metadata.title}\n\n`;
      
      if (metadata.channelName) {
        content += `채널: ${metadata.channelName}\n`;
      }
      
      if (metadata.description) {
        content += `설명: ${metadata.description}\n\n`;
      }

      if (transcript) {
        content += `자막/스크립트:\n${transcript.text}`;
      } else {
        content += '자막을 사용할 수 없습니다.';
      }

      // 요약 생성 (처음 500자)
      const summary = content.length > 500 
        ? content.substring(0, 500) + '...'
        : content;

      const result = {
        id: `youtube_${videoId}_${Date.now()}`,
        type: 'youtube',
        url,
        videoId,
        title: metadata.title || 'YouTube 비디오',
        content,
        summary,
        metadata: {
          ...metadata,
          transcript: transcript ? {
            language: transcript.language,
            hasTranscript: true,
            segmentCount: transcript.segments.length
          } : {
            hasTranscript: false
          },
          extractedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      };

      console.log('YouTube 콘텐츠 추출 완료');
      return result;

    } catch (error) {
      console.error('YouTube 콘텐츠 추출 실패:', error);
      throw new Error(`YouTube 콘텐츠 추출 실패: ${error.message}`);
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    await this.closeBrowser();
  }
}

module.exports = YouTubeContentExtractor;