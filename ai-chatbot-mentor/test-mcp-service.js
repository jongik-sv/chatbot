// MCP 서비스 직접 테스트
const { MCPClient } = require('./src/services/MCPClient.ts');

async function testMCPService() {
    console.log('Testing MCP Service with sequential-thinking server...');
    
    const config = {
        id: 'mcp-sequential-thinking',
        name: 'Sequential Thinking',
        description: 'Sequential thinking MCP server',
        command: 'cmd',
        args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-sequential-thinking']
    };

    const client = new MCPClient(config, {
        enableLogging: true,
        timeout: 30000
    });

    try {
        console.log('Connecting to MCP server...');
        await client.connect();
        
        console.log('Getting tools...');
        const tools = client.getTools();
        console.log('Tools found:', JSON.stringify(tools, null, 2));
        
        if (tools.length > 0) {
            console.log('✅ MCP server connected and tools loaded successfully');
        } else {
            console.log('❌ MCP server connected but no tools found');
        }
        
    } catch (error) {
        console.error('❌ MCP test failed:', error);
    } finally {
        await client.disconnect();
    }
}

testMCPService().catch(console.error);