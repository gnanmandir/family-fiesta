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
  Power,
  KeyRound,
  IndianRupee,
  Layers,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  LoginHistoryItem,
  AdminRole,
  AdminActivityLog,
  AdminPresence,
  AdminActionType,
} from '../../types';
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
  const [activeSubTab, setActiveSubTab] = useState<'activities' | 'logins'>('activities');
  
  // Data states
  const [activities, setActivities] = useState<AdminActivityLog[]>(() => {
    try {
      const cached = localStorage.getItem('admin_activity_logs_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [history, setHistory] = useState<LoginHistoryItem[]>(() => {
    try {
      const cached = localStorage.getItem('admin_login_history_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [onlineAdmins, setOnlineAdmins] = useState<AdminPresence[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [actionFilter, setActionFilter] = useState<'all' | AdminActionType>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Background silent synchronization without UI-locking spinners
  const silentSync = async () => {
    try {
      setIsLiveSyncing(true);
      const [actLogs, loginLogs, onlineList] = await Promise.all([
        api.getActivityLogs(),
        api.getLoginHistory(),
        api.getOnlineAdmins(),
      ]);
      setActivities((prev) => {
        if (
          prev.length !== actLogs.length ||
          prev[0]?.id !== actLogs[0]?.id ||
          JSON.stringify(prev) !== JSON.stringify(actLogs)
        ) {
          return actLogs;
        }
        return prev;
      });
      setHistory((prev) => {
        if (
          prev.length !== loginLogs.length ||
          prev[0]?.id !== loginLogs[0]?.id ||
          JSON.stringify(prev) !== JSON.stringify(loginLogs)
        ) {
          return loginLogs;
        }
        return prev;
      });
      setOnlineAdmins((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(onlineList)) {
          return onlineList;
        }
        return prev;
      });
    } catch (e) {
    } finally {
      setIsLiveSyncing(false);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [actLogs, loginLogs, onlineList] = await Promise.all([
        api.getActivityLogs(),
        api.getLoginHistory(),
        api.getOnlineAdmins(),
      ]);
      setActivities(actLogs);
      setHistory(loginLogs);
      setOnlineAdmins(onlineList);
    } catch (e) {
      console.error('Failed to load activity & login records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // 1. Instant 0ms Cross-tab sync via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('admin_audit_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NEW_ACTIVITY' && event.data.item) {
            setActivities((prev) => [event.data.item, ...prev.filter((a) => a.id !== event.data.item.id)]);
          } else if (event.data?.type === 'NEW_LOGIN' && event.data.item) {
            setHistory((prev) => [event.data.item, ...prev.filter((h) => h.id !== event.data.item.id)]);
          }
          silentSync();
        };
      }
    } catch (e) {}

    // 2. Instant same-window custom event & storage event
    const handleActivityEvent = (e: any) => {
      if (e.detail?.actionType) {
        setActivities((prev) => [e.detail, ...prev.filter((a) => a.id !== e.detail.id)]);
      } else if (e.detail?.role && !e.detail?.actionType) {
        setHistory((prev) => [e.detail, ...prev.filter((h) => h.id !== e.detail.id)]);
      }
      silentSync();
    };
    window.addEventListener('admin_activity_updated', handleActivityEvent);
    window.addEventListener('storage', silentSync);

    // 3. Fast 2-second real-time polling across devices
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        silentSync();
      }
    }, 2000);

    // 4. Refresh immediately on window focus/tab switch
    const handleFocus = () => {
      silentSync();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('admin_activity_updated', handleActivityEvent);
      window.removeEventListener('storage', silentSync);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      if (activeSubTab === 'activities') {
        await api.clearActivityLogs();
        setActivities([]);
      } else {
        await api.clearLoginHistory();
        setHistory([]);
      }
      setShowClearConfirm(false);
    } catch (e) {
      alert('Failed to clear records. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesRole = roleFilter === 'all' || act.role === roleFilter;
      const matchesAction = actionFilter === 'all' || act.actionType === actionFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        act.username.toLowerCase().includes(term) ||
        act.title.toLowerCase().includes(term) ||
        (act.details || '').toLowerCase().includes(term) ||
        (act.device || '').toLowerCase().includes(term) ||
        act.dateDisplay.toLowerCase().includes(term) ||
        act.timeDisplay.toLowerCase().includes(term);
      return matchesRole && matchesAction && matchesSearch;
    });
  }, [activities, roleFilter, actionFilter, searchTerm]);

  // Filtered logins
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
  const totalActivities = activities.length;
  const portalToggles = activities.filter((a) => a.actionType === 'portal_toggle').length;
  const systemChanges = activities.filter(
    (a) =>
      a.actionType === 'order_wipe' ||
      a.actionType === 'tier_update' ||
      a.actionType === 'schedule_change' ||
      a.actionType === 'phase_change' ||
      a.actionType === 'credential_change'
  ).length;
  const totalLogins = history.length;
  const activeCount = onlineAdmins.length;

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'boss':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <ShieldAlert className="w-3 h-3 text-amber-700" />
            <span>Boss Authority</span>
          </span>
        );
      case 'super':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200/90 shadow-2xs">
            <Crown className="w-3 h-3 text-indigo-600" />
            <span>Super Admin</span>
          </span>
        );
      case 'admin':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-slate-600" />
            <span>Normal Admin</span>
          </span>
        );
    }
  };

  const getActionBadge = (actionType: AdminActionType) => {
    switch (actionType) {
      case 'portal_toggle':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Power className="w-3 h-3 text-emerald-600" />
            <span>Portal Open/Halt</span>
          </span>
        );
      case 'phase_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <RotateCcw className="w-3 h-3 text-amber-600" />
            <span>Phase Switch</span>
          </span>
        );
      case 'schedule_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" />
            <span>Schedule Edit</span>
          </span>
        );
      case 'order_wipe':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Trash2 className="w-3 h-3 text-rose-600" />
            <span>Order Wipe</span>
          </span>
        );
      case 'tier_update':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <IndianRupee className="w-3 h-3 text-purple-600" />
            <span>Pricing Tiers</span>
          </span>
        );
      case 'credential_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <KeyRound className="w-3 h-3 text-amber-700" />
            <span>Password Update</span>
          </span>
        );
      case 'session_resume':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Radio className="w-3 h-3 text-cyan-600" />
            <span>Session Resumed</span>
          </span>
        );
      case 'login':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Login Authorized</span>
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
                  Activity, Changes & Login Audit Trail
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-800 border border-amber-400/30">
                  Boss Authority
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                Real-time tracking for active sessions, ordering status changes, schedule updates, wipes, and admin logins.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Auto-Sync</span>
            </div>

            <button
              type="button"
              onClick={fetchAllData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Force sync live activity and logins"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {((activeSubTab === 'activities' && activities.length > 0) ||
              (activeSubTab === 'logins' && history.length > 0)) && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 font-bold text-xs shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                title="Clear logs for current view"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear {activeSubTab === 'activities' ? 'Activities' : 'Logins'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Online Now Presence Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
              <span className="relative w-2.5 h-2.5 bg-emerald-600 rounded-full" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  Live Online Presence
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                  {activeCount} {activeCount === 1 ? 'Admin Active Now' : 'Admins Active Now'}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-600 font-medium mt-0.5">
                Shows who currently has the admin portal open or active within the last 2 minutes.
              </p>
            </div>
          </div>

          {/* Active Admins Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {onlineAdmins.length > 0 ? (
              onlineAdmins.map((admin) => (
                <div
                  key={admin.username}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 shadow-2xs text-xs font-bold text-slate-800"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-extrabold text-slate-900">{admin.username}</span>
                  {getRoleBadge(admin.role)}
                  <span className="text-[10px] text-slate-400 font-normal">
                    {formatRelativeTime(admin.lastSeen)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 font-medium italic">
                Active session detected (You are logged in)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Total Logged Actions</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalActivities}</div>
          <div className="text-[10.5px] text-slate-400">Portal toggles, wipes & edits</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Portal Open/Halts</span>
            <Power className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">{portalToggles}</div>
          <div className="text-[10.5px] text-emerald-600 font-medium">Ordering portal toggles</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>System Modifications</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">{systemChanges}</div>
          <div className="text-[10.5px] text-amber-600 font-medium">Wipes, schedules & tiers</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold text-xs">
            <span>Total Login Sessions</span>
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 font-mono">{totalLogins}</div>
          <div className="text-[10.5px] text-slate-400">Admin authentications</div>
        </div>
      </div>

      {/* Sub-Tabs: Activities vs Login Sessions */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('activities')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'activities'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activity & Changes Log ({activities.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('logins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'logins'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Login History Sessions ({history.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Role Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Role:</span>
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'boss', label: 'Boss' },
              { id: 'super', label: 'Super Admin' },
              { id: 'admin', label: 'Normal Admin' },
            ].map((pill) => {
              const isActive = roleFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRoleFilter(pill.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
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
              placeholder={
                activeSubTab === 'activities'
                  ? 'Search action, details, user...'
                  : 'Search username, device, date...'
              }
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

        {/* Action Type Filter (for activities tab) */}
        {activeSubTab === 'activities' && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-2 border-t border-slate-100 custom-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Action:</span>
            {[
              { id: 'all', label: 'All Actions' },
              { id: 'portal_toggle', label: 'Portal Open/Halt' },
              { id: 'schedule_change', label: 'Schedule' },
              { id: 'phase_change', label: 'Phase Switch' },
              { id: 'order_wipe', label: 'Order Wipes' },
              { id: 'tier_update', label: 'Pricing Tiers' },
              { id: 'credential_change', label: 'Password Updates' },
              { id: 'session_resume', label: 'Session Resumes' },
              { id: 'login', label: 'Logins' },
            ].map((pill) => {
              const isActive = actionFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActionFilter(pill.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
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
        )}
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'activities' ? (
        /* Activity & Changes Table */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {filteredActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 sm:px-6">Action / Event</th>
                    <th className="py-3.5 px-4 sm:px-6">Admin & Role</th>
                    <th className="py-3.5 px-4 sm:px-6">Details & Changes Made</th>
                    <th className="py-3.5 px-4 sm:px-6">Date & Time</th>
                    <th className="py-3.5 px-4 sm:px-6">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.map((act, idx) => (
                    <tr key={act.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Action Type */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-1">
                          {getActionBadge(act.actionType)}
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {act.title}
                          </div>
                        </div>
                      </td>

                      {/* Admin & Role */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">
                              {act.username}
                            </div>
                            <div className="mt-0.5">{getRoleBadge(act.role)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 sm:px-6 max-w-xs sm:max-w-md">
                        <div className="text-xs text-slate-700 font-medium leading-relaxed">
                          {act.details || 'No additional details logged.'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{act.dateDisplay}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{act.timeDisplay}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-indigo-600 font-sans font-bold">
                              {formatRelativeTime(act.timestamp)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-slate-700 font-medium text-[11px]">
                          {getDeviceIcon(act.device)}
                          <span className="truncate max-w-[180px]" title={act.device}>
                            {act.device || 'Browser'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Activity className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm">No Activity Records Found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || roleFilter !== 'all' || actionFilter !== 'all'
                  ? 'No actions match the selected filters or search term.'
                  : 'All administrative actions including opening/halting the ordering portal, schedule changes, wipes, and tier edits will automatically show up here in real time.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Login Sessions Table */
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
                  : 'Login events for Normal Admin, Super Admin, and Boss will be automatically recorded and displayed here in real time.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal to Clear Records */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Clear {activeSubTab === 'activities' ? 'Activity Log' : 'Login History'}
                </h3>
                <p className="text-xs text-slate-500">Permanently delete audit records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all{' '}
              <span className="font-bold text-slate-900">
                {activeSubTab === 'activities' ? activities.length : history.length}
              </span>{' '}
              records? This action cannot be undone and will reset the audit trail.
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
                onClick={handleClear}
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
