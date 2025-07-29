// scripts/force-mcp-reconnect.js
const axios = require('axios');

async function reconnectMCPServer() {
  try {
    console.log('=== MCP Sequential-Thinking 서버 강제 재연결 ===\n');
    
    // 1. 현재 상태 확인
    console.log('1. 현재 MCP 서버 상태 확인...');
    const statusResponse = await axios.get('http://localhost:3001/api/mcp/servers?includeTools=true');
    
    const sequentialServer = statusResponse.data.data.find(s => s.id === 'sequential-thinking');
    if (sequentialServer) {
      console.log(`상태: ${sequentialServer.status}`);
      console.log(`도구 수: ${sequentialServer.toolCount}`);
      console.log(`도구 목록: ${sequentialServer.tools.map(t => t.name).join(', ') || '(없음)'}`);
    } else {
      console.log('sequential-thinking 서버를 찾을 수 없습니다.');
      return;
    }
    
    // 2. 서버 통계 확인
    console.log('\n2. MCP 서버 통계 확인...');
    const statsResponse = await axios.get('http://localhost:3001/api/mcp/stats');
    console.log('전체 서버 수:', statsResponse.data.data.totalServers);
    console.log('연결된 서버 수:', statsResponse.data.data.connectedServers);
    console.log('전체 도구 수:', statsResponse.data.data.totalTools);
    
    // 3. 도구 목록 직접 확인
    console.log('\n3. 도구 목록 직접 확인...');
    const toolsResponse = await axios.get('http://localhost:3001/api/mcp/tools');
    const sequentialTools = toolsResponse.data.data.filter(t => t.serverId === 'sequential-thinking');
    console.log(`sequential-thinking 서버의 도구:`, sequentialTools.map(t => t.name));
    
    // 4. 도구 실행 테스트 (만약 도구가 있다면)
    if (sequentialTools.length > 0) {
      console.log('\n4. sequentialthinking 도구 실행 테스트...');
      try {
        const executeResponse = await axios.post('http://localhost:3001/api/mcp/execute', {
          serverId: 'sequential-thinking',
          toolName: 'sequentialthinking',
          args: {
            thought: '이것은 테스트 사고입니다.',
            nextThoughtNeeded: false,
            thoughtNumber: 1,
            totalThoughts: 1
          }
        });
        
        console.log('도구 실행 성공:', executeResponse.data.success);
        if (executeResponse.data.success) {
          console.log('결과:', executeResponse.data.data.content.slice(0, 100) + '...');
        }
      } catch (error) {
        console.error('도구 실행 실패:', error.response?.data || error.message);
      }
    } else {
      console.log('\n4. sequential-thinking 서버에 사용 가능한 도구가 없습니다.');
    }
    
  } catch (error) {
    console.error('재연결 테스트 실패:', error.response?.data || error.message);
  }
}

// axios가 없는 경우 fallback
if (typeof require === 'undefined' || !require.resolve) {
  console.error('이 스크립트는 axios가 필요합니다. npm install axios를 실행하세요.');
} else {
  try {
    require.resolve('axios');
    reconnectMCPServer();
  } catch (e) {
    console.log('axios가 설치되지 않았습니다. fetch로 대체합니다...');
    
    const { exec } = require('child_process');
    
    // curl로 상태 확인
    exec('curl -s http://localhost:3001/api/mcp/servers?includeTools=true', (error, stdout, stderr) => {
      if (error) {
        console.error('서버 상태 확인 실패:', error);
        return;
      }
      
      try {
        const data = JSON.parse(stdout);
        const sequentialServer = data.data.find(s => s.id === 'sequential-thinking');
        if (sequentialServer) {
          console.log('=== MCP Sequential-Thinking 서버 상태 ===');
          console.log(`상태: ${sequentialServer.status}`);
          console.log(`도구 수: ${sequentialServer.toolCount}`);
          console.log(`도구 목록: ${sequentialServer.tools.map(t => t.name).join(', ') || '(없음)'}`);
        }
      } catch (parseError) {
        console.error('응답 파싱 실패:', parseError);
        console.log('Raw response:', stdout);
      }
    });
  }
}