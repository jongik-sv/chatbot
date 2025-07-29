// scripts/test-mcp-connection.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== MCP Sequential Thinking 서버 연결 테스트 ===\n');

// 1. .mcp.json 설정 확인
const mcpConfigPath = path.join(process.cwd(), '.mcp.json');
console.log('1. .mcp.json 설정 확인:');
console.log(`경로: ${mcpConfigPath}`);

if (fs.existsSync(mcpConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    const sequentialThinkingConfig = config.mcpServers['sequential-thinking'];
    
    console.log('Sequential-thinking 서버 설정:');
    console.log(`  Command: ${sequentialThinkingConfig.command}`);
    console.log(`  Args: ${JSON.stringify(sequentialThinkingConfig.args)}`);
    console.log(`  Disabled: ${sequentialThinkingConfig.disabled}`);
    console.log(`  AutoApprove: ${JSON.stringify(sequentialThinkingConfig.autoApprove)}`);
    
    // 2. MCP 서버 직접 실행 테스트
    console.log('\n2. MCP 서버 직접 실행 테스트:');
    
    const command = sequentialThinkingConfig.command;
    const args = sequentialThinkingConfig.args;
    
    console.log(`실행 명령: ${command} ${args.join(' ')}`);
    
    // 서버 프로세스 시작
    const mcpProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    mcpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    mcpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // 5초 후 종료
    setTimeout(() => {
      mcpProcess.kill();
      
      console.log('\n=== 실행 결과 ===');
      console.log('STDOUT:');
      console.log(stdout || '(출력 없음)');
      
      console.log('\nSTDERR:');
      console.log(stderr || '(에러 없음)');
      
      console.log('\n=== 테스트 완료 ===');
    }, 5000);
    
    mcpProcess.on('error', (error) => {
      console.error('프로세스 실행 오류:', error.message);
    });
    
    mcpProcess.on('exit', (code, signal) => {
      console.log(`프로세스 종료: code=${code}, signal=${signal}`);
    });
    
  } catch (error) {
    console.error('.mcp.json 파싱 오류:', error.message);
  }
} else {
  console.error('.mcp.json 파일이 존재하지 않습니다.');
}