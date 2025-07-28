import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

export interface ArtifactFile {
  sessionId: string;
  artifactId: string;
  filename: string;
  content: string;
  language: string;
}

export interface ArtifactProject {
  sessionId: string;
  artifactId: string;
  files: ArtifactFile[];
}

export class ArtifactFileManager {
  private basePath: string;

  constructor(basePath: string = path.join(process.cwd(), 'data', 'artifacts')) {
    this.basePath = basePath;
  }

  /**
   * 아티팩트 디렉토리 경로 생성
   */
  private getArtifactPath(sessionId: string, artifactId: string): string {
    return path.join(this.basePath, `session_${sessionId}`, `artifact_${artifactId}`);
  }

  /**
   * 세션 디렉토리 경로 생성
   */
  private getSessionPath(sessionId: string): string {
    return path.join(this.basePath, `session_${sessionId}`);
  }

  /**
   * 언어별 파일 확장자 결정
   */
  private getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
      'html': '.html',
      'css': '.css',
      'javascript': '.js',
      'typescript': '.ts',
      'python': '.py',
      'java': '.java',
      'cpp': '.cpp',
      'c': '.c',
      'go': '.go',
      'rust': '.rs',
      'php': '.php',
      'ruby': '.rb',
      'json': '.json',
      'xml': '.xml',
      'markdown': '.md',
      'yaml': '.yml',
      'sql': '.sql',
      'shell': '.sh',
      'powershell': '.ps1',
      'jsx': '.jsx',
      'tsx': '.tsx',
      'vue': '.vue',
      'svelte': '.svelte'
    };
    
    return extensions[language.toLowerCase()] || '.txt';
  }

  /**
   * 메인 파일명 결정 (실행 가능한 파일)
   */
  private getMainFilename(language: string): string {
    const mainFiles: { [key: string]: string } = {
      'html': 'index.html',
      'javascript': 'script.js',
      'typescript': 'script.ts',
      'python': 'main.py',
      'java': 'Main.java',
      'cpp': 'main.cpp',
      'c': 'main.c',
      'go': 'main.go',
      'rust': 'main.rs',
      'php': 'index.php',
      'ruby': 'main.rb'
    };
    
    return mainFiles[language.toLowerCase()] || `main${this.getFileExtension(language)}`;
  }

  /**
   * 아티팩트 디렉토리 생성
   */
  private async ensureArtifactDirectory(sessionId: string, artifactId: string): Promise<string> {
    const artifactPath = this.getArtifactPath(sessionId, artifactId);
    
    try {
      await mkdir(artifactPath, { recursive: true });
      return artifactPath;
    } catch (error) {
      throw new Error(`Failed to create artifact directory: ${error}`);
    }
  }

  /**
   * 단일 아티팩트 파일 저장
   */
  async saveArtifact(artifact: ArtifactFile): Promise<string> {
    const { sessionId, artifactId, content, language, filename } = artifact;
    
    try {
      const artifactPath = await this.ensureArtifactDirectory(sessionId, artifactId);
      
      // 파일명이 지정되지 않은 경우 언어별 기본 파일명 사용
      const finalFilename = filename || this.getMainFilename(language);
      const filePath = path.join(artifactPath, finalFilename);
      
      await writeFile(filePath, content, 'utf8');
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save artifact: ${error}`);
    }
  }

  /**
   * 다중 파일 아티팩트 프로젝트 저장
   */
  async saveArtifactProject(project: ArtifactProject): Promise<string[]> {
    const { sessionId, artifactId, files } = project;
    
    try {
      const artifactPath = await this.ensureArtifactDirectory(sessionId, artifactId);
      const savedFiles: string[] = [];
      
      for (const file of files) {
        const filename = file.filename || this.getMainFilename(file.language);
        const filePath = path.join(artifactPath, filename);
        
        await writeFile(filePath, file.content, 'utf8');
        savedFiles.push(filePath);
      }
      
      // HTML 프로젝트인 경우 자동으로 CSS/JS 링크 추가
      if (files.some(f => f.language === 'html')) {
        await this.linkHtmlAssets(artifactPath, files);
      }
      
      return savedFiles;
    } catch (error) {
      throw new Error(`Failed to save artifact project: ${error}`);
    }
  }

  /**
   * HTML 파일에 CSS/JS 링크 자동 추가
   */
  private async linkHtmlAssets(artifactPath: string, files: ArtifactFile[]): Promise<void> {
    const htmlFile = files.find(f => f.language === 'html');
    const cssFiles = files.filter(f => f.language === 'css');
    const jsFiles = files.filter(f => f.language === 'javascript');
    
    if (!htmlFile) return;
    
    let htmlContent = htmlFile.content;
    
    // CSS 링크 추가
    for (const cssFile of cssFiles) {
      const cssFilename = cssFile.filename || 'style.css';
      const cssLink = `<link rel="stylesheet" href="./${cssFilename}">`;
      
      if (!htmlContent.includes(cssLink)) {
        if (htmlContent.includes('</head>')) {
          htmlContent = htmlContent.replace('</head>', `  ${cssLink}\n</head>`);
        } else {
          htmlContent = `${cssLink}\n${htmlContent}`;
        }
      }
    }
    
    // JavaScript 링크 추가
    for (const jsFile of jsFiles) {
      const jsFilename = jsFile.filename || 'script.js';
      const jsScript = `<script src="./${jsFilename}"></script>`;
      
      if (!htmlContent.includes(jsScript)) {
        if (htmlContent.includes('</body>')) {
          htmlContent = htmlContent.replace('</body>', `  ${jsScript}\n</body>`);
        } else {
          htmlContent = `${htmlContent}\n${jsScript}`;
        }
      }
    }
    
    // 수정된 HTML 파일 저장
    const htmlFilename = htmlFile.filename || 'index.html';
    const htmlFilePath = path.join(artifactPath, htmlFilename);
    await writeFile(htmlFilePath, htmlContent, 'utf8');
  }

  /**
   * 아티팩트 파일 읽기
   */
  async readArtifact(sessionId: string, artifactId: string, filename?: string): Promise<string> {
    try {
      const artifactPath = this.getArtifactPath(sessionId, artifactId);
      
      if (filename) {
        const filePath = path.join(artifactPath, filename);
        return await readFile(filePath, 'utf8');
      } else {
        // 메인 파일 찾기 (index.html, main.py 등)
        const files = await readdir(artifactPath);
        const mainFile = files.find(f => 
          f.startsWith('index.') || f.startsWith('main.') || f.endsWith('.html')
        ) || files[0];
        
        if (!mainFile) {
          throw new Error('No files found in artifact directory');
        }
        
        const filePath = path.join(artifactPath, mainFile);
        return await readFile(filePath, 'utf8');
      }
    } catch (error) {
      throw new Error(`Failed to read artifact: ${error}`);
    }
  }

  /**
   * 아티팩트 프로젝트의 모든 파일 목록 조회
   */
  async listArtifactFiles(sessionId: string, artifactId: string): Promise<string[]> {
    try {
      const artifactPath = this.getArtifactPath(sessionId, artifactId);
      return await readdir(artifactPath);
    } catch (error) {
      throw new Error(`Failed to list artifact files: ${error}`);
    }
  }

  /**
   * 아티팩트 삭제
   */
  async deleteArtifact(sessionId: string, artifactId: string): Promise<void> {
    try {
      const artifactPath = this.getArtifactPath(sessionId, artifactId);
      
      // 디렉토리 내 모든 파일 삭제
      const files = await readdir(artifactPath);
      for (const file of files) {
        await unlink(path.join(artifactPath, file));
      }
      
      // 디렉토리 삭제
      await rmdir(artifactPath);
    } catch (error) {
      throw new Error(`Failed to delete artifact: ${error}`);
    }
  }

  /**
   * 세션별 모든 아티팩트 삭제
   */
  async deleteSessionArtifacts(sessionId: string): Promise<void> {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      
      const artifacts = await readdir(sessionPath);
      
      for (const artifact of artifacts) {
        const artifactPath = path.join(sessionPath, artifact);
        
        // 아티팩트 디렉토리 내 모든 파일 삭제
        const files = await readdir(artifactPath);
        for (const file of files) {
          await unlink(path.join(artifactPath, file));
        }
        
        // 아티팩트 디렉토리 삭제
        await rmdir(artifactPath);
      }
      
      // 세션 디렉토리 삭제
      await rmdir(sessionPath);
    } catch (error) {
      throw new Error(`Failed to delete session artifacts: ${error}`);
    }
  }

  /**
   * 아티팩트 실행 URL 생성
   */
  getArtifactUrl(sessionId: string, artifactId: string, filename: string = 'index.html'): string {
    return `/artifacts/${sessionId}/${artifactId}/${filename}`;
  }

  /**
   * 아티팩트 존재 여부 확인
   */
  async artifactExists(sessionId: string, artifactId: string): Promise<boolean> {
    try {
      const artifactPath = this.getArtifactPath(sessionId, artifactId);
      await stat(artifactPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 오래된 아티팩트 정리 (7일 이상)
   */
  async cleanupOldArtifacts(daysOld: number = 7): Promise<number> {
    let cleanedCount = 0;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    try {
      const sessions = await readdir(this.basePath);
      
      for (const session of sessions) {
        const sessionPath = path.join(this.basePath, session);
        const artifacts = await readdir(sessionPath);
        
        for (const artifact of artifacts) {
          const artifactPath = path.join(sessionPath, artifact);
          const stats = await stat(artifactPath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            // 아티팩트 삭제
            const files = await readdir(artifactPath);
            for (const file of files) {
              await unlink(path.join(artifactPath, file));
            }
            await rmdir(artifactPath);
            cleanedCount++;
          }
        }
        
        // 빈 세션 디렉토리 삭제
        const remainingArtifacts = await readdir(sessionPath);
        if (remainingArtifacts.length === 0) {
          await rmdir(sessionPath);
        }
      }
    } catch (error) {
      console.error('Error during artifact cleanup:', error);
    }
    
    return cleanedCount;
  }
}

// 싱글톤 인스턴스 export
export const artifactFileManager = new ArtifactFileManager();