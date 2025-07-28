'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: any) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  initialMode = 'login' 
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegisterSuccess = () => {
    setSuccessMessage('회원가입이 완료되었습니다! 로그인해주세요.');
    setShowSuccess(true);
    setMode('login');
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const handleLoginSuccess = (user: any) => {
    onLoginSuccess?.(user);
    onClose();
  };

  const handleClose = () => {
    setMode(initialMode);
    setShowSuccess(false);
    setSuccessMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className=\"sm:max-w-md p-0 gap-0\">
        <div className=\"p-6\">
          {showSuccess && (
            <Alert className=\"mb-4 border-green-200 bg-green-50\">
              <CheckCircle className=\"h-4 w-4 text-green-600\" />
              <AlertDescription className=\"text-green-800\">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setMode('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}