const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class WebsiteContentExtractor {
  constructor() {
    this.browser = null;
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
          '--disable-features=VizDisplayCompositor',
          '--disable-images',
          '--disable-plugins',
          '--disable-extensions'
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
   * 정적 HTML 추출 (Cheerio 사용)
   */
  async extractStaticContent(url) {
    try {
      console.log(`정적 콘텐츠 추출 시도: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // 불필요한 요소 제거
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
      
      // 메타데이터 추출
      const metadata = {
        title: $('title').text().trim() || 
               $('meta[property="og:title"]').attr('content') || 
               $('h1').first().text().trim() || 
               'Untitled',
        description: $('meta[name="description"]').attr('content') || 
                    $('meta[property="og:description"]').attr('content') || 
                    '',
        keywords: $('meta[name="keywords"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') || 
               $('meta[property="article:author"]').attr('content') || 
               '',
        publishDate: $('meta[property="article:published_time"]').attr('content') || 
                    $('meta[name="date"]').attr('content') || 
                    '',
        siteName: $('meta[property="og:site_name"]').attr('content') || 
                 new URL(url).hostname,
        image: $('meta[property="og:image"]').attr('content') || 
               $('meta[name="twitter:image"]').attr('content') || 
               ''
      };

      // 본문 콘텐츠 추출
      let content = '';
      
      // 일반적인 본문 선택자들 시도
      const contentSelectors = [
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        'main',
        '.main-content',
        '#content',
        '.post-body',
        '.article-body'
      ];

      let $mainContent = null;
      for (const selector of contentSelectors) {
        $mainContent = $(selector);
        if ($mainContent.length > 0 && $mainContent.text().trim().length > 100) {
          break;
        }
      }

      // 본문을 찾지 못한 경우 body에서 추출
      if (!$mainContent || $mainContent.length === 0) {
        $mainContent = $('body');
      }

      // 텍스트 추출 및 정제
      content = $mainContent.text()
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // 제목과 본문을 결합
      const fullContent = `제목: ${metadata.title}\n\n` +
                         (metadata.description ? `설명: ${metadata.description}\n\n` : '') +
                         `내용:\n${content}`;

      return {
        title: metadata.title,
        content: fullContent,
        metadata,
        method: 'static'
      };

    } catch (error) {
      console.error('정적 콘텐츠 추출 실패:', error);
      throw error;
    }
  }

  /**
   * 동적 콘텐츠 추출 (Puppeteer 사용)
   */
  async extractDynamicContent(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      console.log(`동적 콘텐츠 추출 시도: ${url}`);

      // 페이지 설정
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1280, height: 720 });

      // 페이지 로드
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // JavaScript 실행 대기
      await page.waitForTimeout(3000);

      // 페이지 콘텐츠 추출
      const result = await page.evaluate(() => {
        // 불필요한 요소 제거
        const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share');
        elementsToRemove.forEach(el => el.remove());

        // 메타데이터 추출
        const metadata = {
          title: document.title || 
                 document.querySelector('meta[property="og:title"]')?.content || 
                 document.querySelector('h1')?.textContent?.trim() || 
                 'Untitled',
          description: document.querySelector('meta[name="description"]')?.content || 
                      document.querySelector('meta[property="og:description"]')?.content || 
                      '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || '',
          author: document.querySelector('meta[name="author"]')?.content || 
                 document.querySelector('meta[property="article:author"]')?.content || 
                 '',
          publishDate: document.querySelector('meta[property="article:published_time"]')?.content || 
                      document.querySelector('meta[name="date"]')?.content || 
                      '',
          siteName: document.querySelector('meta[property="og:site_name"]')?.content || 
                   window.location.hostname,
          image: document.querySelector('meta[property="og:image"]')?.content || 
                 document.querySelector('meta[name="twitter:image"]')?.content || 
                 ''
        };

        // 본문 콘텐츠 추출
        const contentSelectors = [
          'article',
          '.content',
          '.post-content',
          '.entry-content',
          '.article-content',
          'main',
          '.main-content',
          '#content',
          '.post-body',
          '.article-body'
        ];

        let mainContent = null;
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim().length > 100) {
            mainContent = element;
            break;
          }
        }

        // 본문을 찾지 못한 경우 body에서 추출
        if (!mainContent) {
          mainContent = document.body;
        }

        const content = mainContent.textContent
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        return {
          title: metadata.title,
          content,
          metadata
        };
      });

      await page.close();

      // 제목과 본문을 결합
      const fullContent = `제목: ${result.title}\n\n` +
                         (result.metadata.description ? `설명: ${result.metadata.description}\n\n` : '') +
                         `내용:\n${result.content}`;

      return {
        title: result.title,
        content: fullContent,
        metadata: result.metadata,
        method: 'dynamic'
      };

    } catch (error) {
      console.error('동적 콘텐츠 추출 실패:', error);
      await page.close();
      throw error;
    }
  }

  /**
   * 웹사이트의 복잡도를 판단하여 적절한 추출 방법 선택
   */
  determineExtractionMethod(url) {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // JavaScript가 많이 필요한 사이트들
    const dynamicSites = [
      'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
      'linkedin.com', 'pinterest.com', 'tiktok.com',
      'discord.com', 'slack.com', 'notion.so'
    ];
    
    // 정적 추출이 잘 되는 사이트들
    const staticSites = [
      'wikipedia.org', 'github.com', 'stackoverflow.com',
      'reddit.com', 'medium.com', 'dev.to', 'hackernews.com'
    ];

    if (dynamicSites.some(site => hostname.includes(site))) {
      return 'dynamic';
    } else if (staticSites.some(site => hostname.includes(site))) {
      return 'static';  
    } else {
      return 'auto'; // 자동 판단
    }
  }

  /**
   * 웹사이트 콘텐츠 추출 (메인 함수)
   */
  async extractContent(url, options = {}) {
    try {
      console.log(`웹사이트 콘텐츠 추출 시작: ${url}`);
      
      const { useJavaScript = false, timeout = 30000 } = options;
      
      // 추출 방법 결정
      let method = useJavaScript ? 'dynamic' : this.determineExtractionMethod(url);
      
      let result;
      
      if (method === 'static') {
        result = await this.extractStaticContent(url);
      } else if (method === 'dynamic') {
        result = await this.extractDynamicContent(url);
      } else {
        // 자동 판단: 먼저 정적 추출 시도, 실패하면 동적 추출
        try {
          result = await this.extractStaticContent(url);
          // 추출된 콘텐츠가 너무 짧으면 동적 추출 시도
          if (result.content.length < 200) {
            console.log('정적 추출 결과가 부족하여 동적 추출 시도');
            result = await this.extractDynamicContent(url);
          }
        } catch (staticError) {
          console.log('정적 추출 실패, 동적 추출 시도:', staticError.message);
          result = await this.extractDynamicContent(url);
        }
      }

      // 요약 생성 (처음 500자)
      const summary = result.content.length > 500 
        ? result.content.substring(0, 500) + '...'
        : result.content;

      const finalResult = {
        id: `website_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'website',
        url,
        title: result.title,
        content: result.content,
        summary,
        metadata: {
          ...result.metadata,
          extractionMethod: result.method,
          extractedAt: new Date().toISOString(),
          contentLength: result.content.length,
          domain: new URL(url).hostname
        },
        createdAt: new Date().toISOString()
      };

      console.log('웹사이트 콘텐츠 추출 완료');
      return finalResult;

    } catch (error) {
      console.error('웹사이트 콘텐츠 추출 실패:', error);
      throw new Error(`웹사이트 콘텐츠 추출 실패: ${error.message}`);
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    await this.closeBrowser();
  }
}

module.exports = WebsiteContentExtractor;