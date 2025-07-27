# AI 챗봇 멘토

멀티모달 AI 기술을 활용한 개인화된 멘토링 챗봇 서비스입니다.

## 주요 기능

- 🤖 **다중 LLM 지원**: Ollama 로컬 모델과 Google Gemini API 통합
- 🎯 **멀티모달 입력**: 텍스트, 이미지, 음성 입력 지원
- 📚 **RAG 기반 문서 분석**: 개인 문서를 기반으로 한 맞춤형 답변
- 👥 **커스텀 멘토 생성**: ChatGPT GPTs와 같은 전문 AI 어시스턴트 생성
- 🧠 **MBTI 기반 멘토링**: 성격 유형별 맞춤형 멘토링 서비스
- 🔧 **MCP 통합**: Model Context Protocol을 통한 확장 기능
- 📊 **아티팩트 시스템**: 코드, 문서, 차트 생성 및 편집

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **AI Services**: Google Gemini API, Ollama
- **Vector Search**: @xenova/transformers
- **File Processing**: multer, pdf-parse, mammoth

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# AI API Keys
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# Database
DATABASE_URL=./database/chatbot.db

# Authentication
JWT_SECRET=your_jwt_secret_here
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Ollama 설치 및 설정

로컬에서 Ollama를 실행하려면:

```bash
# Ollama 설치 (https://ollama.ai)
# 모델 다운로드 예시
ollama pull llama2
ollama pull codellama
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

## 프로젝트 구조

```
ai-chatbot-mentor/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   │   ├── chat/       # 채팅 API
│   │   │   ├── upload/     # 파일 업로드 API
│   │   │   ├── mentors/    # 멘토 관리 API
│   │   │   ├── auth/       # 인증 API
│   │   │   └── documents/  # 문서 관리 API
│   │   ├── layout.tsx      # 루트 레이아웃
│   │   └── page.tsx        # 홈페이지
│   ├── components/         # React 컴포넌트
│   │   ├── ui/            # 기본 UI 컴포넌트
│   │   ├── chat/          # 채팅 관련 컴포넌트
│   │   ├── mentor/        # 멘토 관련 컴포넌트
│   │   ├── artifacts/     # 아티팩트 컴포넌트
│   │   └── history/       # 히스토리 컴포넌트
│   ├── services/          # 비즈니스 로직 서비스
│   ├── lib/               # 라이브러리 및 유틸리티
│   ├── types/             # TypeScript 타입 정의
│   ├── utils/             # 헬퍼 함수들
│   └── hooks/             # 커스텀 React 훅
├── database/              # 데이터베이스 파일
├── uploads/               # 업로드된 파일 저장소
└── public/                # 정적 파일
```

## 개발 가이드

### 데이터베이스

SQLite 데이터베이스는 애플리케이션 시작 시 자동으로 초기화됩니다. 스키마는 `database/schema.sql`에 정의되어 있습니다.

### API 엔드포인트

- `POST /api/chat` - 채팅 메시지 처리
- `POST /api/upload` - 파일 업로드
- `GET/POST/PUT/DELETE /api/mentors` - 멘토 CRUD
- `POST /api/auth/login` - 사용자 로그인
- `GET /api/documents` - 문서 목록 조회

## 라이선스

MIT License
