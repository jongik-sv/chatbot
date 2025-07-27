# AI 멀티모달 멘토 챗봇

Next.js 기반의 AI 멘토 챗봇으로, Ollama 로컬 LLM과 Google Gemini API를 통합하여 다양한 AI 모델을 활용할 수 있습니다. RAG(Retrieval-Augmented Generation) 기능을 통해 사용자 문서를 기반으로 한 맞춤형 답변을 제공하며, MCP(Model Context Protocol)를 통해 확장된 기능을 지원합니다.

## 🚀 주요 기능

### 📱 멀티모달 입력 지원
- **텍스트**: 일반적인 텍스트 대화
- **이미지**: 이미지 업로드 및 분석 (JPG, PNG, WebP, GIF 등)
- **음성**: 음성 입력 및 텍스트 변환
- **문서**: PDF, DOCX, TXT 등 문서 업로드 및 분석

### 🤖 다중 AI 모델 지원
- **Ollama 로컬 모델**: Llama2, Llama3, CodeLlama, Mistral, LLaVA 등
- **Google Gemini**: Gemini Pro, Gemini Flash, Gemini Pro Vision
- **자동 폴백**: 모델 오류 시 자동으로 대체 모델 사용
- **실시간 스트리밍**: 실시간 응답 생성

### 👨‍🏫 커스텀 멘토 시스템
- **MBTI 기반 멘토**: 16가지 MBTI 유형별 성격 멘토
- **커스텀 GPT**: ChatGPT GPTs와 유사한 특화 어시스턴트 생성
- **자동 멘토 생성**: 대화를 통한 맞춤형 멘토 자동 생성
- **지식 베이스**: 유튜브, 웹페이지, 문서를 통한 멘토 배경지식 확장

### 📚 RAG 및 문서 분석
- **문서 기반 대화**: NotebookLM과 유사한 문서 전용 질의응답
- **벡터 검색**: 관련 문서 청크 자동 검색
- **출처 인용**: 답변에 참조 문서 명시
- **다양한 파일 형식**: PDF, DOCX, TXT, MD 지원

### 🎨 아티팩트 시스템
- **코드 생성**: 구문 강조와 함께 코드 표시 및 편집
- **문서 생성**: 마크다운 렌더링 및 실시간 편집
- **차트 생성**: Mermaid 다이어그램 및 Chart.js 시각화
- **파일 다운로드**: 생성된 콘텐츠 저장 및 공유

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite with better-sqlite3
- **AI Integration**: 
  - Ollama API
  - Google Gemini API (@google/generative-ai)
- **File Processing**: 멀티모달 파일 처리 시스템
- **Vector Storage**: 임베딩 기반 유사도 검색

## 📋 사전 요구사항

