// app/api/test/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      NODE_ENV: process.env.NODE_ENV
    };

    const maskedEnv = {
      GOOGLE_GEMINI_API_KEY: envCheck.GOOGLE_GEMINI_API_KEY ? 
        `${envCheck.GOOGLE_GEMINI_API_KEY.substring(0, 10)}...` : 'Not set',
      GOOGLE_API_KEY: envCheck.GOOGLE_API_KEY ? 
        `${envCheck.GOOGLE_API_KEY.substring(0, 10)}...` : 'Not set',
      OLLAMA_BASE_URL: envCheck.OLLAMA_BASE_URL,
      NODE_ENV: envCheck.NODE_ENV
    };

    return NextResponse.json({
      status: 'API working',
      env: maskedEnv,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Test API failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}