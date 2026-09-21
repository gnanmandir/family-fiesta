import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  Crown,
  ShieldAlert,
  Calendar,
  Clock,
  Laptop,
  Smartphone,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  Globe,
} from 'lucide-react';
import { LoginHistoryItem, AdminRole } from '../../types';
import { api } from '../../services/api';

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const now = Date.now();
  const past = new Date(isoString).getTime();
  if (isNaN(past)) return '';
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1 min ago';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 7200) return '1 hour ago';
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 172800) return 'Yesterday';
  return `${Math.floor(diffSec / 86400)} days ago`;
}

export const LoginHistoryManager: React.FC = () => {
  const [history, setHistory] = useState<LoginHistoryItem[]>(() => {
    try {
      const cached = localStorage.getItem('admin_login_history_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLoginHistory();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load login history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await api.clearLoginHistory();
      setHistory([]);
      setShowClearConfirm(false);
    } catch (e) {
      alert('Failed to clear login history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  // Filtered list based on search and role filter
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.role === roleFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        item.username.toLowerCase().includes(term) ||
        (item.device || '').toLowerCase().includes(term) ||
        item.dateDisplay.toLowerCase().includes(term) ||
        item.timeDisplay.toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    });
  }, [history, roleFilter, searchTerm]);

  // KPI calculations
  const totalLogins = history.length;
  const superLogins = history.filter((h) => h.role === 'super').length;
  const adminLogins = history.filter((h) => h.role === 'admin').length;
  const bossLogins = history.filter((h) => h.role === 'boss').length;
  const lastLogin = history[0];

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'boss':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <ShieldAlert className="w-3 h-3 text-amber-700" />
            <span>Boss Authority</span>
          </span>
        );
      case 'super':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200/90 shadow-2xs">
            <Crown className="w-3 h-3 text-indigo-600" />
            <span>Super Admin</span>
          </span>
        );
      case 'admin':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-slate-600" />
            <span>Normal Admin</span>
          </span>
        );
    }
  };

  const getDeviceIcon = (device?: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile') || d.includes('ios') || d.includes('android') || d.includes('phone')) {
      return <Smartphone className="w-3.5 h-3.5 text-slate-500" />;
    }
    return <Laptop className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  Login History & Audit Trail
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-800 border border-amber-400/30">
                  Boss Authority
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                Real-time records tracking every time Normal Admin, Super Admin, or Boss logs into the portal.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={fetchHistory}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh login history"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 font-bold text-xs shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                title="Clear all login records"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Total Logins</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalLogins}</div>
          <div className="text-[10.5px] text-slate-400">All administrative sessions</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Super Admin</span>
            <Crown className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono">{superLogins}</div>
          <div className="text-[10.5px] text-indigo-500 font-medium">Full Authority logins</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Normal Admin</span>
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 font-mono">{adminLogins}</div>
          <div className="text-[10.5px] text-slate-400">Stall Operations logins</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Most Recent</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
            {lastLogin ? `${lastLogin.username} (${lastLogin.role})` : 'None Yet'}
          </div>
          <div className="text-[10.5px] text-slate-500 truncate">
            {lastLogin ? `${formatRelativeTime(lastLogin.timestamp)} • ${lastLogin.timeDisplay}` : 'Awaiting logins'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Role Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar">
          {[
            { id: 'all', label: `All (${totalLogins})` },
            { id: 'super', label: `Super Admin (${superLogins})` },
            { id: 'admin', label: `Normal Admin (${adminLogins})` },
            { id: 'boss', label: `Boss (${bossLogins})` },
          ].map((pill) => {
            const isActive = roleFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setRoleFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search username, device, date..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 outline-none transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Login History Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4 sm:px-6">Admin Role & Account</th>
                  <th className="py-3.5 px-4 sm:px-6">Date & Time</th>
                  <th className="py-3.5 px-4 sm:px-6">Elapsed</th>
                  <th className="py-3.5 px-4 sm:px-6">Device / Browser</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Role & Account */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {item.username}
                          </div>
                          <div className="mt-0.5">{getRoleBadge(item.role)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{item.dateDisplay}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.timeDisplay}</span>
                        </div>
                      </div>
                    </td>

                    {/* Elapsed Relative */}
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </td>

                    {/* Device & Browser */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center space-x-2 text-slate-700 font-medium">
                        {getDeviceIcon(item.device)}
                        <span className="truncate max-w-[220px]" title={item.userAgent || item.device}>
                          {item.device || 'Browser'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Authorized</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <History className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-800 text-sm">No Login Records Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || roleFilter !== 'all'
                ? 'No login events match the current filter or search criteria.'
                : 'Login events for Normal Admin and Super Admin accounts will be automatically recorded and displayed here in real time.'}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal to Clear History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Clear Login History</h3>
                <p className="text-xs text-slate-500">Permanently delete audit logs</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all <span className="font-bold text-slate-900">{history.length}</span> login records? This action cannot be undone and will reset the audit trail.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearHistory}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
