import React, { useState, useEffect } from 'react';
import { KeyRound, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { Logo } from '../Logo';
import { AdminRole } from '../../types';
import { checkLockout, recordFailedAttempt, resetAttempts, setAdminSession } from '../../services/security';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (role: AdminRole) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSec, setLockoutSec] = useState(0);

  // Check initial rate limit status on modal open
  useEffect(() => {
    if (!isOpen) return;
    const lock = checkLockout('admin_login');
    if (lock.isLocked) {
      setLockoutSec(lock.remainingSeconds);
      setErrorMsg(`Admin Login Locked: Too many failed attempts. Please wait ${lock.remainingSeconds}s.`);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSec <= 0) return;
    const timer = setInterval(() => {
      setLockoutSec((prev) => {
        if (prev <= 1) {
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSec]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pre-check rate limit lockout
    const lock = checkLockout('admin_login');
    if (lock.isLocked) {
      setLockoutSec(lock.remainingSeconds);
      setErrorMsg(`Admin Login Locked: Too many failed attempts. Please wait ${lock.remainingSeconds}s.`);
      return;
    }

    const cleanUser = username.trim();
    const cleanPwd = password.trim();
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      const { api } = await import('../../services/api');
      const authResult = await api.verifyAdminLogin(cleanUser, cleanPwd);

      if (authResult.success && authResult.role) {
        resetAttempts('admin_login');
        setAdminSession('session_' + Date.now(), authResult.role, cleanUser);
        setErrorMsg(null);
        setPassword('');
        onLoginSuccess(authResult.role);
        return;
      }

      // Fallback check against backend API if present
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || '/api') + '/admin/login';
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPwd }),
        });
        const data = await res.json();
        
        if (data.success && data.token) {
          const role = (data.role as AdminRole) || 'admin';
          resetAttempts('admin_login');
          setAdminSession(data.token, role, cleanUser);
          setErrorMsg(null);
          setPassword('');
          onLoginSuccess(role);
          return;
        }
      } catch (e) {}

      const fail = recordFailedAttempt('admin_login', 5, 15 * 60 * 1000);
      if (fail.isLocked) {
        setLockoutSec(fail.remainingSeconds);
        setErrorMsg(`Security Lockout: 5 failed admin attempts. Admin login locked for 15 minutes.`);
      } else {
        setErrorMsg(`Invalid username or password. (${fail.attemptsLeft} attempt${fail.attemptsLeft === 1 ? '' : 's'} remaining)`);
      }
    } catch (err: any) {
      const fail = recordFailedAttempt('admin_login', 5, 15 * 60 * 1000);
      setErrorMsg(`Invalid credentials. (${fail.attemptsLeft} attempt${fail.attemptsLeft === 1 ? '' : 's'} remaining)`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-150 text-stone-900">
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="flex justify-center mx-auto">
            <Logo size="lg" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">Admin Portal</h2>
          <p className="text-xs text-stone-500">
            Enter administrator credentials to manage stall orders.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Username..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all shadow-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter password..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all shadow-xs"
                autoFocus
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 font-medium animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || lockoutSec > 0}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center space-x-2 ${
              lockoutSec > 0
                ? 'bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed opacity-90'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-60'
            }`}
          >
            {lockoutSec > 0 ? (
              <span className="flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Locked ({lockoutSec}s)</span>
              </span>
            ) : isLoading ? (
              'Verifying...'
            ) : (
              'Unlock Portal'
            )}
          </button>
        </form>

      </div>

    </div>
  );
};
