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
  Filter,
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
  if (diffSec < 90) return '1m ago';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 7200) return '1h ago';
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatDetailsTextWithIST(text?: string): string {
  if (!text) return '';
  return text.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g, (match) => {
    try {
      const d = new Date(match);
      if (!isNaN(d.getTime())) {
        return (
          d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }) + ' IST'
        );
      }
    } catch (e) {}
    return match;
  });
}

function getISTDateDisplay(timestamp?: string, fallback?: string): string {
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return fallback || '';
}

function getISTTimeDisplay(timestamp?: string, fallback?: string): string {
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }
  return fallback || '';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [actionFilter, setActionFilter] = useState<'all' | AdminActionType>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Background silent synchronization
  const silentSync = async () => {
    try {
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
    } catch (e) {}
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

    // 1. Cross-tab sync via BroadcastChannel
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

    // 2. Custom event & storage event
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

    // 3. Fast 2-second real-time polling
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        silentSync();
      }
    }, 2000);

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

  // Deduplicate consecutive identical activities within 5 minutes
  const deduplicatedActivities = useMemo(() => {
    const list = filteredActivities;
    const result: AdminActivityLog[] = [];
    for (let i = 0; i < list.length; i++) {
      const curr = list[i];
      const prev = result[result.length - 1];
      if (
        prev &&
        prev.actionType === curr.actionType &&
        prev.title === curr.title &&
        prev.username === curr.username &&
        Math.abs(new Date(prev.timestamp).getTime() - new Date(curr.timestamp).getTime()) < 300000
      ) {
        continue;
      }
      result.push(curr);
    }
    return result;
  }, [filteredActivities]);

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

  // Metric counts
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
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
            <ShieldAlert className="w-2.5 h-2.5 text-amber-700" />
            <span>Boss</span>
          </span>
        );
      case 'super':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Crown className="w-2.5 h-2.5 text-slate-600" />
            <span>Super Admin</span>
          </span>
        );
      case 'admin':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <ShieldCheck className="w-2.5 h-2.5 text-slate-500" />
            <span>Admin</span>
          </span>
        );
    }
  };

  const getActionBadge = (actionType: AdminActionType) => {
    switch (actionType) {
      case 'portal_toggle':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
            <Power className="w-3 h-3 text-emerald-600" />
            <span>Portal Open/Halt</span>
          </span>
        );
      case 'phase_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
            <RotateCcw className="w-3 h-3 text-amber-600" />
            <span>Phase Switch</span>
          </span>
        );
      case 'schedule_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Schedule</span>
          </span>
        );
      case 'order_wipe':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <Trash2 className="w-3 h-3 text-rose-600" />
            <span>Order Wipe</span>
          </span>
        );
      case 'tier_update':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
            <IndianRupee className="w-3 h-3 text-purple-600" />
            <span>Pricing Tiers</span>
          </span>
        );
      case 'credential_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
            <KeyRound className="w-3 h-3 text-amber-600" />
            <span>Password Update</span>
          </span>
        );
      case 'session_resume':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Radio className="w-3 h-3 text-slate-500" />
            <span>Session Resumed</span>
          </span>
        );
      case 'login':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            <span>Login Authorized</span>
          </span>
        );
    }
  };

  const getDeviceIcon = (device?: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile') || d.includes('ios') || d.includes('android') || d.includes('phone')) {
      return <Smartphone className="w-3.5 h-3.5 text-slate-400" />;
    }
    return <Laptop className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-4 text-slate-800 animate-in fade-in duration-150">
      
      {/* 1. Sleek Minimal Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Activity & Login Audit Trail
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Boss Access
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Real-time monitoring of configuration changes, system events, and admin logins.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>

          <button
            type="button"
            onClick={fetchAllData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {((activeSubTab === 'activities' && activities.length > 0) ||
            (activeSubTab === 'logins' && history.length > 0)) && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Clear current view logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Overview Strip: Evenly distributed metrics and presence across full width */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-0 lg:divide-x divide-slate-100">
          
          <div className="lg:px-4 first:lg:pl-0">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Total Actions</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-bold text-slate-900 font-mono">{totalActivities}</span>
              <span className="text-[11px] text-slate-400">logged</span>
            </div>
          </div>

          <div className="lg:px-4">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Portal Toggles</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-bold text-slate-900 font-mono">{portalToggles}</span>
              <span className="text-[11px] text-slate-400">open/halt</span>
            </div>
          </div>

          <div className="lg:px-4">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">System Changes</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-bold text-slate-900 font-mono">{systemChanges}</span>
              <span className="text-[11px] text-slate-400">wipes/tiers</span>
            </div>
          </div>

          <div className="lg:px-4">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Login Sessions</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-bold text-slate-900 font-mono">{totalLogins}</span>
              <span className="text-[11px] text-slate-400">auths</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:px-4 lg:pl-5">
            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>Online Now ({activeCount})</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {onlineAdmins.length > 0 ? (
                onlineAdmins.map((admin) => (
                  <div
                    key={admin.username}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                  >
                    {getRoleBadge(admin.role)}
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(admin.lastSeen)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Active session</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Modern Segmented Toolbar: Sub-tabs, Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
        
        {/* Left: Clean Segmented Sub-tab Control */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('activities')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'activities'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Activity Log ({activities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logins')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'logins'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Login Sessions ({history.length})</span>
          </button>
        </div>

        {/* Right: Clean Filters & Search Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          
          {/* Role Filter Dropdown */}
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] font-medium text-slate-500 hidden sm:inline">Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition-colors cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="boss">Boss</option>
              <option value="super">Super Admin</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Action Type Filter Dropdown (only for activities tab) */}
          {activeSubTab === 'activities' && (
            <div className="flex items-center space-x-1.5">
              <label className="text-[11px] font-medium text-slate-500 hidden sm:inline">Action:</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition-colors cursor-pointer"
              >
                <option value="all">All Actions</option>
                <option value="portal_toggle">Portal Open/Halt</option>
                <option value="schedule_change">Schedule</option>
                <option value="phase_change">Phase Switch</option>
                <option value="order_wipe">Order Wipes</option>
                <option value="tier_update">Pricing Tiers</option>
                <option value="credential_change">Password Updates</option>
                <option value="session_resume">Session Resumes</option>
                <option value="login">Logins</option>
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-400 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

        </div>

      </div>

      {/* 4. Main Clean Table */}
      {activeSubTab === 'activities' ? (
        /* Activity & Changes Table */
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          {deduplicatedActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4">Admin</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deduplicatedActivities.map((act, idx) => (
                    <tr key={act.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      {/* Admin & Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                          {getRoleBadge(act.role)}
                        </div>
                      </td>

                      {/* Action Type / Event */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getActionBadge(act.actionType)}
                          <div className="font-semibold text-slate-900 text-xs">
                            {act.title}
                          </div>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 max-w-sm lg:max-w-md">
                        <div className="text-xs text-slate-600 leading-relaxed font-normal">
                          {formatDetailsTextWithIST(act.details) || '—'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium text-xs">
                          {getISTDateDisplay(act.timestamp, act.dateDisplay)}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center space-x-1.5 mt-0.5">
                          <span>{getISTTimeDisplay(act.timestamp, act.timeDisplay)}</span>
                          <span>•</span>
                          <span className="text-slate-500 font-medium">{formatRelativeTime(act.timestamp)}</span>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
                          {getDeviceIcon(act.device)}
                          <span className="truncate max-w-[160px]" title={act.device}>
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
            <div className="py-12 px-4 text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-800 text-xs">No Activity Records Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || roleFilter !== 'all' || actionFilter !== 'all'
                  ? 'No actions match the selected filters.'
                  : 'Administrative actions and portal events will automatically appear here.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Login Sessions Table */
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          {filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4">Admin Account</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Elapsed</th>
                    <th className="py-3 px-4">Device / Browser</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      {/* Role & Account */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                          {getRoleBadge(item.role)}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium text-xs">
                          {getISTDateDisplay(item.timestamp, item.dateDisplay)}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {getISTTimeDisplay(item.timestamp, item.timeDisplay)}
                        </div>
                      </td>

                      {/* Elapsed */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-slate-600 font-medium text-xs">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
                          {getDeviceIcon(item.device)}
                          <span className="truncate max-w-[200px]" title={item.userAgent || item.device}>
                            {item.device || 'Browser'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
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
            <div className="py-12 px-4 text-center space-y-2">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-800 text-xs">No Login Records Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || roleFilter !== 'all'
                  ? 'No login events match the current filter.'
                  : 'Admin login authentications will be recorded and displayed here.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal to Clear Records */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-slate-800">
              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Clear {activeSubTab === 'activities' ? 'Activity Log' : 'Login History'}
                </h3>
                <p className="text-xs text-slate-500">Reset stored audit trail records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all{' '}
              <span className="font-semibold text-slate-900">
                {activeSubTab === 'activities' ? activities.length : history.length}
              </span>{' '}
              records? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
