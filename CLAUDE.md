# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
cd ai-chatbot-mentor
npm run dev              # Start development server with Turbopack
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Run ESLint
```

### Database Management
```bash
# Initialize database (run from project root)
node scripts/init-db.js

# Clean database restart
rm -rf data/ && node scripts/init-db.js
```

### External Services
```bash
# Start Ollama service
ollama serve

# Download models
ollama pull llama2
ollama pull llava        # For multimodal support
ollama pull codellama    # For code generation
```

## Architecture Overview

This is a **dual-project structure** with a hybrid JavaScript/TypeScript architecture:

### Project Structure
- **Root (`/chatbot`)**: Contains legacy JavaScript services and utilities
- **Main App (`/ai-chatbot-mentor`)**: Next.js 15 application with TypeScript

### Key Architectural Patterns

#### Dual AI Provider System
The system integrates two AI providers through a unified interface:
- **Ollama**: Local LLM service (JavaScript) in `/services/`
- **Google Gemini**: Cloud API service (JavaScript) in `/services/`
- **Unified LLM Service**: TypeScript wrapper in `/ai-chatbot-mentor/src/services/`

#### Multimodal Processing Pipeline
```
User Input → MessageInput Component → API Route → LLM Service → AI Provider
     ↓              ↓                    ↓            ↓           ↓
  Files/Voice → FormData Processing → Model Detection → Provider Selection → Response
```

#### Database Design
SQLite with comprehensive schema for:
- Multi-session chat history with metadata
- Custom mentor personalities and knowledge bases
- Document embeddings for RAG functionality
- Artifact storage for generated content
- User preferences and MBTI profiles

### Critical Implementation Details

#### File Path Resolution
The TypeScript LLMService bridges to JavaScript services using:
```typescript
const LLMServiceJS = require('../../../services/LLMService');
```
This path is critical and frequently breaks during refactoring.

#### Environment Configuration
Two `.env` patterns:
- Root level: For JavaScript services (DATABASE_PATH, GOOGLE_API_KEY)
- Next.js level: Standard Next.js env vars (prefixed with NEXT_PUBLIC_)

#### API Route Handling
The `/api/chat` route handles both JSON and FormData:
- JSON: Standard text requests
- FormData: Multimodal requests with file uploads
- Auto-detection based on Content-Type header

#### Multimodal Model Switching
System automatically switches to Gemini models for image processing:
```typescript
const isMultimodalModel = llmService.isMultimodalSupported(model);
const targetModel = isMultimodalModel ? model : 'gemini-1.5-flash';
```

## Development Workflow

### Working Directory
Always work from `/ai-chatbot-mentor` for Next.js development:
```bash
cd ai-chatbot-mentor
npm run dev
```

### Type Safety
- Main app uses strict TypeScript
- Services layer bridges to JavaScript backends
- Type definitions in `/ai-chatbot-mentor/src/types/index.ts`

### Component Organization
- `/components/ui/`: Reusable UI components (ImageUpload, VoiceRecorder, etc.)
- `/components/chat/`: Chat-specific components
- `/components/mentor/`: Mentor management components
- `/app/api/`: Next.js API routes

### Database Path Configuration
**CRITICAL: Always use the correct database path**

The SQLite database is located at: `./chatbot/data/chatbot.db` (relative to project root)

**For services in ai-chatbot-mentor:**
```typescript
// Correct path from ai-chatbot-mentor directory
const dbPath = path.join(process.cwd(), '..', 'data', 'chatbot.db');
```

**For root-level scripts:**
```javascript
// Correct path from project root
const dbPath = path.join(process.cwd(), 'data', 'chatbot.db');
```

**❌ NEVER use these paths:**
- `process.cwd() + 'database/chatbot.db'` (old incorrect path)
- `process.cwd() + 'data/chatbot.db'` (when in ai-chatbot-mentor directory)

### Database Initialization
Database auto-initializes on first run, but manual init may be needed:
```bash
node scripts/init-db.js
```
Creates SQLite DB with complete schema including indexes.

### Service Integration Testing
Test both AI providers independently:
```bash
# Test Ollama connection
curl http://localhost:11434/api/tags

# Test database connection
sqlite3 data/chatbot.db ".tables"
```

## Important Implementation Notes

### AI Provider Fallback
The system implements automatic fallback:
1. Try requested model
2. If multimodal needed and model doesn't support it, switch to Gemini
3. If provider fails, attempt alternate provider
4. Graceful error handling with user notification

### Speech Processing
Two distinct audio features:
- **VoiceRecorder**: Records audio files for future STT processing
- **VoiceToText**: Real-time speech recognition using Web Speech API

### File Upload Flow
1. Frontend: Drag/drop or select files
2. Validation: Size, type, security checks
3. Processing: FormData → API route → File storage
4. AI Integration: Automatic model selection based on file type

### Database Schema Evolution
Schema supports future features:
- MBTI-based mentor personalities
- RAG embeddings for document chat
- Artifact storage for generated content
- Knowledge source tracking for custom mentors

The codebase is designed for rapid feature expansion while maintaining backward compatibility with the existing JavaScript service layer.


## Basic Rules
1. 대답은 한국어로 해줘.
2. 내 요청에 대해 user_request_history.md 에 요청을 구분선 `
\n
------
\n
`로 구분하여 append 해줘.
3. 요청을 완성했을 때는 커밋을 해줘.
4. 테스트를 위해 서버 프로세스를 실행하더라도 실행한 프로세스는 꼭 종료해줘.