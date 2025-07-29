const { spawn } = require('child_process');

// MCP sequential-thinking 서버 직접 테스트
async function testMCPServer() {
    console.log('Starting MCP sequential-thinking server test...');
    
    // 서버 프로세스 시작
    const serverProcess = spawn('cmd', ['/c', 'npx', '-y', '@modelcontextprotocol/server-sequential-thinking'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';
    
    // stdout 리스너
    serverProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        console.log('SERVER STDOUT:', data.toString());
        
        // JSON-RPC 메시지 파싱
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line.trim());
                    console.log('Received message:', JSON.stringify(message, null, 2));
                } catch (error) {
                    console.log('Non-JSON line:', line.trim());
                }
            }
        }
    });

    // stderr 리스너
    serverProcess.stderr.on('data', (data) => {
        console.log('SERVER STDERR:', data.toString());
    });

    // 프로세스 이벤트
    serverProcess.on('error', (error) => {
        console.error('Process error:', error);
    });

    serverProcess.on('exit', (code, signal) => {
        console.log(`Process exited with code ${code}, signal ${signal}`);
    });

    // 잠시 대기 후 초기화 요청 전송
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Sending initialize request...');
    const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {},
                prompts: {},
                resources: {},
                logging: {}
            },
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        }
    };

    serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    // 잠시 대기 후 tools/list 요청
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Sending initialized notification...');
    const initializedNotification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
    };
    serverProcess.stdin.write(JSON.stringify(initializedNotification) + '\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Sending tools/list request...');
    const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    };

    serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

    // 5초 후 종료
    setTimeout(() => {
        console.log('Terminating server process...');
        serverProcess.kill();
    }, 5000);
}

testMCPServer().catch(console.error);