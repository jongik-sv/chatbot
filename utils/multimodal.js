/**
 * 멀티모달 입력 처리 유틸리티
 * 이미지, 음성, 파일 등 다양한 입력 형태 처리
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MultimodalProcessor {
  constructor() {
    this.supportedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/gif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'
    ];
    
    this.supportedAudioTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/aac', 'audio/flac', 'audio/m4a'
    ];
    
    this.supportedVideoTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/avi',
      'video/webm', 'video/mkv', 'video/mov'
    ];
    
    this.supportedDocumentTypes = [
      'application/pdf', 'text/plain', 'text/markdown',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * 파일 타입 확인
   */
  getFileType(mimeType) {
    if (this.supportedImageTypes.includes(mimeType)) {
      return 'image';
    } else if (this.supportedAudioTypes.includes(mimeType)) {
      return 'audio';
    } else if (this.supportedVideoTypes.includes(mimeType)) {
      return 'video';
    } else if (this.supportedDocumentTypes.includes(mimeType)) {
      return 'document';
    } else {
      return 'unknown';
    }
  }

  /**
   * 파일 지원 여부 확인
   */
  isFileSupported(mimeType) {
    return this.getFileType(mimeType) !== 'unknown';
  }

  /**
   * 파일 크기 검증
   */
  validateFileSize(fileSize) {
    return fileSize <= this.maxFileSize;
  }

  /**
   * 안전한 파일명 생성
   */
  generateSafeFileName(originalName, mimeType) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = this.getFileExtension(mimeType) || path.extname(originalName);
    const baseName = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${random}_${baseName}${ext}`;
  }

  /**
   * MIME 타입에서 파일 확장자 추출
   */
  getFileExtension(mimeType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'image/heic': '.heic',
      'image/heif': '.heif',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/aac': '.aac',
      'audio/flac': '.flac',
      'audio/m4a': '.m4a',
      'video/mp4': '.mp4',
      'video/mpeg': '.mpeg',
      'video/quicktime': '.mov',
      'video/avi': '.avi',
      'video/webm': '.webm',
      'video/mkv': '.mkv',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    
    return extensions[mimeType] || '';
  }

  /**
   * 파일 저장
   */
  async saveFile(fileBuffer, fileName, mimeType) {
    try {
      // 업로드 디렉토리 생성
      await this.ensureUploadDirectory();
      
      // 파일 타입별 서브디렉토리 생성
      const fileType = this.getFileType(mimeType);
      const subDir = path.join(this.uploadDir, fileType);
      await fs.mkdir(subDir, { recursive: true });
      
      // 안전한 파일명 생성
      const safeFileName = this.generateSafeFileName(fileName, mimeType);
      const filePath = path.join(subDir, safeFileName);
      
      // 파일 저장
      await fs.writeFile(filePath, fileBuffer);
      
      return {
        success: true,
        filePath,
        fileName: safeFileName,
        originalName: fileName,
        size: fileBuffer.length,
        mimeType,
        fileType,
        url: `/uploads/${fileType}/${safeFileName}`
      };
    } catch (error) {
      console.error('파일 저장 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 업로드 디렉토리 생성
   */
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      
      // 서브디렉토리들 생성
      const subDirs = ['image', 'audio', 'video', 'document'];
      for (const subDir of subDirs) {
        await fs.mkdir(path.join(this.uploadDir, subDir), { recursive: true });
      }
    } catch (error) {
      console.error('디렉토리 생성 실패:', error);
    }
  }

  /**
   * 이미지를 Base64로 변환
   */
  async imageToBase64(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return fileBuffer.toString('base64');
    } catch (error) {
      console.error('이미지 Base64 변환 실패:', error);
      throw error;
    }
  }

  /**
   * 이미지 메타데이터 추출
   */
  async extractImageMetadata(filePath, mimeType) {
    try {
      const stats = await fs.stat(filePath);
      
      return {
        size: stats.size,
        mimeType,
        lastModified: stats.mtime,
        // 실제 구현에서는 sharp나 jimp 같은 라이브러리로 width, height 등 추출 가능
        width: null,
        height: null
      };
    } catch (error) {
      console.error('이미지 메타데이터 추출 실패:', error);
      return null;
    }
  }

  /**
   * 오디오 메타데이터 추출
   */
  async extractAudioMetadata(filePath, mimeType) {
    try {
      const stats = await fs.stat(filePath);
      
      return {
        size: stats.size,
        mimeType,
        lastModified: stats.mtime,
        // 실제 구현에서는 node-ffprobe 같은 라이브러리로 duration, bitrate 등 추출 가능
        duration: null,
        bitrate: null
      };
    } catch (error) {
      console.error('오디오 메타데이터 추출 실패:', error);
      return null;
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 임시 파일 정리
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24시간
    try {
      const now = Date.now();
      const dirs = ['image', 'audio', 'video', 'document'];
      
      for (const dir of dirs) {
        const dirPath = path.join(this.uploadDir, dir);
        
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath);
              console.log(`임시 파일 삭제: ${filePath}`);
            }
          }
        } catch (error) {
          console.warn(`디렉토리 정리 실패 (${dir}):`, error.message);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('임시 파일 정리 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 파일 검증
   */
  validateFile(fileName, fileSize, mimeType) {
    const errors = [];
    
    // 파일 크기 검증
    if (!this.validateFileSize(fileSize)) {
      errors.push(`파일 크기가 너무 큽니다. 최대 ${this.maxFileSize / 1024 / 1024}MB까지 허용됩니다.`);
    }
    
    // 파일 타입 검증
    if (!this.isFileSupported(mimeType)) {
      errors.push(`지원되지 않는 파일 형식입니다: ${mimeType}`);
    }
    
    // 파일명 검증
    if (!fileName || fileName.trim().length === 0) {
      errors.push('파일명이 유효하지 않습니다.');
    }
    
    // 악성 파일명 패턴 검사
    const dangerousPatterns = [
      /\.\./,           // 디렉토리 순회
      /[<>:"|?*]/,      // 윈도우 금지 문자
      /^\./,            // 숨김 파일
      /\.exe$/i,        // 실행 파일
      /\.bat$/i,        // 배치 파일
      /\.cmd$/i,        // 명령 파일
      /\.scr$/i,        // 스크린세이버
      /\.com$/i,        // 실행 파일
      /\.pif$/i,        // 프로그램 정보 파일
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(fileName)) {
        errors.push('위험한 파일명 패턴이 감지되었습니다.');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 멀티모달 입력 데이터 준비
   */
  async prepareMultimodalInput(files, text = '') {
    const processedFiles = [];
    const errors = [];
    
    for (const file of files) {
      try {
        const { fileName, fileBuffer, mimeType } = file;
        
        // 파일 검증
        const validation = this.validateFile(fileName, fileBuffer.length, mimeType);
        if (!validation.isValid) {
          errors.push(...validation.errors);
          continue;
        }
        
        // 파일 저장
        const saveResult = await this.saveFile(fileBuffer, fileName, mimeType);
        if (!saveResult.success) {
          errors.push(`파일 저장 실패: ${fileName}`);
          continue;
        }
        
        const fileType = this.getFileType(mimeType);
        const processedFile = {
          ...saveResult,
          fileType,
          metadata: null
        };
        
        // 타입별 메타데이터 추출
        if (fileType === 'image') {
          processedFile.base64 = await this.imageToBase64(saveResult.filePath);
          processedFile.metadata = await this.extractImageMetadata(saveResult.filePath, mimeType);
        } else if (fileType === 'audio') {
          processedFile.metadata = await this.extractAudioMetadata(saveResult.filePath, mimeType);
        }
        
        processedFiles.push(processedFile);
      } catch (error) {
        console.error('파일 처리 실패:', error);
        errors.push(`파일 처리 실패: ${file.fileName}`);
      }
    }
    
    return {
      text,
      files: processedFiles,
      hasImages: processedFiles.some(f => f.fileType === 'image'),
      hasAudio: processedFiles.some(f => f.fileType === 'audio'),
      hasVideo: processedFiles.some(f => f.fileType === 'video'),
      hasDocuments: processedFiles.some(f => f.fileType === 'document'),
      errors
    };
  }

  /**
   * 디스크 사용량 확인
   */
  async getDiskUsage() {
    try {
      const stats = await fs.stat(this.uploadDir);
      // 실제 구현에서는 du 명령어나 별도 라이브러리로 정확한 크기 계산 가능
      return {
        uploadDir: this.uploadDir,
        exists: true,
        // totalSize: 계산된 전체 크기
      };
    } catch (error) {
      return {
        uploadDir: this.uploadDir,
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = MultimodalProcessor;