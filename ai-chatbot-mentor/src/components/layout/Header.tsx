'use client';

import { Bars3Icon, UserCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={onMenuClick}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Title */}
          <div className="flex-1 lg:flex-none">
            <h1 className="text-xl font-semibold text-gray-900 lg:hidden">
              AI 챗봇 멘토
            </h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Settings button */}
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </button>

            {/* User profile */}
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <UserCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}