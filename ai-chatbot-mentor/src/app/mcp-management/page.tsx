'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MCPStatusPanel from '@/components/mcp/MCPStatusPanel';
import MCPHelpGuide from '@/components/mcp/MCPHelpGuide';
import { 
  Server, 
  HelpCircle, 
  Activity,
  Settings,
  Home,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function MCPManagementPage() {
  const [activeTab, setActiveTab] = useState('status');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 네비게이션 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                <Home className="h-4 w-4" />
                홈으로
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                MCP 관리
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* 탭 네비게이션 */}
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              서버 상태
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              도움말
            </TabsTrigger>
          </TabsList>

          {/* 서버 상태 탭 */}
          <TabsContent value="status" className="space-y-6">
            <MCPStatusPanel />
          </TabsContent>

          {/* 도움말 탭 */}
          <TabsContent value="help" className="space-y-6">
            <MCPHelpGuide />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}