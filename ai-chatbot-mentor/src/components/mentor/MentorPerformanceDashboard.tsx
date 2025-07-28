// components/mentor/MentorPerformanceDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  MessageSquare, 
  Users,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface MentorPerformanceData {
  id: string;
  name: string;
  totalInteractions: number;
  averageRating: number;
  feedbackCounts: Record<string, number>;
  improvementSuggestions: string[];
  lastUpdated: string;
}

interface DashboardData {
  mentors: MentorPerformanceData[];
  summary: {
    totalMentors: number;
    averageRating: number;
    totalInteractions: number;
  };
}

export const MentorPerformanceDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [improvementHistory, setImprovementHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/mentors/improvements');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImprovementHistory = async (mentorId: string) => {
    try {
      const response = await fetch(`/api/mentors/improvements?mentorId=${mentorId}`);
      if (response.ok) {
        const data = await response.json();
        setImprovementHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching improvement history:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedMentor) {
      fetchImprovementHistory(selectedMentor);
    }
  }, [selectedMentor]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingTrend = (rating: number) => {
    if (rating >= 4.0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (rating >= 3.0) return <BarChart3 className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">대시보드 로딩 중...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center p-8">
        <p>대시보드 데이터를 불러올 수 없습니다.</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 전체 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">총 멘토 수</p>
                <p className="text-2xl font-bold">{dashboardData.summary.totalMentors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">평균 평점</p>
                <p className="text-2xl font-bold">
                  {dashboardData.summary.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">총 상호작용</p>
                <p className="text-2xl font-bold">{dashboardData.summary.totalInteractions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 멘토별 성능 */}
      <Card>
        <CardHeader>
          <CardTitle>멘토별 성능 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.mentors.map((mentor) => (
              <div
                key={mentor.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedMentor === mentor.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedMentor(mentor.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium">{mentor.name}</h3>
                    {getRatingTrend(mentor.averageRating)}
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getRatingColor(mentor.averageRating)}>
                      ★ {mentor.averageRating.toFixed(1)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {mentor.totalInteractions}회 상호작용
                    </span>
                  </div>
                </div>

                {/* 피드백 분포 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(mentor.feedbackCounts).map(([type, count]) => (
                    count > 0 && (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    )
                  ))}
                </div>

                {/* 개선 제안 */}
                {mentor.improvementSuggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-1">최근 개선 제안:</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      {mentor.improvementSuggestions.slice(0, 2).map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 멘토의 개선 히스토리 */}
      {selectedMentor && improvementHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {dashboardData.mentors.find(m => m.id === selectedMentor)?.name} 개선 히스토리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {improvementHistory.map((improvement, index) => (
                <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{improvement.category}</Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(improvement.applied_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{improvement.suggestion}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    구현 힌트: {improvement.implementation_hint}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};