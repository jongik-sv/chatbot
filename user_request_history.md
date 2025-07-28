# 사용자 요청 기록

------

아티팩트를 오른쪽에서 열리게 하고, alert이 실행되지 않는 문제 해결 요청

**완료 사항**: 
- ChatInterface 레이아웃을 가로 분할로 변경하여 아티팩트를 오른쪽 1/3 영역에 표시
- CodeExecutor iframe에 allow-modals, allow-popups 권한 추가로 alert() 함수 실행 지원

------

chatbot.db 파일이 2개 있어 하나를 쓰도록 만들어야 될것 같아.

### 데이터베이스 파일 중복 문제 분석 및 해결

**현재 상황**:
- **활성 DB**: `/data/chatbot.db` (192KB) - 현재 사용 중, 최신 아티팩트 저장됨
- **구버전 DB**: `ai-chatbot-mentor/database/chatbot.db` (20MB) - 사용되지 않음

**완료된 작업**:
1. ✅ 구버전 데이터베이스 백업 완료 (`backup/database_old_20250728_163942/`)
2. ✅ 모든 코드가 `/data/chatbot.db` 경로를 올바르게 참조하는지 확인
3. ✅ 현재 시스템이 단일 데이터베이스로 정상 작동하는지 검증

**결과**:
- ✅ 시스템은 이미 단일 데이터베이스(`/data/chatbot.db`)를 사용하고 있음
- ✅ 구버전 파일은 프로세스에 의해 잠김 상태이나 실제로는 사용되지 않음  
- ✅ 데이터 불일치 문제 없음, 아티팩트 생성/저장 정상 동작

**권장사항**: 시스템 재부팅 후 `ai-chatbot-mentor/database/chatbot.db*` 파일들 수동 제거
