import React from 'react';
import { EVENT_CONFIG } from '../config/eventConfig';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = false }) => {
  const sizeClasses = {
    xs: 'w-8 h-8 sm:w-9 sm:h-9',
    sm: 'w-10 h-10 sm:w-12 sm:h-12',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32 sm:w-40 sm:h-40',
  };

  return (
    <div className={`flex items-center ${showText ? 'space-x-2.5 sm:space-x-3' : ''} ${className}`}>
      <div className={`relative flex items-center justify-center overflow-hidden bg-white ring-2 ring-blue-500/10 shadow-xs p-0.5 rounded-full transition-transform hover:scale-105 shrink-0 ${sizeClasses[size]}`}>
        <img
          src={EVENT_CONFIG.logo}
          alt={`${EVENT_CONFIG.fullName} Logo`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-full"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
              {EVENT_CONFIG.name}
            </h1>
          </div>
        </div>
      )}
    </div>
  );
};
