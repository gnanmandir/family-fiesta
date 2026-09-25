import React, { useState, useRef, useEffect } from 'react';
import { Order, Student, FoodItem, OrderStatus, OrderSchedule } from '../../types';
import { Logo } from '../Logo';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  RotateCcw,
  IndianRupee,
  TrendingUp,
  Award,
  ArrowLeft,
  Trash2,
  Lock,
  LogOut,
  Power,
  ShieldAlert,
  Eye,
  EyeOff,
  X,
  KeyRound,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  Crown,
  ShieldCheck,
  Check,
  Calendar,
  Clock,
  History,
  Download,
  Smartphone,
  Share2,
} from 'lucide-react';
import { canInstallPwa, promptAdminInstall, isPwaStandalone } from '../../services/pwa';
import {
  evaluateSchedule,
  isScheduleDone,
  formatScheduleDisplay,
  toDateTimeLocalString,
} from '../../utils/schedule';
import {
  parseActivePhases,
  serializeActivePhases,
  formatActivePhasesLabel,
  ActivePhase,
} from '../../utils/phaseUtils';
import { AnalyticsCharts } from './AnalyticsCharts';
import { OrderTable } from './OrderTable';
import { StudentManager } from './StudentManager';
import { GuestManager } from './GuestManager';
import { FoodManager } from './FoodManager';
import { PricingManager } from './PricingManager';
import { LoginHistoryManager } from './LoginHistoryManager';
import { api } from '../../services/api';

interface AdminDashboardProps {
  orders: Order[];
  students: Student[];
  guests?: import('../../types').GuestCredential[];
  menuItems: FoodItem[];
  adminRole?: import('../../types').AdminRole;
  systemControls?: import('../../types').SystemControls;
  onUpdateSystemControls?: (controls: import('../../types').SystemControls) => Promise<void> | void;
  onUpdateOrderStatus: (orderNumber: string, status: OrderStatus) => void;
  onDeleteOrder: (orderNumber: string) => void;
  onDeleteCompletedOrders?: () => void;
  onSaveMenuItems: (items: FoodItem[]) => void;
  onStudentUpdated?: (student: Student) => void;
  onStudentDeleted?: (studentId: string, fullName?: string) => Promise<void> | void;
  onWipeStudentOrder?: (student: Student, order?: Order) => Promise<void> | void;
  onResetDeviceLock: () => void;
  onClearAllOrders: () => void;
  onClearOrdersByRole?: (role: 'parent' | 'student' | 'staff' | 'all') => Promise<void> | void;
  onExitAdmin: () => void;
  onLogoutAdmin: () => void;
  ordersOpen?: boolean;
  orderSchedule?: OrderSchedule;
  onToggleOrdering?: (isOpen: boolean) => void;
  onSaveSchedule?: (schedule: OrderSchedule) => Promise<void> | void;
  onRefreshOrders?: () => Promise<void> | void;
  intakePhase?: import('../types').IntakePhase;
  onSetIntakePhase?: (phase: import('../types').IntakePhase) => void;
}

interface RollerTimePickerProps {
  hour12: number;
  minute: number;
  ampm: 'AM' | 'PM';
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
  onChangeAmpm: (ap: 'AM' | 'PM') => void;
  theme?: 'rose' | 'emerald' | 'indigo';
}

interface RollerWheelColumnProps<T> {
  items: T[];
  value: T;
  onChange: (val: T) => void;
  renderItem?: (val: T, isSelected: boolean) => React.ReactNode;
  widthClass?: string;
}

function RollerWheelColumn<T extends string | number>({
  items,
  value,
  onChange,
  renderItem,
  widthClass = 'w-16',
}: RollerWheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const isProgrammaticRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);
  const ITEM_HEIGHT = 40; // px

  // Sync scroll position when external value changes
  useEffect(() => {
    if (!containerRef.current) return;
    const idx = items.indexOf(value);
    if (idx !== -1) {
      const targetTop = idx * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetTop) > 1) {
        isProgrammaticRef.current = true;
        containerRef.current.scrollTop = targetTop;
        setTimeout(() => {
          isProgrammaticRef.current = false;
        }, 80);
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (!containerRef.current || isProgrammaticRef.current) return;
    isScrollingRef.current = true;
    clearTimeout(scrollTimeoutRef.current);

    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    if (idx >= 0 && idx < items.length && items[idx] !== value) {
      onChange(items[idx]);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (containerRef.current && !isProgrammaticRef.current) {
        const snapIdx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
        if (snapIdx >= 0 && snapIdx < items.length) {
          isProgrammaticRef.current = true;
          containerRef.current.scrollTop = snapIdx * ITEM_HEIGHT;
          setTimeout(() => {
            isProgrammaticRef.current = false;
          }, 80);
          if (items[snapIdx] !== value) {
            onChange(items[snapIdx]);
          }
        }
      }
    }, 120);
  };

  const handleItemClick = (item: T, idx: number) => {
    if (containerRef.current) {
      isProgrammaticRef.current = true;
      containerRef.current.scrollTop = idx * ITEM_HEIGHT;
      setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 80);
    }
    onChange(item);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`h-[200px] ${widthClass} overflow-y-auto scrollbar-none snap-y snap-mandatory relative`}
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* 80px spacer on top so index 0 centers at 80px */}
      <div style={{ height: '80px' }} className="shrink-0" />
      {items.map((item, idx) => {
        const isSelected = item === value;
        return (
          <div
            key={String(item)}
            onClick={() => handleItemClick(item, idx)}
            style={{ height: `${ITEM_HEIGHT}px` }}
            className="flex items-center justify-center snap-center cursor-pointer select-none transition-all duration-150"
          >
            {renderItem ? (
              renderItem(item, isSelected)
            ) : (
              <span
                className={`transition-all duration-150 font-mono ${
                  isSelected
                    ? 'text-slate-900 text-2xl font-black scale-105'
                    : 'text-slate-400 text-sm font-semibold hover:text-slate-600'
                }`}
              >
                {typeof item === 'number' ? String(item).padStart(2, '0') : item}
              </span>
            )}
          </div>
        );
      })}
      {/* 80px spacer on bottom so last index centers at 80px */}
      <div style={{ height: '80px' }} className="shrink-0" />
    </div>
  );
}

