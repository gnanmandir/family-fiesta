import React, { useState } from 'react';
import { KeyRound, X, AlertCircle } from 'lucide-react';
import { Logo } from '../Logo';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('dada');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPwd = password.trim();
    setIsLoading(true);
    setError(false);
    
    try {
      let adminUser = 'dada';
      let adminPwd = 'niruma0212';
      try {
        const { api } = await import('../../services/api');
        const creds = await api.getAdminCredentials();
        adminUser = creds.username;
        adminPwd = creds.password;
      } catch (e) {}

      if (cleanUser === adminUser && cleanPwd === adminPwd) {
        localStorage.setItem('admin_token', 'session_' + Date.now());
        setError(false);
        setPassword('');
        onLoginSuccess();
        return;
      }

      const apiUrl = (import.meta.env.VITE_API_URL || '/api') + '/admin/login';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPwd }),
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        localStorage.setItem('admin_token', data.token);
        setError(false);
        setPassword('');
        onLoginSuccess();
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
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
                if (error) setError(false);
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
                  if (error) setError(false);
                }}
                placeholder="Enter password..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all shadow-xs"
                autoFocus
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Invalid username or password.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide shadow-md shadow-indigo-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoading ? 'Verifying...' : 'Unlock Portal'}
          </button>
        </form>

      </div>

    </div>
  );
};
