'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Plus, 
  Search, 
  Settings, 
  BarChart3,
  RefreshCw,
  Filter,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';

import RuleCard from './RuleCard';
import RuleForm from './RuleForm';

interface Rule {
  name: string;
  displayName: string;
  category: string;
  content: string;
  priority: number;
  isActive: boolean;
  isTemporary?: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  name: string;
  displayName: string;
  description: string;
  priority: number;
}

interface RuleStats {
  totalRules: number;
  activeRules: number;
  temporaryRules: number;
  rulesByCategory: Record<string, number>;
}

export default function RuleManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<RuleStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 카테고리 로드
      const categoriesResponse = await fetch('/api/rules/categories');
      const categoriesData = await categoriesResponse.json();
      
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }

      // 룰 및 통계 로드
      const rulesResponse = await fetch('/api/rules');
      const rulesData = await rulesResponse.json();
      
      if (rulesData.success) {
        const { categories: cats, rulesByCategory, stats: ruleStats } = rulesData.data;
        
        // 모든 룰을 하나의 배열로 합치기
        const allRules = Object.values(rulesByCategory).flat() as Rule[];
        setRules(allRules);
        setStats(ruleStats);
      } else {
        setError(rulesData.error || '데이터 로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 룰 필터링
  const filteredRules = rules.filter(rule => {
    const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      rule.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // 룰 생성/수정
  const handleSaveRule = async (ruleData: any) => {
    try {
      const url = editingRule ? `/api/rules/${editingRule.name}` : '/api/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });

      const data = await response.json();

      if (data.success) {
        await loadData(); // 데이터 다시 로드
        setShowForm(false);
        setEditingRule(null);
      } else {
        setError(data.error || '룰 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('룰 저장 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  // 룰 삭제
  const handleDeleteRule = async (ruleName: string) => {
    if (!confirm('정말로 이 룰을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/rules/${ruleName}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await loadData();
      } else {
        setError(data.error || '룰 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('룰 삭제 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  // 룰 토글
  const handleToggleRule = async (ruleName: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/rules/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleName, isActive })
      });

      const data = await response.json();

      if (data.success) {
        await loadData();
      } else {
        setError(data.error || '룰 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('룰 토글 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  // 만료된 임시 룰 정리
  const handleCleanupExpiredRules = async () => {
    try {
      const response = await fetch('/api/rules/temporary', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await loadData();
        alert(`만료된 임시 룰 ${data.data.cleanedCount}개가 정리되었습니다.`);
      } else {
        setError(data.error || '임시 룰 정리에 실패했습니다.');
      }
    } catch (error) {
      console.error('임시 룰 정리 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  if (showForm) {
    return (
      <RuleForm
        initialData={editingRule || undefined}
        categories={categories}
        onSubmit={handleSaveRule}
        onCancel={() => {
          setShowForm(false);
          setEditingRule(null);
        }}
        isEditing={!!editingRule}
        isLoading={false}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">룰 관리</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            새 룰 추가
          </Button>
        </div>
      </div>

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{stats.totalRules}</div>
            <div className="text-sm text-blue-600">전체 룰</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{stats.activeRules}</div>
            <div className="text-sm text-green-600">활성 룰</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{stats.temporaryRules}</div>
            <div className="text-sm text-yellow-600">임시 룰</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">{categories.length}</div>
            <div className="text-sm text-purple-600">카테고리</div>
          </div>
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="룰 이름이나 내용으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCleanupExpiredRules}
            className="whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            만료 룰 정리
          </Button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="all">
            전체 ({rules.length})
          </TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category.name} value={category.name}>
              {category.displayName} ({stats?.rulesByCategory[category.name] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 룰이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRules.map(rule => (
                <RuleCard
                  key={rule.name}
                  rule={rule}
                  onEdit={setEditingRule}
                  onDelete={handleDeleteRule}
                  onToggle={handleToggleRule}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}