### 1. Node.js 설치
- **Node.js 18.0 이상** 필요
- [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드

### 2. Ollama 설치 (선택사항)
로컬 LLM을 사용하려면 Ollama를 설치해야 합니다:

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri https://ollama.ai/install.ps1 | Invoke-Expression

# macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 3. Google API 키 (선택사항)
Google Gemini를 사용하려면 API 키가 필요합니다:
1. [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 생성
2. `.env.local` 파일에 설정

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd chatbot

# 의존성 설치
npm install
```

### 2. 환경 변수 설정

```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local
```

`.env.local` 파일을 열어 다음 값들을 설정하세요:

```env
# 데이터베이스 설정
DATABASE_PATH=./data/chatbot.db

# Google Gemini API 키 (선택사항)
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Ollama 설정 (기본값: http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434

# 서버 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# 파일 업로드 설정
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# 개발 환경 설정
NODE_ENV=development
DEBUG=true
```

### 3. 데이터베이스 초기화

```bash
# SQLite 데이터베이스 생성 및 테이블 설정
node scripts/init-db.js
```

성공적으로 실행되면 다음과 같은 메시지가 표시됩니다:
```
🚀 데이터베이스 초기화를 시작합니다...
📍 데이터베이스 경로: C:\project\chatbot\data\chatbot.db
✅ SQLite 데이터베이스에 연결되었습니다.
✅ 모든 테이블이 성공적으로 생성되었습니다.
✅ 모든 인덱스가 성공적으로 생성되었습니다.
✅ 기본 데이터가 성공적으로 삽입되었습니다.
🎉 데이터베이스 초기화가 완료되었습니다!
```

### 4. Ollama 모델 다운로드 (선택사항)

Ollama를 사용하려면 먼저 모델을 다운로드해야 합니다:

```bash
# Ollama 서비스 시작
ollama serve

# 다른 터미널에서 모델 다운로드
ollama pull llama2        # 기본 텍스트 모델
ollama pull llava         # 멀티모달 모델 (이미지 지원)
ollama pull codellama     # 코드 생성 특화 모델
```

### 5. 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev
```

브라우저에서 http://localhost:3000 으로 접속하면 챗봇을 사용할 수 있습니다.

## 🔧 사용 방법

### 1. 기본 채팅
1. 메인 페이지에서 모델을 선택합니다
2. 텍스트를 입력하고 전송합니다
3. AI가 실시간으로 응답을 생성합니다

### 2. 멀티모달 입력
- **이미지**: 이미지 업로드 버튼을 클릭하여 이미지를 업로드
- **파일**: 파일 첨부 버튼을 클릭하여 문서 업로드
- **음성**: 마이크 버튼을 클릭하여 음성 입력 (향후 구현)

### 3. 모델 전환
- 상단의 모델 선택 드롭다운에서 원하는 모델 선택
- Ollama 모델과 Gemini 모델 간 자유로운 전환 가능
- 모델 오류 시 자동으로 대체 모델 사용

### 4. 멘토 시스템 (향후 구현)
- MBTI 멘토: 16가지 성격 유형 중 선택
- 커스텀 멘토: 특정 분야 전문가 생성
- 자동 생성: 대화를 통한 맞춤형 멘토 생성

## 🛠️ 개발 가이드

### 프로젝트 구조

```
chatbot/
├── pages/                 # Next.js 페이지
│   └── api/               # API 엔드포인트
│       └── models.js      # 모델 관리 API
├── services/              # 비즈니스 로직
│   ├── OllamaService.js   # Ollama API 클라이언트
│   ├── GeminiService.js   # Google Gemini 클라이언트
│   └── LLMService.js      # 통합 LLM 서비스
├── lib/                   # 유틸리티 및 공통 라이브러리
│   └── database.js        # 데이터베이스 연결 관리
├── utils/                 # 헬퍼 함수들
│   └── multimodal.js      # 멀티모달 파일 처리
├── scripts/               # 설정 스크립트
│   └── init-db.js         # 데이터베이스 초기화
├── config/                # 설정 파일들
│   └── database.js        # DB 설정
├── data/                  # 데이터베이스 파일 (자동 생성)
├── uploads/               # 업로드된 파일들 (자동 생성)
└── ai-chatbot-mentor/     # React 컴포넌트들
    └── src/
        └── components/    # UI 컴포넌트
```

### API 엔드포인트

#### 모델 관리
- `GET /api/models` - 사용 가능한 모델 목록 조회
- `POST /api/models` - 모델 관련 액션 (test, pull, delete 등)

#### 채팅 (향후 구현)
- `POST /api/chat` - 메시지 전송 및 응답 생성
- `GET /api/sessions` - 채팅 세션 목록 조회
- `GET /api/sessions/:id` - 특정 세션 조회

#### 파일 처리 (향후 구현)
- `POST /api/upload` - 파일 업로드
- `GET /api/files/:id` - 파일 다운로드

### 데이터베이스 스키마

주요 테이블:
- `users` - 사용자 정보
- `chat_sessions` - 채팅 세션
- `messages` - 메시지 기록
- `mentors` - 커스텀 멘토 정보
- `documents` - 업로드된 문서
- `embeddings` - 벡터 임베딩
- `artifacts` - 생성된 아티팩트

## 🔍 문제 해결

### 일반적인 문제들

#### 1. Ollama 연결 오류
```bash
# Ollama 서비스 상태 확인
ollama serve

# 포트 확인 (기본: 11434)
netstat -an | findstr 11434
```

#### 2. Google Gemini API 오류
- API 키가 올바른지 확인
- API 사용량 한도 확인
- `.env.local` 파일에 올바르게 설정되었는지 확인

#### 3. 데이터베이스 오류
```bash
# 데이터베이스 재초기화
rm -rf data/
node scripts/init-db.js
```

#### 4. 파일 업로드 오류
- 파일 크기 확인 (기본 최대: 10MB)
- 지원되는 파일 형식인지 확인
- `uploads/` 디렉토리 권한 확인

### 로그 확인

```bash
# 개발 모드에서 자세한 로그 확인
DEBUG=true npm run dev
```

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋합니다 (`git commit -am '새 기능 추가'`)
4. 브랜치에 푸시합니다 (`git push origin feature/새기능`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🆘 지원

문제가 발생하거나 질문이 있으시면:
1. [Issues](https://github.com/your-repo/issues)에 문제를 보고해 주세요
2. [Discussions](https://github.com/your-repo/discussions)에서 질문을 올려주세요

## 🎯 로드맵

### v1.0 (현재)
- ✅ 기본 LLM 통합 (Ollama + Gemini)
- ✅ 멀티모달 입력 처리
- ✅ 데이터베이스 스키마
- ⏳ 기본 채팅 인터페이스

### v1.1 (예정)
- 📋 RAG 시스템 구현
- 📋 커스텀 멘토 생성
- 📋 아티팩트 시스템
- 📋 파일 업로드 UI

### v1.2 (예정)
- 📋 MBTI 멘토 시스템
- 📋 외부 콘텐츠 통합
- 📋 MCP 통합
- 📋 대화 히스토리 관리

### v2.0 (예정)
- 📋 자동 멘토 생성
- 📋 룰 설정 시스템
- 📋 성능 최적화
- 📋 배포 및 모니터링

---

**Made with ❤️ using Next.js, Ollama, and Google Gemini**