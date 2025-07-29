'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, Save, AlertCircle, Plus } from 'lucide-react';

interface Rule {
  name: string;
  displayName: string;
  category: string;
  content: string;
  priority: number;
  isActive: boolean;
  isTemporary?: boolean;
  expiresAt?: string;
}

interface Category {
  name: string;
  displayName: string;
  description: string;
  priority: number;
}

interface RuleFormProps {
  initialData?: Rule;
  categories: Category[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  isLoading?: boolean;
}

export default function RuleForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
  isEditing = false,
  isLoading = false
}: RuleFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    category: 'general',
    content: '',
    priority: 50,
    isActive: true,
    isTemporary: false,
    expiresInMinutes: 60
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        displayName: initialData.displayName,
        category: initialData.category,
        content: initialData.content,
        priority: initialData.priority,
        isActive: initialData.isActive,
        isTemporary: initialData.isTemporary || false,
        expiresInMinutes: 60
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '룰 이름은 필수입니다.';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = '룰 이름은 영문자로 시작하고 영문자, 숫자, 밑줄만 포함해야 합니다.';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = '표시 이름은 필수입니다.';
    }

    if (!formData.content.trim()) {
      newErrors.content = '룰 내용은 필수입니다.';
    }

    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.';
    }

    if (formData.priority < 1 || formData.priority > 100) {
      newErrors.priority = '우선순위는 1~100 사이의 값이어야 합니다.';
    }

    if (formData.isTemporary && formData.expiresInMinutes < 1) {
      newErrors.expiresInMinutes = '만료 시간은 1분 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        priority: Number(formData.priority),
        expiresInMinutes: formData.isTemporary ? Number(formData.expiresInMinutes) : undefined
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('폼 제출 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 유효성 검사
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedCategory = categories.find(cat => cat.name === formData.category);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? '룰 수정' : '새 룰 추가'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 룰 이름 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">룰 이름 *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="예: my_custom_rule"
              disabled={isEditing} // 수정 시 이름 변경 불가
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500">
              영문자로 시작하고 영문자, 숫자, 밑줄만 사용 가능
            </p>
          </div>

          {/* 표시 이름 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">표시 이름 *</label>
            <Input
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="예: 나만의 커스텀 룰"
              className={errors.displayName ? 'border-red-500' : ''}
            />
            {errors.displayName && (
              <p className="text-sm text-red-600">{errors.displayName}</p>
            )}
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">카테고리 *</label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
            >
              {categories.map(category => (
                <option key={category.name} value={category.name}>
                  {category.displayName}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
            {selectedCategory && (
              <p className="text-xs text-gray-500">{selectedCategory.description}</p>
            )}
          </div>

          {/* 룰 내용 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">룰 내용 *</label>
            <Textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="예: 모든 응답은 친근하고 도움이 되는 톤으로 작성해주세요."
              rows={4}
              className={errors.content ? 'border-red-500' : ''}
            />
            {errors.content && (
              <p className="text-sm text-red-600">{errors.content}</p>
            )}
          </div>

          {/* 우선순위 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">우선순위 (1-100)</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.priority}
              onChange={(e) => handleChange('priority', Number(e.target.value))}
              className={errors.priority ? 'border-red-500' : ''}
            />
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority}</p>
            )}
            <p className="text-xs text-gray-500">
              높을수록 우선 적용됩니다 (90+ 높음, 70+ 보통, 50+ 낮음)
            </p>
          </div>

          {/* 활성 상태 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              활성화
            </label>
          </div>

          {/* 임시 룰 설정 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isTemporary"
                checked={formData.isTemporary}
                onChange={(e) => handleChange('isTemporary', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isTemporary" className="text-sm font-medium">
                임시 룰 (자동 만료)
              </label>
            </div>

            {formData.isTemporary && (
              <div className="space-y-2 ml-6">
                <label className="text-sm font-medium">만료 시간 (분)</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.expiresInMinutes}
                  onChange={(e) => handleChange('expiresInMinutes', Number(e.target.value))}
                  className={errors.expiresInMinutes ? 'border-red-500' : ''}
                />
                {errors.expiresInMinutes && (
                  <p className="text-sm text-red-600">{errors.expiresInMinutes}</p>
                )}
                <p className="text-xs text-gray-500">
                  설정한 시간 후 자동으로 삭제됩니다
                </p>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              취소
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? '저장 중...' : isEditing ? '수정' : '생성'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}