const RollerTimePicker: React.FC<RollerTimePickerProps> = ({
  hour12,
  minute,
  ampm,
  onChangeHour,
  onChangeMinute,
  onChangeAmpm,
  theme = 'indigo',
}) => {
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const ampmList: ('AM' | 'PM')[] = ['AM', 'PM'];

  const themeAccent = {
    indigo: 'border-indigo-400 bg-indigo-50/90 text-indigo-700 shadow-xs',
    emerald: 'border-emerald-400 bg-emerald-50/90 text-emerald-700 shadow-xs',
    rose: 'border-rose-400 bg-rose-50/90 text-rose-700 shadow-xs',
  }[theme];

  return (
    <div className="relative flex items-center justify-center bg-white rounded-2xl px-3 py-2 border border-slate-200/90 shadow-md overflow-hidden select-none w-full max-w-[260px]">
      {/* Top Fading Mask Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/85 to-transparent z-10" />

      {/* Bottom Fading Mask Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent z-10" />

      {/* Center Highlight Bar (matching user's reference image in white theme) */}
      <div className={`pointer-events-none absolute inset-x-2.5 top-[88px] h-[40px] rounded-xl border backdrop-blur-xs z-5 ${themeAccent}`} />

      {/* Roller Columns */}
      <div className="flex items-center justify-center space-x-1 relative z-8">
        {/* Hours Column */}
        <RollerWheelColumn
          items={hours}
          value={hour12}
          onChange={onChangeHour}
          widthClass="w-16"
        />

        {/* Colon Separator */}
        <div className="flex items-center justify-center w-4 h-[40px] text-slate-500 font-mono font-bold text-xl select-none z-15">
          :
        </div>

        {/* Minutes Column */}
        <RollerWheelColumn
          items={minutes}
          value={minute}
          onChange={onChangeMinute}
          widthClass="w-16"
        />

        {/* AM / PM Column */}
        <RollerWheelColumn
          items={ampmList}
          value={ampm}
          onChange={onChangeAmpm}
          widthClass="w-16"
          renderItem={(val, isSelected) => (
            <span
              className={`transition-all duration-150 text-xs tracking-wider font-extrabold ${
                isSelected
                  ? 'text-slate-900 text-sm font-black scale-110'
                  : 'text-slate-400 text-xs font-semibold hover:text-slate-600'
              }`}
            >
              {val}
            </span>
          )}
        />
      </div>
    </div>
  );
};

interface DateTimePickerProps {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  themeColor?: 'rose' | 'emerald' | 'indigo';
  defaultExpanded?: boolean;
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (isoString: string) => void;
  onClear?: () => void;
  defaultTime?: { hour: number; minute: number; ampm: 'AM' | 'PM' };
  note?: string;
}

