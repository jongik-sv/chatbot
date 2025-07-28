// components/ui/badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
  onClick?: () => void;
}

export function Badge({ 
  children, 
  variant = 'default', 
  className = '', 
  onClick 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-300 text-gray-700',
    destructive: 'bg-red-100 text-red-800'
  };
  
  const Component = onClick ? 'button' : 'span';
  
  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${onClick ? 'hover:bg-opacity-80 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}