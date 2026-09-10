import React from 'react';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_1787459637243.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = false }) => {
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32 sm:w-40 sm:h-40',
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`relative flex items-center justify-center overflow-hidden bg-white ring-2 ring-blue-500/10 shadow-sm p-0.5 rounded-full transition-transform hover:scale-105 ${sizeClasses[size]}`}>
        <img
          src={familyFiestaLogo}
          alt="Family Fiesta 2026 Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-full"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
              Family Fiesta
            </h1>
          </div>
        </div>
      )}
    </div>
  );
};
