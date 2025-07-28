'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface PasswordRules {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    mbtiType: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  const checkPasswordStrength = (password: string) => {
    const rules = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?\":{}|<>]/.test(password)
    };
    setPasswordRules(rules);
  };

  const getPasswordStrength = () => {
    const score = Object.values(passwordRules).filter(Boolean).length;
    if (score < 2) return { text: '매우 약함', color: 'text-red-600' };
    if (score < 3) return { text: '약함', color: 'text-orange-600' };
    if (score < 4) return { text: '보통', color: 'text-yellow-600' };
    if (score < 5) return { text: '강함', color: 'text-blue-600' };
    return { text: '매우 강함', color: 'text-green-600' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 비밀번호 강도 확인
    const score = Object.values(passwordRules).filter(Boolean).length;
    if (score < 3) {
      setError('비밀번호가 너무 약합니다. 최소 3개 조건을 만족해야 합니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          mbtiType: formData.mbtiType || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 회원가입 성공
        onSuccess?.();
      } else {
        setError(data.error || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 비밀번호 강도 체크
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const handleMbtiChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      mbtiType: value
    }));
  };

  const passwordStrength = getPasswordStrength();

  return (
    <Card className=\"w-full max-w-md mx-auto\">
      <CardHeader className=\"space-y-1\">
        <CardTitle className=\"text-2xl font-bold text-center\">회원가입</CardTitle>
        <CardDescription className=\"text-center\">
          AI 멘토 서비스를 이용하기 위해 계정을 생성하세요
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
            <Label htmlFor=\"username\">사용자명</Label>
            <Input
              id=\"username\"
              name=\"username\"
              type=\"text\"
              placeholder=\"3글자 이상의 사용자명\"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete=\"username\"
              minLength={3}
            />
          </div>

          <div className=\"space-y-2\">
            <Label htmlFor=\"email\">이메일</Label>
            <Input
              id=\"email\"
              name=\"email\"
              type=\"email\"
              placeholder=\"example@domain.com\"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete=\"email\"
            />
          </div>

          <div className=\"space-y-2\">
            <Label htmlFor=\"password\">비밀번호</Label>
            <div className=\"relative\">
              <Input
                id=\"password\"
                name=\"password\"
                type={showPassword ? 'text' : 'password'}
                placeholder=\"8글자 이상의 안전한 비밀번호\"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoComplete=\"new-password\"
                className=\"pr-10\"
                minLength={8}
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
            
            {formData.password && (
              <div className=\"space-y-2\">
                <div className=\"flex items-center justify-between text-sm\">
                  <span>비밀번호 강도:</span>
                  <span className={passwordStrength.color}>{passwordStrength.text}</span>
                </div>
                <div className=\"space-y-1 text-xs\">
                  <div className=\"flex items-center space-x-2\">
                    {passwordRules.minLength ? (
                      <Check className=\"h-3 w-3 text-green-600\" />
                    ) : (
                      <X className=\"h-3 w-3 text-red-600\" />
                    )}
                    <span>최소 8글자</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    {passwordRules.hasUpperCase ? (
                      <Check className=\"h-3 w-3 text-green-600\" />
                    ) : (
                      <X className=\"h-3 w-3 text-red-600\" />
                    )}
                    <span>대문자 포함</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    {passwordRules.hasLowerCase ? (
                      <Check className=\"h-3 w-3 text-green-600\" />
                    ) : (
                      <X className=\"h-3 w-3 text-red-600\" />
                    )}
                    <span>소문자 포함</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    {passwordRules.hasNumber ? (
                      <Check className=\"h-3 w-3 text-green-600\" />
                    ) : (
                      <X className=\"h-3 w-3 text-red-600\" />
                    )}
                    <span>숫자 포함</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    {passwordRules.hasSpecialChar ? (
                      <Check className=\"h-3 w-3 text-green-600\" />
                    ) : (
                      <X className=\"h-3 w-3 text-red-600\" />
                    )}
                    <span>특수문자 포함</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className=\"space-y-2\">
            <Label htmlFor=\"confirmPassword\">비밀번호 확인</Label>
            <div className=\"relative\">
              <Input
                id=\"confirmPassword\"
                name=\"confirmPassword\"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder=\"비밀번호를 다시 입력하세요\"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoComplete=\"new-password\"
                className=\"pr-10\"
              />
              <Button
                type=\"button\"
                variant=\"ghost\"
                size=\"sm\"
                className=\"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent\"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className=\"h-4 w-4\" />
                ) : (
                  <Eye className=\"h-4 w-4\" />
                )}
              </Button>
            </div>
          </div>

          <div className=\"space-y-2\">
            <Label htmlFor=\"mbtiType\">MBTI 유형 (선택사항)</Label>
            <Select onValueChange={handleMbtiChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder=\"MBTI 유형을 선택하세요\" />
              </SelectTrigger>
              <SelectContent>
                {MBTI_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type=\"submit\"
            className=\"w-full\"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
                가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </Button>

          {onSwitchToLogin && (
            <div className=\"text-center text-sm\">
              <span className=\"text-gray-600\">이미 계정이 있으신가요? </span>
              <Button
                type=\"button\"
                variant=\"link\"
                className=\"p-0 h-auto font-normal\"
                onClick={onSwitchToLogin}
                disabled={isLoading}
              >
                로그인
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}