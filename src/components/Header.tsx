import React, { useState, useRef } from 'react';
import { Logo } from './Logo';
import { ShoppingBag, LogOut, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentView: 'login' | 'home' | 'menu' | 'cart' | 'confirmation' | 'submitted' | 'admin';
  onNavigateHome?: () => void;
  onOpenAdmin: () => void;
  onSignOut?: () => void;
  selectedStudentName?: string;
  cartCount?: number;
  onOpenCart?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigateHome,
  onOpenAdmin,
  onSignOut,
  selectedStudentName,
  cartCount = 0,
  onOpenCart,
}) => {
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<any>(null);

  const handleLogoClick = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    if (nextCount >= 5) {
      setTapCount(0);
      onOpenAdmin();
      return;
    }

    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 2500);

    if (onNavigateHome && currentView !== 'login' && currentView !== 'submitted') {
      onNavigateHome();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 select-none shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left: Logo */}
        <div 
          className="flex items-center cursor-pointer" 
          onClick={handleLogoClick}
          title="Family Fiesta"
        >
          <Logo size="sm" showText={true} />
        </div>
        {/* Right Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* On Menu Page, show Edit Guest button instead of student name */}
          {currentView === 'menu' && onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center px-4 py-2 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold transition-colors shadow-sm"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              <span>Edit Guest</span>
            </button>
          )}

          {currentView !== 'login' && onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="bg-white border border-slate-200 rounded-full px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2 transition-all shadow-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
