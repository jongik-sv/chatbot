# AI Chatbot Mentor 설정 가이드

## 환경 변수 설정

### 1. Gemini API 설정
Google AI Studio에서 API 키를 발급받아 설정하세요:
```bash
GOOGLE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Ollama 설정
#### 로컬 Ollama 사용 (기본값)
```bash
OLLAMA_BASE_URL=http://localhost:11434
```

#### 네트워크 Ollama 서버 사용
```bash
# 같은 네트워크의 다른 PC
OLLAMA_BASE_URL=http://192.168.1.100:11434

# 도메인 사용
OLLAMA_BASE_URL=http://your-ollama-server.com:11434

# HTTPS 사용
OLLAMA_BASE_URL=https://your-secure-ollama-server.com:11434
```

## 모델 관리

### Gemini 모델
- API를 통해 자동으로 최신 모델 목록을 가져옵니다
- 지원되는 모델: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.5 Flash 8B 등
- 멀티모달 지원 (이미지, 텍스트)

### Ollama 모델
- 로컬 또는 네트워크 Ollama 서버에서 모델 목록을 가져옵니다
- 멀티모달 모델: LLaVA, BakLLaVA, Moondream 등
- 모델 크기와 수정 시간 정보 포함

## 네트워크 설정 팁

### Ollama 서버 네트워크 접근 허용
Ollama 서버에서 네트워크 접근을 허용하려면:

1. **환경 변수 설정**:
   ```bash
   export OLLAMA_HOST=0.0.0.0:11434
   ```

2. **서비스 재시작**:
   ```bash
   ollama serve
   ```

3. **방화벽 설정** (필요시):
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 11434
   
   # CentOS/RHEL
   sudo firewall-cmd --permanent --add-port=11434/tcp
   sudo firewall-cmd --reload
   ```

### 보안 고려사항
- 프로덕션 환경에서는 HTTPS 사용 권장
- API 키는 환경 변수로만 관리
- 네트워크 접근 시 적절한 인증/인가 구현 고려

## 문제 해결

### 연결 오류
1. **Ollama 서버 상태 확인**:
   ```bash
   curl http://your-ollama-server:11434/api/tags
   ```

2. **Gemini API 키 확인**:
   - Google AI Studio에서 API 키 상태 확인
   - 할당량 및 사용량 확인

3. **네트워크 연결 확인**:
   - 방화벽 설정
   - 포트 접근 가능 여부
   - DNS 해석 문제