import { NextRequest, NextResponse } from 'next/server';
import { mcpService } from '../../../../services/MCPService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (serverId) {
      // 특정 서버만 연결
      await mcpService.connectToServer(serverId);
      return NextResponse.json({
        success: true,
        message: `Server ${serverId} connected successfully`
      });
    } else {
      // 모든 서버 연결
      await mcpService.connectAllServers();
      return NextResponse.json({
        success: true,
        message: 'All servers connected successfully'
      });
    }
  } catch (error) {
    console.error('MCP 서버 연결 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 서버 상태 조회
    const status = await mcpService.getServerStatus();
    return NextResponse.json({
      success: true,
      servers: status
    });
  } catch (error) {
    console.error('MCP 서버 상태 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}