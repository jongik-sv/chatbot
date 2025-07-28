import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedDate?: string;
  tags?: string[];
  images?: string[];
  links?: string[];
  wordCount: number;
  language?: string;
}

interface ScrapingOptions {
  useJavaScript?: boolean; // true면 Puppeteer 사용
  timeout?: number;
  userAgent?: string;
  waitForSelector?: string;
  removeElements?: string[]; // 제거할 요소들 (광고, 내비게이션 등)
  extractImages?: boolean;
  extractLinks?: boolean;
  maxContentLength?: number;
}

export class WebScrapingService {
  private static instance: WebScrapingService;
  private browser: puppeteer.Browser | null = null;

  private constructor() {}

  public static getInstance(): WebScrapingService {
    if (!WebScrapingService.instance) {
      WebScrapingService.instance = new WebScrapingService();
    }
    return WebScrapingService.instance;
  }

  /**
   * 브라우저 인스턴스 초기화
   */
  private async initBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        });
      } catch (error) {
        console.error('Puppeteer 브라우저 초기화 실패:', error);
        throw new Error('브라우저를 초기화할 수 없습니다.');
      }
    }
    return this.browser;
  }

  /**
   * 브라우저 종료
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * URL 유효성 검사
   */
  public isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Axios를 사용한 기본 웹 스크래핑
   */
  private async scrapeWithAxios(url: string, options: ScrapingOptions): Promise<ScrapedContent> {
    const {
      timeout = 15000,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    } = options;

    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      return this.parseHtmlContent(response.data, url, options);
    } catch (error) {
      console.error('Axios 스크래핑 실패:', error);
      throw new Error(`웹페이지를 가져올 수 없습니다: ${error}`);
    }
  }

  /**
   * Puppeteer를 사용한 고급 웹 스크래핑 (JavaScript 필요한 사이트)
   */
  private async scrapeWithPuppeteer(url: string, options: ScrapingOptions): Promise<ScrapedContent> {
    const {
      timeout = 30000,
      waitForSelector,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    } = options;

    let page: puppeteer.Page | null = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      await page.setUserAgent(userAgent);
      await page.setViewport({ width: 1920, height: 1080 });

      // 네트워크 요청 차단 (이미지, 폰트, CSS 등 - 성능 향상)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'font', 'stylesheet'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout 
      });

      // 특정 선택자 대기
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }

      // 페이지 내용 가져오기
      const html = await page.content();

      return this.parseHtmlContent(html, url, options);
    } catch (error) {
      console.error('Puppeteer 스크래핑 실패:', error);
      throw new Error(`JavaScript 렌더링 페이지를 가져올 수 없습니다: ${error}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * HTML 콘텐츠 파싱
   */
  private parseHtmlContent(html: string, url: string, options: ScrapingOptions): ScrapedContent {
    const $ = cheerio.load(html);
    const {
      removeElements = ['script', 'style', 'nav', 'header', 'footer', '.advertisement', '.ads', '#ads'],
      extractImages = false,
      extractLinks = false,
      maxContentLength = 50000
    } = options;

    // 불필요한 요소 제거
    removeElements.forEach(selector => {
      $(selector).remove();
    });

    // 기본 메타데이터 추출
    const title = this.extractTitle($);
    const author = this.extractAuthor($);
    const publishedDate = this.extractPublishedDate($);
    const language = this.extractLanguage($);

    // 메인 콘텐츠 추출
    const content = this.extractMainContent($);
    const excerpt = this.generateExcerpt(content);
    const wordCount = this.countWords(content);

    // 선택적 데이터 추출
    const images = extractImages ? this.extractImages($, url) : [];
    const links = extractLinks ? this.extractLinks($, url) : [];
    const tags = this.extractTags($);

    // 콘텐츠 길이 제한
    const trimmedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...'
      : content;

    return {
      url,
      title,
      content: trimmedContent,
      excerpt,
      author,
      publishedDate,
      tags,
      images,
      links,
      wordCount,
      language
    };
  }

  /**
   * 제목 추출
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // 우선순위: h1 > og:title > title 태그
    let title = $('h1').first().text().trim();
    
    if (!title) {
      title = $('meta[property="og:title"]').attr('content')?.trim() || '';
    }
    
    if (!title) {
      title = $('title').text().trim();
    }

    return title || '제목 없음';
  }

  /**
   * 작성자 추출
   */
  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author',
      '.byline',
      '[rel="author"]'
    ];

    for (const selector of authorSelectors) {
      const author = $(selector).attr('content') || $(selector).text().trim();
      if (author) return author;
    }

    return undefined;
  }

  /**
   * 발행일 추출
   */
  private extractPublishedDate($: cheerio.CheerioAPI): string | undefined {
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="publication_date"]',
      'time[datetime]',
      '.published',
      '.date'
    ];

    for (const selector of dateSelectors) {
      const date = $(selector).attr('content') || $(selector).attr('datetime') || $(selector).text().trim();
      if (date) return date;
    }

    return undefined;
  }

  /**
   * 언어 추출
   */
  private extractLanguage($: cheerio.CheerioAPI): string | undefined {
    return $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
  }

  /**
   * 메인 콘텐츠 추출
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // 콘텐츠 우선순위 선택자
    const contentSelectors = [
      'article',
      'main',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '#content',
      '.main-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 100) {
        return this.cleanText(element.text());
      }
    }

    // 메인 콘텐츠를 찾지 못한 경우 body에서 추출
    const bodyText = $('body').text();
    return this.cleanText(bodyText);
  }

  /**
   * 텍스트 정제
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // 연속된 공백을 하나로
      .replace(/\n\s*\n/g, '\n')  // 연속된 줄바꿈 정리
      .trim();
  }

  /**
   * 요약 생성
   */
  private generateExcerpt(content: string, maxLength: number = 300): string {
    if (content.length <= maxLength) {
      return content;
    }

    // 문장 단위로 자르기
    const sentences = content.split(/[.!?]+/);
    let excerpt = '';
    
    for (const sentence of sentences) {
      if ((excerpt + sentence).length > maxLength) break;
      excerpt += sentence + '. ';
    }

    return excerpt.trim() || content.substring(0, maxLength) + '...';
  }

  /**
   * 단어 수 계산
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 이미지 추출
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    
    $('img').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          const imageUrl = new URL(src, baseUrl).href;
          images.push(imageUrl);
        } catch {
          // 유효하지 않은 URL 무시
        }
      }
    });

    return [...new Set(images)]; // 중복 제거
  }

  /**
   * 링크 추출
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        try {
          const linkUrl = new URL(href, baseUrl).href;
          links.push(linkUrl);
        } catch {
          // 유효하지 않은 URL 무시
        }
      }
    });

    return [...new Set(links)]; // 중복 제거
  }

  /**
   * 태그 추출
   */
  private extractTags($: cheerio.CheerioAPI): string[] {
    const tags: string[] = [];
    
    // 메타 키워드
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      tags.push(...keywords.split(',').map(tag => tag.trim()));
    }

    // 해시태그
    $('.tag, .hashtag, [class*="tag"]').each((_, element) => {
      const tag = $(element).text().trim();
      if (tag) tags.push(tag);
    });

    return [...new Set(tags)]; // 중복 제거
  }

  /**
   * 웹페이지 스크래핑 메인 메서드
   */
  public async scrapeWebsite(url: string, options: ScrapingOptions = {}): Promise<ScrapedContent> {
    if (!this.isValidUrl(url)) {
      throw new Error('유효하지 않은 URL입니다.');
    }

    try {
      if (options.useJavaScript) {
        return await this.scrapeWithPuppeteer(url, options);
      } else {
        return await this.scrapeWithAxios(url, options);
      }
    } catch (error) {
      // Axios 실패 시 Puppeteer로 재시도
      if (!options.useJavaScript) {
        console.log('Axios 스크래핑 실패, Puppeteer로 재시도...');
        try {
          return await this.scrapeWithPuppeteer(url, { ...options, useJavaScript: true });
        } catch (puppeteerError) {
          throw error; // 원래 에러 반환
        }
      }
      throw error;
    }
  }

  /**
   * 여러 URL 일괄 스크래핑
   */
  public async scrapeMultipleWebsites(
    urls: string[], 
    options: ScrapingOptions = {},
    concurrency: number = 3
  ): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    
    // 동시 실행 제한
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => 
        this.scrapeWebsite(url, options).catch(error => {
          console.error(`URL 스크래핑 실패 ${url}:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as ScrapedContent[]);
    }

    return results;
  }
}

export default WebScrapingService;