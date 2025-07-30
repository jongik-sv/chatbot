'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Edit, 
  Trash2, 
  Clock, 
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

interface RuleCardProps {
  rule: Rule;
  onEdit?: (rule: Rule) => void;
  onDelete?: (ruleName: string) => void;
  onToggle?: (ruleName: string, isActive: boolean) => void;
  readOnly?: boolean;
}

export default function RuleCard({ 
  rule, 
  onEdit, 
  onDelete, 
  onToggle,
  readOnly = false 
}: RuleCardProps) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!onToggle || readOnly) return;

    setIsToggling(true);
    try {
      await onToggle(rule.name, checked);
    } catch (error) {
      console.error('룰 토글 오류:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return '만료됨';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 남음`;
    }
    return `${minutes}분 남음`;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 90) return 'bg-red-100 text-red-800';
    if (priority >= 70) return 'bg-orange-100 text-orange-800';
    if (priority >= 50) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      safety: 'bg-red-100 text-red-800',
      format: 'bg-green-100 text-green-800',
      domain: 'bg-purple-100 text-purple-800',
      temporary: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className={`w-full ${!rule.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{rule.displayName}</CardTitle>
              {rule.isActive ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-600" />
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge className={getCategoryColor(rule.category)}>
                {rule.category}
              </Badge>
              
              <Badge className={getPriorityColor(rule.priority)}>
                <Target className="h-3 w-3 mr-1" />
                우선순위 {rule.priority}
              </Badge>
              
              {rule.isTemporary && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Clock className="h-3 w-3 mr-1" />
                  임시
                </Badge>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Switch
                checked={rule.isActive}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 룰 내용 */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {rule.content}
          </p>
        </div>

        {/* 만료 시간 (임시 룰의 경우) */}
        {rule.isTemporary && rule.expiresAt && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {getTimeRemaining(rule.expiresAt)}
            </AlertDescription>
          </Alert>
        )}

        {/* 메타정보 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>생성일: {formatDate(rule.createdAt)}</div>
          {rule.updatedAt !== rule.createdAt && (
            <div>수정일: {formatDate(rule.updatedAt)}</div>
          )}
        </div>

        {/* 액션 버튼 */}
        {!readOnly && (onEdit || onDelete) && (
          <div className="flex gap-2 pt-2 border-t">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(rule)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(rule.name)}
                className="flex-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}