'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Slider } from '../ui/slider';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface RuleFormData {
  name: string;
  displayName: string;
  category: string;
  content: string;
  priority: number;
  isActive: boolean;
  isTemporary: boolean;
  expiresInMinutes?: number;
}

interface Category {
  name: string;
  displayName: string;
  description: string;
  priority: number;
}

interface RuleFormProps {
  initialData?: Partial<RuleFormData>;
  categories: Category[];
  onSubmit: (data: RuleFormData) => Promise<void>;
  onCancel?: () => void;
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
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    displayName: '',
    category: '',
    content: '',
    priority: 50,
    isActive: true,
    isTemporary: false,
    expiresInMinutes: 60,
    ...initialData
  });

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '룰 이름은 필수입니다.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      newErrors.name = '룰 이름은 영문, 숫자, 언더스코어만 사용 가능합니다.';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = '표시명은 필수입니다.';
    }

    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.';
    }

    if (!formData.content.trim()) {
      newErrors.content = '룰 내용은 필수입니다.';
    } else if (formData.content.length > 1000) {
      newErrors.content = '룰 내용은 1000자를 초과할 수 없습니다.';
    }

    if (formData.isTemporary && (!formData.expiresInMinutes || formData.expiresInMinutes < 1)) {
      newErrors.expiresInMinutes = '유효한 만료 시간을 설정해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('룰 저장 오류:', error);
    }
  };

  const handleChange = (field: keyof RuleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 초기화
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 90) return '매우 높음';
    if (priority >= 70) return '높음';
    if (priority >= 50) return '보통';
    if (priority >= 30) return '낮음';
    return '매우 낮음';
  };

  const selectedCategory = categories.find(cat => cat.name === formData.category);

  return (
    <Card className=\"w-full max-w-2xl mx-auto\">
      <CardHeader>
        <CardTitle>
          {isEditing ? '룰 수정' : '새 룰 추가'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className=\"space-y-6\">
          {/* 기본 정보 */}
          <div className=\"grid grid-cols-2 gap-4\">
            <div className=\"space-y-2\">
              <Label htmlFor=\"name\">룰 이름</Label>
              <Input
                id=\"name\"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder=\"rule_name_example\"
                disabled={isEditing || isLoading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className=\"text-sm text-red-600\">{errors.name}</p>
              )}
            </div>

            <div className=\"space-y-2\">
              <Label htmlFor=\"displayName\">표시명</Label>
              <Input
                id=\"displayName\"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder=\"사용자에게 보여질 이름\"
                disabled={isLoading}
                className={errors.displayName ? 'border-red-500' : ''}
              />
              {errors.displayName && (
                <p className=\"text-sm text-red-600\">{errors.displayName}</p>
              )}
            </div>
          </div>

          {/* 카테고리 */}
          <div className=\"space-y-2\">
            <Label htmlFor=\"category\">카테고리</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleChange('category', value)}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder=\"카테고리를 선택하세요\" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.name} value={category.name}>
                    <div>
                      <div className=\"font-medium\">{category.displayName}</div>
                      <div className=\"text-sm text-gray-500\">{category.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className=\"text-sm text-red-600\">{errors.category}</p>
            )}
            {selectedCategory && (
              <p className=\"text-sm text-gray-600\">{selectedCategory.description}</p>
            )}
          </div>

          {/* 룰 내용 */}
          <div className=\"space-y-2\">
            <div className=\"flex items-center justify-between\">
              <Label htmlFor=\"content\">룰 내용</Label>
              <Button
                type=\"button\"
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => setShowPreview(!showPreview)}
                disabled={isLoading}
              >
                {showPreview ? (
                  <>
                    <EyeOff className=\"h-4 w-4 mr-2\" />
                    편집
                  </>
                ) : (
                  <>
                    <Eye className=\"h-4 w-4 mr-2\" />
                    미리보기
                  </>
                )}
              </Button>
            </div>

            {showPreview ? (
              <div className=\"p-3 bg-gray-50 rounded-md border min-h-[120px]\">
                <p className=\"text-sm whitespace-pre-wrap\">
                  {formData.content || '룰 내용이 여기에 표시됩니다...'}
                </p>
              </div>
            ) : (
              <Textarea
                id=\"content\"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder=\"구체적이고 명확한 룰 내용을 작성하세요...\"
                className={`min-h-[120px] ${errors.content ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            )}
            
            <div className=\"flex justify-between text-sm text-gray-500\">
              {errors.content && (
                <p className=\"text-red-600\">{errors.content}</p>
              )}
              <p className={`ml-auto ${formData.content.length > 1000 ? 'text-red-600' : ''}`}>
                {formData.content.length}/1000
              </p>
            </div>
          </div>

          {/* 우선순위 */}
          <div className=\"space-y-3\">
            <Label>우선순위: {formData.priority} ({getPriorityLabel(formData.priority)})</Label>
            <Slider
              value={[formData.priority]}
              onValueChange={(value) => handleChange('priority', value[0])}
              max={100}
              min={1}
              step={1}
              disabled={isLoading}
              className=\"w-full\"
            />
            <div className=\"flex justify-between text-xs text-gray-500\">
              <span>낮음 (1)</span>
              <span>보통 (50)</span>
              <span>높음 (100)</span>
            </div>
          </div>

          {/* 옵션 */}
          <div className=\"space-y-4\">
            <div className=\"flex items-center justify-between\">
              <div>
                <Label htmlFor=\"isActive\">룰 활성화</Label>
                <p className=\"text-sm text-gray-500\">이 룰을 즉시 적용할지 설정합니다.</p>
              </div>
              <Switch
                id=\"isActive\"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
                disabled={isLoading}
              />
            </div>

            <div className=\"flex items-center justify-between\">
              <div>
                <Label htmlFor=\"isTemporary\">임시 룰</Label>
                <p className=\"text-sm text-gray-500\">지정된 시간 후 자동으로 만료되는 룰입니다.</p>
              </div>
              <Switch
                id=\"isTemporary\"
                checked={formData.isTemporary}
                onCheckedChange={(checked) => handleChange('isTemporary', checked)}
                disabled={isLoading}
              />
            </div>

            {formData.isTemporary && (
              <div className=\"space-y-2 pl-4 border-l-2 border-gray-200\">
                <Label htmlFor=\"expiresInMinutes\">만료 시간 (분)</Label>
                <Input
                  id=\"expiresInMinutes\"
                  type=\"number\"
                  min=\"1\"
                  max=\"1440\"
                  value={formData.expiresInMinutes || ''}
                  onChange={(e) => handleChange('expiresInMinutes', parseInt(e.target.value) || 0)}
                  placeholder=\"60\"
                  disabled={isLoading}
                  className={errors.expiresInMinutes ? 'border-red-500' : ''}
                />
                {errors.expiresInMinutes && (
                  <p className=\"text-sm text-red-600\">{errors.expiresInMinutes}</p>
                )}
                <p className=\"text-xs text-gray-500\">1분 ~ 1440분(24시간) 사이로 설정 가능</p>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className=\"flex gap-3 pt-4\">
            <Button
              type=\"submit\"
              disabled={isLoading}
              className=\"flex-1\"
            >
              {isLoading ? (
                <>
                  <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
                  {isEditing ? '수정 중...' : '생성 중...'}
                </>
              ) : (
                isEditing ? '룰 수정' : '룰 생성'
              )}
            </Button>

            {onCancel && (
              <Button
                type=\"button\"
                variant=\"outline\"
                onClick={onCancel}
                disabled={isLoading}
                className=\"flex-1\"
              >
                취소
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}