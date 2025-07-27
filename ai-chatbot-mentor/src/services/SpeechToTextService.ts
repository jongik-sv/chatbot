/**
 * Speech-to-Text 변환 서비스
 * 웹 브라우저의 Web Speech API를 활용한 음성 인식
 */

export interface SpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class SpeechToTextService {
  private recognition: any;
  private isSupported: boolean;
  private isListening: boolean = false;

  constructor() {
    // 브라우저 지원 확인
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;
      this.setupRecognition();
    } else {
      this.isSupported = false;
      console.warn('Speech Recognition API가 지원되지 않는 브라우저입니다.');
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // 기본 설정
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ko-KR'; // 한국어 기본 설정
  }

  /**
   * 브라우저 지원 여부 확인
   */
  isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * 현재 음성 인식 상태 확인
   */
  getListeningStatus(): boolean {
    return this.isListening;
  }

  /**
   * 음성 인식 시작
   */
  async startListening(
    options: SpeechToTextOptions = {},
    onResult?: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Speech Recognition이 지원되지 않는 브라우저입니다.');
    }

    if (this.isListening) {
      throw new Error('이미 음성 인식이 진행 중입니다.');
    }

    // 옵션 설정
    this.recognition.lang = options.language || 'ko-KR';
    this.recognition.continuous = options.continuous || false;
    this.recognition.interimResults = options.interimResults || true;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    return new Promise((resolve, reject) => {
      // 결과 처리
      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;

          if (onResult) {
            onResult({
              transcript,
              confidence,
              isFinal: result.isFinal
            });
          }
        }
      };

      // 시작 이벤트
      this.recognition.onstart = () => {
        this.isListening = true;
        resolve();
      };

      // 종료 이벤트
      this.recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      // 에러 처리
      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        const errorMessage = this.getErrorMessage(event.error);
        
        if (onError) {
          onError(errorMessage);
        } else {
          reject(new Error(errorMessage));
        }
      };

      // 음성 인식 시작
      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * 음성 인식 중지
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * 음성 인식 강제 중단
   */
  abortListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
    }
  }

  /**
   * 지원되는 언어 목록 (주요 언어만)
   */
  getSupportedLanguages(): Array<{code: string, name: string}> {
    return [
      { code: 'ko-KR', name: '한국어' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'zh-CN', name: '中文 (简体)' },
      { code: 'zh-TW', name: '中文 (繁體)' },
      { code: 'es-ES', name: 'Español' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'ru-RU', name: 'Русский' }
    ];
  }

  /**
   * 오디오 파일에서 텍스트 추출 (향후 구현)
   * 현재는 브라우저 API 제한으로 실시간 음성 인식만 지원
   */
  async transcribeAudioFile(audioBlob: Blob): Promise<string> {
    // 실제 구현을 위해서는 외부 API 연동이 필요
    // Google Speech-to-Text API, OpenAI Whisper API 등
    
    console.warn('오디오 파일 변환 기능은 향후 구현 예정입니다.');
    return '[오디오 파일이 업로드되었습니다. 음성 변환 기능은 개발 중입니다.]';
  }

  /**
   * 에러 메시지 변환
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'no-speech':
        return '음성이 감지되지 않았습니다. 다시 시도해 주세요.';
      case 'audio-capture':
        return '마이크에 접근할 수 없습니다. 마이크 권한을 확인해 주세요.';
      case 'not-allowed':
        return '마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.';
      case 'network':
        return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
      case 'service-not-allowed':
        return '음성 인식 서비스를 사용할 수 없습니다.';
      case 'bad-grammar':
        return '음성 인식 문법 오류가 발생했습니다.';
      case 'language-not-supported':
        return '선택한 언어가 지원되지 않습니다.';
      default:
        return `음성 인식 오류가 발생했습니다. (${errorCode})`;
    }
  }

  /**
   * 권한 요청 및 확인
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 스트림 즉시 중지
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('마이크 권한 요청 실패:', error);
      return false;
    }
  }
}