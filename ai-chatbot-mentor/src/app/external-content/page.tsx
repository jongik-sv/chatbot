'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ExternalContentManager } from '@/components/external';

export default function ExternalContentPage() {
  return (
    <MainLayout>
      <div className="h-full">
        <ExternalContentManager />
      </div>
    </MainLayout>
  );
}