// scripts/test-mcp-protocol.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== MCP Sequential Thinking 프로토콜 테스트 ===\n');

// MCP 서버 시작
const mcpProcess = spawn('cmd', ['/c', 'npx', '-y', '@modelcontextprotocol/server-sequential-thinking'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';

mcpProcess.stdout.on('data', (data) => {
  responseData += data.toString();
  console.log('서버 응답:', data.toString());
});

mcpProcess.stderr.on('data', (data) => {
  console.error('서버 에러:', data.toString());
});

mcpProcess.on('error', (error) => {
  console.error('프로세스 오류:', error);
});

// MCP 초기화 메시지 전송
setTimeout(() => {
  console.log('MCP 초기화 메시지 전송...');
  
  const initMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  }) + '\n';
  
  console.log('전송 메시지:', initMessage.trim());
  mcpProcess.stdin.write(initMessage);
}, 1000);

// 3초 후 도구 목록 요청
setTimeout(() => {
  console.log('\n도구 목록 요청...');
  
  const listToolsMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  }) + '\n';
  
  console.log('전송 메시지:', listToolsMessage.trim());
  mcpProcess.stdin.write(listToolsMessage);
}, 3000);

// 6초 후 프로세스 종료
setTimeout(() => {
  console.log('\n=== 테스트 완료 ===');
  console.log('전체 응답 데이터:', responseData);
  mcpProcess.kill();
}, 6000);

mcpProcess.on('exit', (code, signal) => {
  console.log(`프로세스 종료: code=${code}, signal=${signal}`);
});