'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: (user: any) => void;
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // 로그인 성공
        onSuccess?.(data.user);
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <Card className=\"w-full max-w-md mx-auto\">
      <CardHeader className=\"space-y-1\">
        <CardTitle className=\"text-2xl font-bold text-center\">로그인</CardTitle>
        <CardDescription className=\"text-center\">
          계정에 로그인하여 AI 멘토 서비스를 이용하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className=\"space-y-4\">
          {error && (
            <Alert variant=\"destructive\">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className=\"space-y-2\">
            <Label htmlFor=\"username\">사용자명 또는 이메일</Label>
            <Input
              id=\"username\"
              name=\"username\"
              type=\"text\"
              placeholder=\"사용자명 또는 이메일을 입력하세요\"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete=\"username\"
            />
          </div>

          <div className=\"space-y-2\">
            <Label htmlFor=\"password\">비밀번호</Label>
            <div className=\"relative\">
              <Input
                id=\"password\"
                name=\"password\"
                type={showPassword ? 'text' : 'password'}
                placeholder=\"비밀번호를 입력하세요\"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoComplete=\"current-password\"
                className=\"pr-10\"
              />
              <Button
                type=\"button\"
                variant=\"ghost\"
                size=\"sm\"
                className=\"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent\"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className=\"h-4 w-4\" />
                ) : (
                  <Eye className=\"h-4 w-4\" />
                )}
              </Button>
            </div>
          </div>

          <div className=\"flex items-center space-x-2\">
            <input
              id=\"rememberMe\"
              name=\"rememberMe\"
              type=\"checkbox\"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={isLoading}
              className=\"h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500\"
            />
            <Label htmlFor=\"rememberMe\" className=\"text-sm font-normal\">
              로그인 상태 유지 (7일)
            </Label>
          </div>

          <Button
            type=\"submit\"
            className=\"w-full\"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </Button>

          {onSwitchToRegister && (
            <div className=\"text-center text-sm\">
              <span className=\"text-gray-600\">계정이 없으신가요? </span>
              <Button
                type=\"button\"
                variant=\"link\"
                className=\"p-0 h-auto font-normal\"
                onClick={onSwitchToRegister}
                disabled={isLoading}
              >
                회원가입
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}