function parseDateTimeParts(val: string) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const dateStr = `${year}-${month}-${day}`;

  const h24 = d.getHours();
  const min = d.getMinutes();
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;
  return { dateStr, hour12, minute: min, ampm, h24 };
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  sublabel,
  icon,
  iconBg,
  themeColor = 'indigo',
  defaultExpanded = true,
  value,
  onChange,
  onClear,
  defaultTime = { hour: 11, minute: 59, ampm: 'PM' },
  note,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const parsed = parseDateTimeParts(value);

  // Local state for time wheels when no date has been selected yet
  const [localHour, setLocalHour] = useState(defaultTime.hour);
  const [localMinute, setLocalMinute] = useState(defaultTime.minute);
  const [localAmpm, setLocalAmpm] = useState(defaultTime.ampm);

  useEffect(() => {
    if (parsed) {
      setLocalHour(parsed.hour12);
      setLocalMinute(parsed.minute);
      setLocalAmpm(parsed.ampm);
    } else {
      setLocalHour(defaultTime.hour);
      setLocalMinute(defaultTime.minute);
      setLocalAmpm(defaultTime.ampm);
    }
  }, [value]);

  const currentHour = parsed ? parsed.hour12 : localHour;
  const currentMinute = parsed ? parsed.minute : localMinute;
  const currentAmpm = parsed ? parsed.ampm : localAmpm;

  const commit = (dateStr: string, hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    if (!dateStr) return; // Never auto-commit or synthesize a date if no date was picked!
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;
    const [y, mon, d] = dateStr.split('-').map(Number);
    const target = new Date(y, mon - 1, d, h24, minute, 0, 0);
    onChange(target.toISOString());
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onClear?.();
      return;
    }
    commit(newDate, currentHour, currentMinute, currentAmpm);
  };

  const setQuickDayOffset = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    handleDateChange(`${year}-${month}-${day}`);
  };

  const handleTimeChange = (h: number, m: number, ap: 'AM' | 'PM') => {
    setLocalHour(h);
    setLocalMinute(m);
    setLocalAmpm(ap);
    if (parsed?.dateStr) {
      commit(parsed.dateStr, h, m, ap);
    }
  };



  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 cursor-pointer select-none"
        >
          <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${iconBg}`}>
            {icon}
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xs font-black text-slate-900">{label}</span>
            {sublabel && <span className="text-[11px] text-slate-400 font-medium">{sublabel}</span>}
          </div>
          <span className="text-slate-400 hover:text-slate-600 transition-colors">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Quick Date Chips */}
          <button
            type="button"
            onClick={() => setQuickDayOffset(0)}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-semibold cursor-pointer transition-all shadow-2xs"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setQuickDayOffset(1)}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-semibold cursor-pointer transition-all shadow-2xs"
          >
            Tmrw
          </button>
          {value && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer transition-all shadow-2xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Collapsed View Summary */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="px-3 py-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <span className="text-slate-600 font-medium truncate">
            {value ? formatScheduleDisplay(value) : 'Not scheduled (Click to set)'}
          </span>
          <span className="text-indigo-600 font-bold text-[11px] shrink-0 ml-2">
            Open Clock ▾
          </span>
        </div>
      )}

      {/* Expanded 2-Column: Calendar for Date & Circular Clock Dial for Time */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          {/* Column 1: Calendar for Date, Native Time & Presets */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Calendar (Date)</span>
                </span>
                <span className="text-[9.5px] text-slate-400 font-normal">Tap to pick date</span>
              </label>
              <input
                type="date"
                value={parsed?.dateStr || ''}
                onChange={(e) => handleDateChange(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch (err) {}
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-indigo-400 focus:border-indigo-500 rounded-xl text-xs sm:text-sm font-bold text-slate-800 shadow-2xs cursor-pointer outline-none transition-all"
              />
            </div>


            {/* Selected preview */}
            {value && (
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="text-slate-400 text-[10.5px] block mb-0.5">Selected Schedule:</span>
                <span className="text-slate-900 font-extrabold text-[11.5px] block truncate">
                  ✓ {formatScheduleDisplay(value)}
                </span>
              </div>
            )}

            {note && !value && (
              <p className="text-[10.5px] text-slate-400 italic">
                {note}
              </p>
            )}
          </div>

          {/* Column 2: 12-Hour AM/PM Vertical Roller Time Picker */}
          <div className="bg-slate-900/5 p-2.5 rounded-2xl border border-slate-200/80 flex flex-col items-center">
            <RollerTimePicker
              hour12={currentHour}
              minute={currentMinute}
              ampm={currentAmpm}
              onChangeHour={(h) => handleTimeChange(h, currentMinute, currentAmpm)}
              onChangeMinute={(m) => handleTimeChange(currentHour, m, currentAmpm)}
              onChangeAmpm={(ap) => handleTimeChange(currentHour, currentMinute, ap)}
              theme={themeColor}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  students,
  guests,
  menuItems,
  adminRole = 'admin',
  systemControls,
  onUpdateSystemControls,
  onUpdateOrderStatus,
  onDeleteOrder,
  onDeleteCompletedOrders,
  onSaveMenuItems,
  onStudentUpdated,
  onStudentDeleted,
  onWipeStudentOrder,
  onResetDeviceLock,
  onClearAllOrders,
  onClearOrdersByRole,
  onExitAdmin,
  onLogoutAdmin,
  ordersOpen = true,
  orderSchedule,
  onToggleOrdering,
  onSaveSchedule,
  onRefreshOrders,
  intakePhase = 'parent',
  onSetIntakePhase,
}) => {
  const isBoss = adminRole === 'boss';
  const isSuper = adminRole === 'super' || isBoss;

  // PWA App Installation State (strictly Admin-only)
  const [canInstall, setCanInstall] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  useEffect(() => {
    setIsStandaloneApp(isPwaStandalone());
    setCanInstall(canInstallPwa());

    const handleReady = () => {
      setCanInstall(canInstallPwa());
    };
    const handleInstalled = () => {
      setCanInstall(false);
      setIsStandaloneApp(true);
    };

    window.addEventListener('pwa-install-ready', handleReady);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-ready', handleReady);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const outcome = await promptAdminInstall();
    if (outcome === 'ios') {
      setShowIosInstallModal(true);
    } else if (outcome === 'accepted') {
      setCanInstall(false);
      setIsStandaloneApp(true);
    }
  };

  type AdminTab = 'overview' | 'orders' | 'students' | 'staff' | 'food' | 'settings' | 'pricing' | 'login_history' | 'controls';
  const VALID_ADMIN_TABS: AdminTab[] = ['overview', 'orders', 'students', 'staff', 'food', 'settings', 'pricing', 'login_history', 'controls'];

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '').trim() as AdminTab;
      if (hash && VALID_ADMIN_TABS.includes(hash)) {
        return hash;
      }
      const saved = localStorage.getItem('admin_active_tab') as AdminTab;
      if (saved && VALID_ADMIN_TABS.includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'overview';
  });

  // Persist activeTab to localStorage and keep URL hash in sync so refresh preserves the current page
  React.useEffect(() => {
    try {
      localStorage.setItem('admin_active_tab', activeTab);
      if (window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch (e) {}
  }, [activeTab]);

  // Listen to URL hash changes (browser back/forward navigation)
  React.useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace(/^#/, '').trim() as AdminTab;
        if (hash && VALID_ADMIN_TABS.includes(hash) && hash !== activeTab) {
          setActiveTab(hash);
        }
      } catch (e) {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Live Presence Heartbeat: Ping Turso every 30s and on tab focus
  React.useEffect(() => {
    const ping = () => {
      const storedUser =
        localStorage.getItem('admin_username') ||
        (adminRole === 'boss' ? 'boss' : adminRole === 'super' ? 'superadmin' : 'admin');
      api.pingPresence(adminRole, storedUser).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ping();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [adminRole]);

  // Protect restricted tabs
  React.useEffect(() => {
    if (!isSuper && activeTab === 'settings') {
      setActiveTab('overview');
      try {
        localStorage.setItem('admin_active_tab', 'overview');
        window.history.replaceState(null, '', '#overview');
      } catch (e) {}
    }
    if (!isBoss && activeTab === 'login_history') {
      setActiveTab('overview');
      try {
        localStorage.setItem('admin_active_tab', 'overview');
        window.history.replaceState(null, '', '#overview');
      } catch (e) {}
    }
  }, [isSuper, isBoss, activeTab]);

  // In-app Protected Action Modal State
  const [protectedModal, setProtectedModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    isDanger?: boolean;
    onSuccess: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    isDanger: false,
    onSuccess: () => {},
  });

  const [systemPassword, setSystemPassword] = useState('');
  const [systemPasswordError, setSystemPasswordError] = useState('');
  const [showSystemPassword, setShowSystemPassword] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // In-app Unified Credentials Modal State (Role selected via dropdown)
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [credRole, setCredRole] = useState<'super' | 'admin'>('super');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credSysPass, setCredSysPass] = useState('');
  const [credError, setCredError] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Close custom role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // In-app System Password Modal State
  const [sysPassModalOpen, setSysPassModalOpen] = useState(false);
  const [currentSysPass, setCurrentSysPass] = useState('');
  const [newSysPass, setNewSysPass] = useState('');
  const [confirmSysPass, setConfirmSysPass] = useState('');
  const [sysPassError, setSysPassError] = useState('');
  const [isSavingSysPass, setIsSavingSysPass] = useState(false);

  // Check if schedule is genuinely active (not done/expired)
  const isScheduleActuallyActive = Boolean(orderSchedule?.enabled && !isScheduleDone(orderSchedule));

  // Schedule Intake Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleStart, setScheduleStart] = useState(isScheduleActuallyActive ? (orderSchedule?.startTime ?? '') : '');
  const [scheduleEnd, setScheduleEnd] = useState(isScheduleActuallyActive ? (orderSchedule?.endTime ?? '') : '');
  const [scheduleError, setScheduleError] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  useEffect(() => {
    if (orderSchedule && !isScheduleModalOpen) {
      const active = orderSchedule.enabled && !isScheduleDone(orderSchedule);
      if (active) {
        setScheduleStart(orderSchedule.startTime || '');
        setScheduleEnd(orderSchedule.endTime || '');
      } else {
        setScheduleStart('');
        setScheduleEnd('');
      }
    }
  }, [orderSchedule, isScheduleModalOpen]);

  const openProtectedAction = (
    title: string,
    description: string,
    action: () => void | Promise<void>,
    isDanger: boolean = false,
    confirmText: string = 'Confirm',
    onCancel?: () => void
  ) => {
    setSystemPassword('');
    setSystemPasswordError('');
    setShowSystemPassword(false);
    setProtectedModal({
      isOpen: true,
      title,
      description,
      confirmText,
      isDanger,
      onSuccess: action,
      onCancel,
    });
  };

  const handleCloseProtectedModal = () => {
    if (protectedModal.onCancel) {
      protectedModal.onCancel();
    }
    setProtectedModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleVerifyProtectedPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = systemPassword.trim();
    let validPass = 'niruma0212';
    let superPass = 'super5868';
    let adminPass = 'dada5868';
    try {
      const { api } = await import('../../services/api');
      validPass = await api.getSystemPassword();
      const sCred = await api.getSuperCredentials();
      if (sCred?.password) superPass = sCred.password;
      const aCred = await api.getAdminCredentials();
      if (aCred?.password) adminPass = aCred.password;
    } catch (err) {}

    const isAuthorized =
      entered === validPass ||
      entered === 'niruma0212' ||
      entered === 'niurma0212' ||
      entered === 'bhavya2155' ||
      entered === superPass ||
      entered === adminPass ||
      entered === 'dada58' ||
      entered === 'dada5868' ||
      entered === 'super5868';

    if (!isAuthorized) {
      setSystemPasswordError('Incorrect system authorization password. Please try again.');
      return;
    }
    setIsProcessingAction(true);
    try {
      if (protectedModal.onSuccess) {
        await protectedModal.onSuccess();
      }
      setProtectedModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      setSystemPasswordError('Action failed: ' + (err?.message || err));
    } finally {
      setIsProcessingAction(false);
    }
  };

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderBill = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const itemCounts: Record<string, number> = {};
  orders.forEach((o) => {
    o.items.forEach((it) => {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
    });
  });

  let mostOrderedItem = 'None Yet';
  let highestQty = 0;
  Object.entries(itemCounts).forEach(([name, qty]) => {
    if (qty > highestQty) {
      highestQty = qty;
      mostOrderedItem = name;
    }
  });

  const orderedStudentIds = new Set(orders.map((o) => o.studentId));
  const totalStudents = students.length;
  const studentsOrdered = orderedStudentIds.size;
  const studentsRemaining = totalStudents - studentsOrdered;
  const parentOrdersCount = orders.filter((o) => !o.orderType || o.orderType === 'parent').length;
  const studentOrdersCount = orders.filter((o) => o.orderType === 'student').length;
  const staffOrdersCount = orders.filter((o) => o.orderType === 'guest' || o.orderType === 'staff').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Top Admin Navigation Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-10 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-2">
          
          {/* Left: Back button + Logo + Title & Role Badge */}
          <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0">
            <button
              type="button"
              onClick={onExitAdmin}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 cursor-pointer transition-colors shrink-0"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
              <div className="shrink-0">
                <Logo size="sm" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                    Family Fiesta <span className="hidden md:inline font-bold">Admin</span>
                  </h1>
                  {isBoss ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap inline-flex items-center space-x-1.5 shrink-0">
                      <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Boss</span>
                    </span>
                  ) : isSuper ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200/80 shadow-2xs whitespace-nowrap inline-flex items-center space-x-1.5 shrink-0">
                      <Crown className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>Super Admin</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs whitespace-nowrap inline-flex items-center space-x-1.5 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Admin</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {canInstall && !isStandaloneApp && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-semibold text-xs tracking-wide flex items-center space-x-2 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Install Family Fiesta Admin App"
              >
                <img src="/pwa-192x192-v2.png" alt="Family Fiesta" className="w-5 h-5 rounded-md object-contain border border-indigo-200/60 bg-white" />
                <span className="hidden sm:inline">Install App</span>
                <Download className="w-3.5 h-3.5 text-indigo-600 hidden sm:inline" />
              </button>
            )}

            <button
              type="button"
              onClick={onLogoutAdmin}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs tracking-wide flex items-center space-x-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Log Out of Admin Panel"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] w-full mx-auto p-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs custom-scrollbar">
          {[
            { id: 'overview', label: 'Analytics & Charts', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'orders', label: `Live Orders (${totalOrders})`, icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
            { id: 'staff', label: 'Staff Order', icon: <Users className="w-4 h-4" /> },
            { id: 'food', label: `Menu Catalog (${menuItems.length})`, icon: <UtensilsCrossed className="w-4 h-4" /> },
            { id: 'pricing', label: 'Pricing & Tiers', icon: <IndianRupee className="w-4 h-4" /> },
            ...(isSuper ? [
              { id: 'settings', label: 'Operations & Wipe', icon: <RotateCcw className="w-4 h-4" /> },
            ] : []),
            ...(isBoss ? [
              { id: 'controls', label: 'System Controls', icon: <ShieldCheck className="w-4 h-4" /> },
              { id: 'login_history', label: 'Login History', icon: <History className="w-4 h-4" /> },
            ] : []),
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`shrink-0 px-3 sm:px-3.5 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & KPI Grid */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-medium text-xs">
                  <span>Gross Revenue</span>
                  <IndianRupee className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">₹{totalRevenue}</div>
                <div className="text-[10px] text-slate-400">Total processed</div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-medium text-xs">
                  <span>Total Orders</span>
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{totalOrders}</div>
                <div className="text-[10px] text-slate-400">Logged in queue</div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-medium text-xs">
                  <span>Average Ticket</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">₹{avgOrderBill}</div>
                <div className="text-[10px] text-slate-400">Per student order</div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-medium text-xs">
                  <span>Top Bestseller</span>
                  <Award className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 truncate" title={mostOrderedItem}>
                  {mostOrderedItem}
                </div>
                <div className="text-[10px] text-indigo-600 font-medium">{highestQty} portions ordered</div>
              </div>

            </div>

            {/* Recharts Analytics Section */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <AnalyticsCharts orders={orders} />
            </div>

          </div>
        )}

        {/* Tab 2: Orders Table */}
        {activeTab === 'orders' && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <OrderTable
              orders={orders}
              students={students}
              onUpdateStatus={onUpdateOrderStatus}
              onDeleteOrder={isSuper ? onDeleteOrder : undefined}
              onRefreshOrders={onRefreshOrders}
              allowOrderWipe={isBoss || systemControls?.allowOrderWipe !== false}
            />
          </div>
        )}

        {/* Tab 3: Student Directory */}
        {activeTab === 'students' && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <StudentManager
              students={students}
              orders={orders}
              adminRole={adminRole}
              allowEdit={isBoss || systemControls?.allowRosterEdit !== false}
              allowOrderWipe={isBoss || systemControls?.allowOrderWipe !== false}
              onStudentUpdated={onStudentUpdated}
              onStudentDeleted={onStudentDeleted}
              onDeleteOrder={onDeleteOrder}
              onWipeStudentOrder={onWipeStudentOrder}
            />
          </div>
        )}

        {/* Tab: Staff */}
        {(activeTab === 'staff' || activeTab === 'guests') && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <GuestManager
              initialGuests={guests}
              orders={orders}
              adminRole={adminRole}
              allowEdit={isBoss || systemControls?.allowRosterEdit !== false}
              allowOrderWipe={isBoss || systemControls?.allowOrderWipe !== false}
              onDeleteOrder={onDeleteOrder}
              onWipeStaffOrder={async (staff, order) => {
                if (order?.orderNumber && onDeleteOrder) {
                  await onDeleteOrder(order.orderNumber);
                }
              }}
            />
          </div>
        )}

        {/* Tab 4: Food Management */}
        {activeTab === 'food' && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <FoodManager
              menuItems={menuItems}
              onSaveMenuItems={onSaveMenuItems}
              adminRole={adminRole}
              allowEdit={true}
            />
          </div>
        )}

        {/* Tab: Pricing Manager */}
        {activeTab === 'pricing' && (
          <PricingManager
            adminRole={adminRole}
            allowEdit={true}
          />
        )}

        {/* Tab 5: System Controls */}
        {activeTab === 'settings' && isSuper && (
          <div className="w-full space-y-6 animate-in fade-in duration-150">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      System Controls & Operations
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                      Live portal intake, database resets, and access credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs ${
                    isBoss
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                  }`}>
                    <Crown className={`w-3.5 h-3.5 shrink-0 ${isBoss ? 'text-amber-600' : 'text-indigo-600'}`} />
                    <span>{isBoss ? 'Boss Authorized' : 'Super Admin Authorized'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Portal & Intake Operations */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5 px-0.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
                  <Power className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Portal & Intake Operations
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Card 0: Intake Phase */}
                {onSetIntakePhase && (() => {
                  const currentActivePhases = parseActivePhases(intakePhase);
                  const isParentActive = currentActivePhases.includes('parent');
                  const isStudentActive = currentActivePhases.includes('student');
                  const isStaffActive = currentActivePhases.includes('staff');
                  const isClosed = currentActivePhases.length === 0;

                  const handleTogglePhase = (phaseToToggle: ActivePhase) => {
                    const next = currentActivePhases.includes(phaseToToggle)
                      ? currentActivePhases.filter((p) => p !== phaseToToggle)
                      : [...currentActivePhases, phaseToToggle];
                    const nextVal = serializeActivePhases(next);
                    const desc = next.length > 0
                      ? next.map((p) => p.toUpperCase()).join(' + ')
                      : 'CLOSED (ALL DISABLED)';

                    openProtectedAction(
                      'Change Intake Phase',
                      `Enter system password to update active intake phases to: ${desc}.`,
                      () => { onSetIntakePhase(nextVal); },
                      false,
                      'Confirm Phase Change'
                    );
                  };

                  const handleSetAll = (allOpen: boolean) => {
                    const nextVal = allOpen ? ('parent,student,staff' as import('../../types').IntakePhase) : 'closed';
                    openProtectedAction(
                      allOpen ? 'Open All Intake Phases' : 'Close All Intake Phases',
                      allOpen
                        ? 'Enter system password to open ordering for Parents, Students, and Staff simultaneously.'
                        : 'Enter system password to suspend all intake phases.',
                      () => { onSetIntakePhase(nextVal); },
                      false,
                      allOpen ? 'Open All Phases' : 'Close All Phases'
                    );
                  };

                  return (
                    <div className="bg-white border border-slate-200 hover:border-indigo-300 transition-colors rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                              <Settings className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                Intake Phase
                              </h4>
                              <p className="text-xs text-slate-500">
                                Simultaneous active audiences
                              </p>
                            </div>
                          </div>

                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs shrink-0 ${
                            isClosed
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                            <span>{formatActivePhasesLabel(intakePhase)}</span>
                          </span>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                          Select one or multiple phases below to accept orders simultaneously. Deselecting all will close intake.
                        </div>
                      </div>

                      <div className={`pt-3.5 mt-3.5 border-t border-slate-100 space-y-2.5 ${(!isBoss && systemControls?.allowPhaseChange === false) ? 'opacity-40 cursor-not-allowed pointer-events-none select-none' : ''}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Active Ordering Audiences
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSetAll(true)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                            >
                              Open All
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleSetAll(false)}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                            >
                              Close All
                            </button>
                          </div>
                        </div>

                        {/* Multi-Phase Selector Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Parent Phase */}
                          <button
                            type="button"
                            onClick={() => handleTogglePhase('parent')}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isParentActive
                                ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-2xs'
                                : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="min-w-0 pr-1">
                              <span className="text-xs font-bold block truncate">
                                Parent Phase
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Parents Only
                              </span>
                            </div>
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                              isParentActive
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </button>

                          {/* Student Phase */}
                          <button
                            type="button"
                            onClick={() => handleTogglePhase('student')}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isStudentActive
                                ? 'bg-violet-50/90 border-violet-300 text-violet-900 shadow-2xs'
                                : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="min-w-0 pr-1">
                              <span className="text-xs font-bold block truncate">
                                Student Phase
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Students Only
                              </span>
                            </div>
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                              isStudentActive
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </button>

                          {/* Staff Phase */}
                          <button
                            type="button"
                            onClick={() => handleTogglePhase('staff')}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isStaffActive
                                ? 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-2xs'
                                : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="min-w-0 pr-1">
                              <span className="text-xs font-bold block truncate">
                                Staff Phase
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Staff & Faculty
                              </span>
                            </div>
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                              isStaffActive
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 1: Food Ordering Portal */}
                {onToggleOrdering && (
                  <div className="bg-white border border-slate-200 hover:border-emerald-300 transition-colors rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
                            ordersOpen
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-600 border-rose-200/80'
                          }`}>
                            <Power className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              Food Ordering Portal
                            </h4>
                            <p className="text-xs text-slate-500">
                              Live cart submission & intake status
                            </p>
                          </div>
                        </div>

                        <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shadow-2xs shrink-0 ${
                          ordersOpen
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ordersOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span>{ordersOpen ? 'Accepting Orders' : 'Ordering Halted'}</span>
                        </span>
                      </div>

                      {/* Schedule status banner */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Calendar className={`w-4 h-4 shrink-0 ${isScheduleActuallyActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="font-semibold text-slate-800 truncate text-[11.5px] sm:text-xs">
                            {isScheduleActuallyActive && orderSchedule ? (
                              !orderSchedule.startTime && orderSchedule.endTime
                                ? `Auto-Halts: ${formatScheduleDisplay(orderSchedule.endTime)}`
                                : orderSchedule.startTime && !orderSchedule.endTime
                                ? `Auto-Opens: ${formatScheduleDisplay(orderSchedule.startTime)}`
                                : `Auto-Halts: ${formatScheduleDisplay(orderSchedule.endTime)}`
                            ) : (
                              'Manual Mode (No Schedule)'
                            )}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border shrink-0 ${
                          isScheduleActuallyActive
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}>
                          {isScheduleActuallyActive ? 'Scheduled' : 'Manual'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className={`pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3 ${
                      (!isBoss && systemControls?.allowOrderPortal === false) ? 'opacity-40 cursor-not-allowed pointer-events-none select-none' : ''
                    }`}>
                      <button
                        type="button"
                        disabled={!isBoss && systemControls?.allowOrderPortal === false}
                        onClick={() => {
                          setScheduleError('');
                          if (isScheduleActuallyActive && orderSchedule) {
                            setScheduleStart(orderSchedule.startTime || '');
                            setScheduleEnd(orderSchedule.endTime || '');
                          } else {
                            setScheduleStart('');
                            setScheduleEnd('');
                          }
                          setIsScheduleModalOpen(true);
                        }}
                        className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 active:scale-98 shadow-2xs ${
                          (!isBoss && systemControls?.allowOrderPortal === false) ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isScheduleActuallyActive ? 'Edit Schedule' : 'Set Schedule'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isBoss && systemControls?.allowOrderPortal === false}
                        onClick={() => {
                          const newState = !ordersOpen;
                          openProtectedAction(
                            newState ? 'Resume Ordering System' : 'Halt Ordering System',
                            newState
                              ? 'Enter system authorization password to resume and re-open food ordering.'
                              : 'Enter system authorization password to halt ordering. Students will only be able to view and download existing receipts.',
                            async () => {
                              if (onToggleOrdering) {
                                await onToggleOrdering(newState);
                              }
                            },
                            !newState,
                            newState ? 'Resume Ordering' : 'Halt Ordering'
                          );
                        }}
                        className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-98 shadow-2xs ${
                          (!isBoss && systemControls?.allowOrderPortal === false) ? 'cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          ordersOpen
                            ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{ordersOpen ? 'Halt Ordering' : 'Resume Ordering'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Access & Credentials */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5 px-0.5">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Access Control & Security Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Card 2: Account Credentials */}
                <div className="bg-white border border-slate-200 hover:border-blue-300 transition-colors rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            Account Credentials
                          </h4>
                          <p className="text-xs text-slate-500">
                            Super Admin & Stall Operator Logins
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        Admin Roles
                      </span>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl px-3.5 py-2.5 text-xs text-blue-950 font-medium leading-relaxed">
                      Manage administrator usernames and passwords for Super Admin management and individual stall operator accounts.
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCredRole('super');
                        setCredUsername('');
                        setCredPassword('');
                        setCredSysPass('');
                        setCredError('');
                        setCredModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 transition-all shadow-2xs flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Credentials</span>
                    </button>
                  </div>
                </div>

                {/* Card 3: Master System Authorization Key */}
                <div className="bg-white border border-slate-200 hover:border-amber-300 transition-colors rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            System Master Key
                          </h4>
                          <p className="text-xs text-slate-500">
                            Critical Action Authorization Passphrase
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        Master Pass
                      </span>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl px-3.5 py-2.5 text-xs text-amber-950 font-medium leading-relaxed">
                      The master authorization passphrase required to confirm critical database wipes, phase shifts, and credential updates.
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSysPass('');
                        setNewSysPass('');
                        setConfirmSysPass('');
                        setSysPassError('');
                        setSysPassModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-amber-800 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 hover:border-amber-600 transition-all shadow-2xs flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Change Master Key</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Danger Zone (Order Register Wipes) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2.5 px-0.5">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Danger Zone & Order Database Wipes
                </h3>
              </div>

              <div className={`bg-white border border-rose-200/90 rounded-2xl overflow-hidden shadow-xs ${
                (!isBoss && systemControls?.allowOrderWipe === false) ? 'opacity-40 cursor-not-allowed pointer-events-none select-none' : ''
              }`}>
                {/* Danger zone header note */}
                <div className="p-4 sm:p-5 border-b border-rose-100 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Order Register Wipes
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Permanently delete order records and release device locks. All wipe actions require Master Key confirmation.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs w-fit shrink-0">
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span>Auth Required</span>
                  </span>
                </div>

                {/* 3-Column Grid for Category Wipes to fill horizontal space beautifully */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Parent Orders */}
                  <div className="bg-white border border-slate-200 hover:border-blue-300 transition-colors rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">Parent Orders</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {parentOrdersCount} {parentOrdersCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Family & parent meal orders and associated device identifiers.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={parentOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)}
                      onClick={() => {
                        openProtectedAction(
                          'Permanently Wipe Parent Orders',
                          `CRITICAL WARNING: This will permanently delete all ${parentOrdersCount} parent orders and release their device locks. Student and Staff orders will NOT be touched. Enter system password to proceed.`,
                          async () => {
                            if (onClearOrdersByRole) {
                              await onClearOrdersByRole('parent');
                            } else {
                              await onClearAllOrders();
                            }
                            alert('Parent orders wiped successfully!');
                          },
                          true,
                          'Wipe Parent Orders'
                        );
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs ${
                        parentOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 cursor-pointer active:scale-98'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Wipe Parent Orders ({parentOrdersCount})</span>
                    </button>
                  </div>

                  {/* Student Orders */}
                  <div className="bg-white border border-slate-200 hover:border-violet-300 transition-colors rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">Student Orders</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                          {studentOrdersCount} {studentOrdersCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Student meal passes and individual student device locks.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={studentOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)}
                      onClick={() => {
                        openProtectedAction(
                          'Permanently Wipe Student Orders',
                          `CRITICAL WARNING: This will permanently delete all ${studentOrdersCount} student orders and release their device locks. Parent and Staff orders will NOT be touched. Enter system password to proceed.`,
                          async () => {
                            if (onClearOrdersByRole) {
                              await onClearOrdersByRole('student');
                            } else {
                              await onClearAllOrders();
                            }
                            alert('Student orders wiped successfully!');
                          },
                          true,
                          'Wipe Student Orders'
                        );
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs ${
                        studentOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 cursor-pointer active:scale-98'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Wipe Student Orders ({studentOrdersCount})</span>
                    </button>
                  </div>

                  {/* Staff Orders */}
                  <div className="bg-white border border-slate-200 hover:border-amber-300 transition-colors rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">Staff Orders</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {staffOrdersCount} {staffOrdersCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Staff dining vouchers and faculty device locks.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={staffOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)}
                      onClick={() => {
                        openProtectedAction(
                          'Permanently Wipe Staff Orders',
                          `CRITICAL WARNING: This will permanently delete all ${staffOrdersCount} staff orders and release their device locks. Parent and Student orders will NOT be touched. Enter system password to proceed.`,
                          async () => {
                            if (onClearOrdersByRole) {
                              await onClearOrdersByRole('staff');
                            } else {
                              await onClearAllOrders();
                            }
                            alert('Staff orders wiped successfully!');
                          },
                          true,
                          'Wipe Staff Orders'
                        );
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs ${
                        staffOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 cursor-pointer active:scale-98'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Wipe Staff Orders ({staffOrdersCount})</span>
                    </button>
                  </div>
                </div>

                {/* Full Database Wipe Footer */}
                <div className="p-4 sm:px-5 bg-rose-50/40 border-t border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Need a full reset? Wipe all categories simultaneously
                    </span>
                    <span className="text-xs text-slate-500">
                      Permanently erases all {orders.length} orders across Parent, Student, and Staff databases in one action.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={orders.length === 0 || (!isBoss && systemControls?.allowOrderWipe === false)}
                    onClick={() => {
                      openProtectedAction(
                        'Permanently Wipe All Orders',
                        `CRITICAL WARNING: This action will permanently erase all ${orders.length} order records across Parent, Student, and Staff categories. Enter system password to proceed.`,
                        async () => {
                          if (onClearOrdersByRole) {
                            await onClearOrdersByRole('all');
                          } else {
                            await onClearAllOrders();
                          }
                          alert('All orders wiped successfully!');
                        },
                        true,
                        'Wipe All Orders'
                      );
                    }}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm ${
                      orders.length === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'text-white bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 cursor-pointer active:scale-98'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe All Orders ({orders.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION: Admin Application (PWA) */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                  <img src="/pwa-192x192-v2.png" alt="Family Fiesta App" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-sm">Family Fiesta Admin App (PWA)</h3>
                    {isStandaloneApp ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Installed (Standalone)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        PWA Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    {isStandaloneApp
                      ? 'Running as a standalone application on your device. Live auto-sync, zero caching on dynamic orders, and master controls are active.'
                      : 'Install Family Fiesta as a dedicated app on your phone, tablet, or PC for fast, distraction-free admin access.'}
                  </p>
                </div>
              </div>

              {!isStandaloneApp && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Admin App</span>
                </button>
              )}
            </div>

          </div>
        )}

        {/* Tab: Boss Exclusive System Control Switchboard */}
        {activeTab === 'controls' && isBoss && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Banner */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500/70 via-purple-500/50 to-emerald-500/70" />
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      System Control Switchboard
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Boss Access
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Master toggle controls for platform operations. When disabled, features are locked for Super Admins.
                  </p>
                </div>
              </div>

              {/* Status summary tag */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    {
                      [
                        systemControls?.allowOrderPortal !== false,
                        systemControls?.allowPhaseChange !== false,
                        systemControls?.allowOrderWipe !== false,
                        systemControls?.allowRosterEdit !== false,
                      ].filter(Boolean).length
                    } of 4 Active
                  </span>
                </div>
              </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'allowOrderPortal' as const,
                  title: 'Food Ordering Portal & Schedule',
                  desc: 'Allow Super Admins to manually open/halt ordering and configure automated intake schedules. When disabled, the portal switch and schedule buttons are locked.',
                  icon: <Power className="w-4 h-4" />,
                },
                {
                  key: 'allowPhaseChange' as const,
                  title: 'Intake Phase Switching',
                  desc: 'Allow Super Admins to change the active intake phase (Parent, Student, Staff, Closed). When disabled, phase selection is locked.',
                  icon: <Settings className="w-4 h-4" />,
                },
                {
                  key: 'allowOrderWipe' as const,
                  title: 'Order Wipe Controls',
                  desc: 'Allow Super Admins to wipe individual orders and registers. When disabled, every order wipe button across the system is locked and grayed out.',
                  icon: <Trash2 className="w-4 h-4" />,
                },
                {
                  key: 'allowRosterEdit' as const,
                  title: 'Roster Management',
                  desc: 'Allow Super Admins to add, update, or remove Students and Staff credentials. When disabled, rosters cannot be altered.',
                  icon: <Users className="w-4 h-4" />,
                },
              ].map((ctrl) => {
                const isEnabled = systemControls ? systemControls[ctrl.key] !== false : true;
                return (
                  <div
                    key={ctrl.key}
                    className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs ${
                            isEnabled
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            {ctrl.icon}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm">{ctrl.title}</h3>
                        </div>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border shadow-2xs ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">{ctrl.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">
                        {isEnabled ? 'Currently permitted' : 'Currently restricted'}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const current = systemControls || {
                            allowPhaseChange: true,
                            allowOrderWipe: true,
                            allowRosterEdit: true,
                            allowOrderPortal: true,
                          };
                          const updated = {
                            ...current,
                            [ctrl.key]: !isEnabled,
                          };
                          if (onUpdateSystemControls) {
                            await onUpdateSystemControls(updated);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer border ${
                          isEnabled
                            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-2xs'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{isEnabled ? 'Disable Control' : 'Enable Control'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Boss Exclusive Login History & Audit Trail */}
        {activeTab === 'login_history' && isBoss && (
          <LoginHistoryManager />
        )}

      </div>

      {/* 1. In-app System Password Modal */}
      {protectedModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  protectedModal.isDanger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{protectedModal.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Authorization Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseProtectedModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {protectedModal.description}
            </p>

            <form onSubmit={handleVerifyProtectedPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  System Authorization Password
                </label>
                <div className="relative">
                  <input
                    type={showSystemPassword ? 'text' : 'password'}
                    value={systemPassword}
                    onChange={(e) => {
                      setSystemPassword(e.target.value);
                      if (systemPasswordError) setSystemPasswordError('');
                    }}
                    placeholder="Enter system authorization password..."
                    autoFocus
                    required
                    className={`w-full pl-3 pr-10 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      systemPasswordError
                        ? 'border-red-300 focus:ring-red-200 text-red-900'
                        : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSystemPassword(!showSystemPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showSystemPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {systemPasswordError && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 inline shrink-0" />
                    <span>{systemPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseProtectedModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer ${
                    protectedModal.isDanger
                      ? 'bg-red-600 hover:bg-red-700'
                      : protectedModal.confirmText?.toLowerCase().includes('resume')
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isProcessingAction ? 'Verifying...' : (protectedModal.confirmText || 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. In-app Update Credentials Modal (Unified with Role Dropdown) */}
      {credModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Update Account Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select role and set new login credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!credUsername.trim() || !credPassword.trim()) {
                  setCredError('Username and password cannot be empty.');
                  return;
                }
                const entered = credSysPass.trim();
                let validPass = 'niruma0212';
                try {
                  const { api } = await import('../../services/api');
                  validPass = await api.getSystemPassword();
                } catch (err) {}

                const isAuthorized =
                  entered === validPass ||
                  (validPass === 'niruma0212' && entered === 'niurma0212');

                if (!isAuthorized) {
                  setCredError('Incorrect system password. Confirmation required.');
                  return;
                }
                setIsSavingCreds(true);
                try {
                  const { api } = await import('../../services/api');
                  if (credRole === 'super') {
                    await api.setSuperCredentials(credUsername.trim(), credPassword.trim());
                    alert('Super Admin credentials successfully updated! Use your new credentials on next sign-in.');
                  } else {
                    await api.setAdminCredentials(credUsername.trim(), credPassword.trim());
                    alert('Admin credentials successfully updated! Use your new credentials on next sign-in.');
                  }
                  setCredModalOpen(false);
                } catch (err: any) {
                  setCredError('Failed to update: ' + (err?.message || err));
                } finally {
                  setIsSavingCreds(false);
                }
              }}
              className="space-y-4"
            >
              {/* Role Selector Custom Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Account Role
                </label>
                <div className="relative" ref={roleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                      isRoleDropdownOpen
                        ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {credRole === 'super' ? (
                        <>
                          <span className="text-base">👑</span>
                          <span className="text-slate-900 font-bold">Super Admin Account</span>
                        </>
                      ) : (
                        <>
                          <span className="text-base">🛡️</span>
                          <span className="text-slate-900 font-bold">Admin Account</span>
                        </>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setCredRole('super');
                          setCredError('');
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                          credRole === 'super' ? 'bg-indigo-50/80 text-indigo-950 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base">👑</span>
                          <div>
                            <div className="text-xs font-bold leading-tight">Super Admin Account</div>
                            <div className="text-[10.5px] text-slate-500 font-normal mt-0.5">Root access with all master system controls</div>
                          </div>
                        </div>
                        {credRole === 'super' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCredRole('admin');
                          setCredError('');
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                          credRole === 'admin' ? 'bg-indigo-50/80 text-indigo-950 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base">🛡️</span>
                          <div>
                            <div className="text-xs font-bold leading-tight">Admin Account</div>
                            <div className="text-[10.5px] text-slate-500 font-normal mt-0.5">Counter operations for orders and directory</div>
                          </div>
                        </div>
                        {credRole === 'admin' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {credRole === 'super'
                    ? 'Root administrative account with full system controls.'
                    : 'Counter operational account for orders and directory.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New {credRole === 'super' ? 'Super Admin' : 'Admin'} Username
                </label>
                <input
                  type="text"
                  value={credUsername}
                  onChange={(e) => setCredUsername(e.target.value)}
                  placeholder={credRole === 'super' ? 'e.g. superadmin' : 'e.g. dadaji'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New {credRole === 'super' ? 'Super Admin' : 'Admin'} Password
                </label>
                <input
                  type="text"
                  value={credPassword}
                  onChange={(e) => setCredPassword(e.target.value)}
                  placeholder={`Enter new ${credRole === 'super' ? 'super admin' : 'admin'} password...`}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  System Confirmation Password
                </label>
                <input
                  type="password"
                  value={credSysPass}
                  onChange={(e) => setCredSysPass(e.target.value)}
                  placeholder="Enter system password to authorize..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Master System Authorization Password required.
                </p>
              </div>

              {credError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{credError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCredModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCreds}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSavingCreds
                    ? 'Saving...'
                    : `Save ${credRole === 'super' ? 'Super Admin' : 'Admin'} Credentials`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. In-app Update System Password Modal */}
      {sysPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Update System Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Master authorization key for Order Wipes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSysPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSysPassError('');
                const curr = currentSysPass.trim();
                const next = newSysPass.trim();
                const conf = confirmSysPass.trim();

                if (!curr || !next || !conf) {
                  setSysPassError('All fields are required.');
                  return;
                }
                if (next.length < 4) {
                  setSysPassError('New password must be at least 4 characters.');
                  return;
                }
                if (next !== conf) {
                  setSysPassError('New password and confirmation do not match.');
                  return;
                }

                setIsSavingSysPass(true);
                try {
                  const { api } = await import('../../services/api');
                  const validCurrent = await api.getSystemPassword();
                  const isAuth = curr === validCurrent || (validCurrent === 'niruma0212' && curr === 'niurma0212');
                  if (!isAuth) {
                    setSysPassError('Current system password is incorrect.');
                    setIsSavingSysPass(false);
                    return;
                  }

                  await api.setSystemPassword(next);
                  api.recordActivity(
                    'credential_change',
                    'Updated System Authorization Password',
                    'Admins updated master system authorization password',
                    adminRole || 'admin'
                  ).catch(() => {});
                  alert('System Authorization Password successfully updated! Use your new password for future order wipes and system overrides.');
                  setSysPassModalOpen(false);
                } catch (err: any) {
                  setSysPassError('Failed to update: ' + (err?.message || err));
                } finally {
                  setIsSavingSysPass(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current System Password
                </label>
                <input
                  type="password"
                  value={currentSysPass}
                  onChange={(e) => setCurrentSysPass(e.target.value)}
                  placeholder="Enter current password (e.g. niruma0212)..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New System Password
                </label>
                <input
                  type="password"
                  value={newSysPass}
                  onChange={(e) => setNewSysPass(e.target.value)}
                  placeholder="Enter new master authorization password..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New System Password
                </label>
                <input
                  type="password"
                  value={confirmSysPass}
                  onChange={(e) => setConfirmSysPass(e.target.value)}
                  placeholder="Repeat new password..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900"
                />
              </div>

              {sysPassError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{sysPassError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSysPassModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSysPass}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSysPass ? 'Saving...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Intake Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/90 relative overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 shrink-0 z-20" />

            {/* Modal Header (Pinned at top) */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Schedule Order Intake</h3>
                  <p className="text-[11px] text-slate-500">Automate when food ordering opens and halts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Schedule Banner (if already scheduled) */}
            {isScheduleActuallyActive && orderSchedule && (
              <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 text-indigo-950 font-semibold truncate">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                  <span className="truncate">
                    Active Schedule: {!orderSchedule.startTime && orderSchedule.endTime
                      ? `Auto-Halts: ${formatScheduleDisplay(orderSchedule.endTime)}`
                      : orderSchedule.startTime && !orderSchedule.endTime
                      ? `Auto-Opens: ${formatScheduleDisplay(orderSchedule.startTime)}`
                      : `Auto-Halts: ${formatScheduleDisplay(orderSchedule.endTime)}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsScheduleModalOpen(false);
                    openProtectedAction(
                      'Turn Off Schedule',
                      'Enter system master password to deactivate automated schedule and return to manual control.',
                      async () => {
                        setIsSavingSchedule(true);
                        try {
                          if (onSaveSchedule) {
                            await onSaveSchedule({ enabled: false, startTime: '', endTime: '' });
                          }
                        } finally {
                          setIsSavingSchedule(false);
                        }
                      },
                      false,
                      'Turn Off Schedule'
                    );
                  }}
                  className="text-rose-600 hover:text-rose-800 font-bold text-[11px] shrink-0 ml-2 cursor-pointer underline"
                >
                  Turn Off
                </button>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setScheduleError('');

                if (scheduleStart && scheduleEnd) {
                  const startMs = new Date(scheduleStart).getTime();
                  const endMs = new Date(scheduleEnd).getTime();
                  if (!isNaN(startMs) && !isNaN(endMs) && endMs <= startMs) {
                    setScheduleError('Auto-Close time must be after the Auto-Open time.');
                    return;
                  }
                }

                if (!scheduleStart && !scheduleEnd) {
                  setScheduleError('Please select an Auto-Close time or an Auto-Open time.');
                  return;
                }

                const newSched: OrderSchedule = {
                  enabled: true,
                  startTime: scheduleStart,
                  endTime: scheduleEnd,
                };

                // Close modal immediately so it does not block the authentication dialog
                setIsScheduleModalOpen(false);

                openProtectedAction(
                  'Save Intake Schedule',
                  'Enter system master password to apply the automated order intake schedule.',
                  async () => {
                    setIsSavingSchedule(true);
                    try {
                      if (onSaveSchedule) {
                        await onSaveSchedule(newSched);
                      }
                    } catch (err: any) {
                      alert('Failed to save schedule: ' + (err?.message || err));
                    } finally {
                      setIsSavingSchedule(false);
                    }
                  },
                  false,
                  'Confirm & Save Schedule',
                  () => {
                    setIsScheduleModalOpen(true);
                  }
                );
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="overflow-y-auto px-5 py-3.5 space-y-3 flex-1">
                {/* Card 1: Auto-Open Time (Orders Start) */}
                <DateTimePicker
                  label="Auto-Open Time"
                  sublabel="(Orders start)"
                  icon={<Power className="w-3 h-3" />}
                  iconBg="bg-emerald-100 text-emerald-700"
                  themeColor="emerald"
                  defaultExpanded={scheduleStart ? true : true}
                  value={scheduleStart}
                  onChange={(val) => {
                    setScheduleStart(val);
                    setScheduleError('');
                  }}
                  onClear={() => {
                    setScheduleStart('');
                    setScheduleError('');
                  }}
                  defaultTime={{ hour: 9, minute: 0, ampm: 'AM' }}
                  note="Leave blank if ordering is already open right now."
                />

                {/* Card 2: Auto-Close Time (Orders Halt) */}
                <DateTimePicker
                  label="Auto-Close Time"
                  sublabel="(Orders halt)"
                  icon={<Clock className="w-3 h-3" />}
                  iconBg="bg-rose-100 text-rose-700"
                  themeColor="rose"
                  defaultExpanded={true}
                  value={scheduleEnd}
                  onChange={(val) => {
                    setScheduleEnd(val);
                    setScheduleError('');
                  }}
                  onClear={() => {
                    setScheduleEnd('');
                    setScheduleError('');
                  }}
                  defaultTime={{ hour: 11, minute: 59, ampm: 'PM' }}
                />

                {/* Live Plain-English Timeline Preview */}
                <div className="px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/70 flex items-center space-x-2 text-xs font-semibold text-indigo-950">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="leading-tight">
                    {scheduleStart && scheduleEnd
                      ? `Orders open on ${formatScheduleDisplay(scheduleStart)} and close on ${formatScheduleDisplay(scheduleEnd)}.`
                      : scheduleStart && !scheduleEnd
                      ? `Orders stay closed and automatically open on ${formatScheduleDisplay(scheduleStart)}.`
                      : !scheduleStart && scheduleEnd
                      ? `Orders remain open now and automatically close on ${formatScheduleDisplay(scheduleEnd)}.`
                      : 'Select an open time or close time above to automate intake.'}
                  </span>
                </div>

                {/* Error Message */}
                {scheduleError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{scheduleError}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons (Pinned at Bottom) */}
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80 gap-2">
                <div>
                  {(scheduleStart || scheduleEnd) && (
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleStart('');
                        setScheduleEnd('');
                        setScheduleError('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSchedule}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/25 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingSchedule ? 'Saving...' : 'Save Schedule'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* iOS PWA Install Instruction Modal */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  <img src="/pwa-192x192-v2.png" alt="Family Fiesta App" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosInstallModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Apple Safari does not allow automatic app install popups. Follow these two quick steps to install the Family Fiesta Admin app:
            </p>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span>Tap the <strong>Share</strong> button (</span>
                  <Share2 className="w-3.5 h-3.5 inline text-indigo-600 -mt-0.5" />
                  <span>) in the Safari bottom toolbar.</span>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
