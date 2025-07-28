'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  userId: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  // 사용자 정보 확인
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.authenticated) {
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });

      // 페이지 새로고침하여 캐시 정리
      window.location.reload();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }, []);

  // 사용자 정보 업데이트
  const updateUser = useCallback((user: User) => {
    setAuthState(prev => ({
      ...prev,
      user,
      isAuthenticated: true
    }));
  }, []);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    checkAuth,
    logout,
    updateUser
  };
}