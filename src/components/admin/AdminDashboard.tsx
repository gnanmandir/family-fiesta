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
} from 'lucide-react';
import {
  evaluateSchedule,
  isScheduleDone,
  formatScheduleDisplay,
  toDateTimeLocalString,
} from '../../utils/schedule';
import { AnalyticsCharts } from './AnalyticsCharts';
import { OrderTable } from './OrderTable';
import { StudentManager } from './StudentManager';
import { GuestManager } from './GuestManager';
import { FoodManager } from './FoodManager';
import { PricingManager } from './PricingManager';

interface AdminDashboardProps {
  orders: Order[];
  students: Student[];
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
  const scrollTimeoutRef = useRef<any>(null);
  const ITEM_HEIGHT = 40; // px

  // Sync scroll position when external value changes
  useEffect(() => {
    if (!containerRef.current || isScrollingRef.current) return;
    const idx = items.indexOf(value);
    if (idx !== -1) {
      const targetTop = idx * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetTop) > 2) {
        containerRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;
    clearTimeout(scrollTimeoutRef.current);

    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    if (idx >= 0 && idx < items.length && items[idx] !== value) {
      onChange(items[idx]);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (containerRef.current) {
        const snapIdx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
        if (snapIdx >= 0 && snapIdx < items.length) {
          containerRef.current.scrollTo({ top: snapIdx * ITEM_HEIGHT, behavior: 'smooth' });
          if (items[snapIdx] !== value) {
            onChange(items[snapIdx]);
          }
        }
      }
    }, 120);
  };

  const handleItemClick = (item: T, idx: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
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
                    ? 'text-white text-2xl font-black scale-105'
                    : 'text-slate-500 text-sm font-semibold hover:text-slate-300'
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
    indigo: 'border-indigo-500/50 bg-indigo-500/15 text-indigo-400',
    emerald: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400',
    rose: 'border-rose-500/50 bg-rose-500/15 text-rose-400',
  }[theme];

  return (
    <div className="relative flex items-center justify-center bg-slate-950 rounded-2xl px-3 py-2 border border-slate-800 shadow-2xl overflow-hidden select-none w-full max-w-[260px]">
      {/* Top Fading Mask Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-10" />

      {/* Bottom Fading Mask Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10" />

      {/* Center Highlight Bar (matching user's reference image) */}
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
        <div className="flex items-center justify-center w-4 h-[40px] text-slate-400 font-mono font-bold text-xl select-none z-15">
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
                  ? 'text-white text-sm font-black scale-110'
                  : 'text-slate-500 text-xs font-semibold hover:text-slate-300'
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

  const commit = (dateStr: string, hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    let targetDate = dateStr;
    if (!targetDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      targetDate = `${y}-${m}-${d}`;
    }
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;
    const [y, mon, d] = targetDate.split('-').map(Number);
    const target = new Date(y, mon - 1, d, h24, minute, 0, 0);
    onChange(target.toISOString());
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onClear?.();
      return;
    }
    const h = parsed ? parsed.hour12 : defaultTime.hour;
    const m = parsed ? parsed.minute : defaultTime.minute;
    const ap = parsed ? parsed.ampm : defaultTime.ampm;
    commit(newDate, h, m, ap);
  };

  const setQuickDayOffset = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    handleDateChange(`${year}-${month}-${day}`);
  };

  const currentHour = parsed ? parsed.hour12 : defaultTime.hour;
  const currentMinute = parsed ? parsed.minute : defaultTime.minute;
  const currentAmpm = parsed ? parsed.ampm : defaultTime.ampm;



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
              onChangeHour={(h) => commit(parsed?.dateStr || '', h, currentMinute, currentAmpm)}
              onChangeMinute={(m) => commit(parsed?.dateStr || '', currentHour, m, currentAmpm)}
              onChangeAmpm={(ap) => commit(parsed?.dateStr || '', currentHour, currentMinute, ap)}
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

  type AdminTab = 'overview' | 'orders' | 'students' | 'staff' | 'food' | 'settings' | 'pricing' | 'boss_controls';
  const VALID_ADMIN_TABS: AdminTab[] = ['overview', 'orders', 'students', 'staff', 'food', 'settings', 'pricing', 'boss_controls'];

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

  // Protect restricted tabs
  React.useEffect(() => {
    if (!isSuper && activeTab === 'settings') {
      setActiveTab('overview');
      try {
        localStorage.setItem('admin_active_tab', 'overview');
        window.history.replaceState(null, '', '#overview');
      } catch (e) {}
    }
    if (!isBoss && activeTab === 'boss_controls') {
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
    try {
      const { api } = await import('../../services/api');
      validPass = await api.getSystemPassword();
    } catch (err) {}

    const isAuthorized =
      entered === validPass ||
      (validPass === 'niruma0212' && entered === 'niurma0212');

    if (!isAuthorized) {
      setSystemPasswordError('Incorrect system password. Please try again.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await protectedModal.onSuccess();
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
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  Family Fiesta <span className="hidden md:inline font-bold">Admin</span>
                </h1>
                <p className="text-[9px] sm:text-[10px] text-indigo-600 font-semibold uppercase tracking-wider truncate mt-0.5">
                  {isSuper ? (
                    <>
                      <span className="sm:hidden">Full System Authority</span>
                      <span className="hidden sm:inline">Full System & Operations Authority</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Stall Operations</span>
                      <span className="hidden sm:inline">Stall Operations & Reports</span>
                    </>
                  )}
                </p>
                <div className="mt-1">
                  {isSuper ? (
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

          {/* Right: Log Out Button */}
          <div className="flex items-center space-x-2 shrink-0">
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

      <div className="max-w-[1600px] w-full mx-auto p-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs custom-scrollbar">
          {[
            { id: 'overview', label: 'Analytics & Charts', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'orders', label: `Live Orders (${totalOrders})`, icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
            { id: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" /> },
            { id: 'food', label: `Menu Catalog (${menuItems.length})`, icon: <UtensilsCrossed className="w-4 h-4" /> },
            { id: 'pricing', label: 'Pricing & Tiers', icon: <IndianRupee className="w-4 h-4" /> },
            ...(isSuper ? [
              { id: 'settings', label: 'Operations & Wipe', icon: <RotateCcw className="w-4 h-4" /> },
            ] : []),
            ...(isBoss ? [
              { id: 'boss_controls', label: 'System Control', icon: <ShieldCheck className="w-4 h-4" /> },
            ] : []),
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer ${
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
              adminRole={adminRole}
              allowEdit={isBoss || systemControls?.allowRosterEdit !== false}
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
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                      System Controls
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium truncate">
                      Live portal intake, database resets, and access credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <span className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 border border-indigo-200/80 text-[11px] sm:text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs">
                    <Crown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Super Admin Authorized</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Festival Operations & Live Controls */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5 px-0.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-2xs shrink-0">
                  <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Festival Operations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Card 0: Master Intake Phase Switch */}
                {onSetIntakePhase && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-1.5 ${
                      intakePhase === 'parent' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                      intakePhase === 'student' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' :
                      (intakePhase === 'guest' || intakePhase === 'staff') ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      'bg-gradient-to-r from-slate-500 to-gray-500'
                    }`} />
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border bg-slate-50 text-slate-700 border-slate-200`}>
                            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            Intake Phase
                          </h4>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold shadow-2xs shrink-0 bg-slate-50 text-slate-700 border border-slate-200 uppercase tracking-wide">
                          {intakePhase === 'guest' ? 'staff' : intakePhase}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs text-slate-600 font-medium">
                        Controls who can login and place orders. Other roles will be read-only.
                      </div>
                    </div>
                    
                    <div className={`pt-3.5 mt-4 border-t border-slate-100/80 ${(!isBoss && systemControls?.allowPhaseChange === false) ? 'opacity-40 cursor-not-allowed pointer-events-none select-none' : ''}`}>
                      <select
                        disabled={!isBoss && systemControls?.allowPhaseChange === false}
                        value={intakePhase === 'guest' ? 'staff' : intakePhase}
                        onChange={(e) => {
                          const newPhase = e.target.value as import('../types').IntakePhase;
                          openProtectedAction(
                            'Change Intake Phase',
                            `Enter system password to change the intake phase to ${newPhase.toUpperCase()}.`,
                            () => { onSetIntakePhase(newPhase); },
                            false,
                            'Confirm Phase Change'
                          );
                        }}
                        className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl px-3 py-2 sm:py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold outline-none ${
                          (!isBoss && systemControls?.allowPhaseChange === false) ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <option value="parent">Parent Phase</option>
                        <option value="student">Student Phase</option>
                        <option value="staff">Staff Phase</option>
                        <option value="closed">Closed Phase</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Card 1: Master Ordering Switch & Automated Calendar Schedule */}
                {onToggleOrdering && (
                  <div className={`bg-white border rounded-2xl shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden ${
                    ordersOpen ? 'border-emerald-200/90' : 'border-rose-200/90'
                  }`}>
                    <div className={`absolute top-0 inset-x-0 h-1.5 ${
                      ordersOpen ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-red-500'
                    }`} />

                    <div className="space-y-3">
                      {/* Header row: Icon + Title on left, Status Badge on right */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
                            ordersOpen
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-600 border-rose-200/80'
                          }`}>
                            <Power className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            Food Ordering Portal
                          </h4>
                        </div>

                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold shadow-2xs shrink-0 ${
                          ordersOpen
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/90'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/90'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${ordersOpen ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20' : 'bg-rose-500'}`} />
                          <span>{ordersOpen ? 'Active' : 'Halted'}</span>
                        </span>
                      </div>

                      {/* Schedule status strip */}
                      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs">
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          isScheduleActuallyActive
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200/90'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}>
                          {isScheduleActuallyActive ? 'Scheduled' : 'Manual'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons: 2-column grid on mobile, flex on desktop */}
                    <div className={`pt-3.5 mt-4 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 ${
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
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 border ${
                          (!isBoss && systemControls?.allowOrderPortal === false) ? 'cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          isScheduleActuallyActive
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/90 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isScheduleActuallyActive ? 'Edit' : 'Schedule'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isBoss && systemControls?.allowOrderPortal === false}
                        onClick={() => {
                          const newState = !ordersOpen;
                          openProtectedAction(
                            newState ? 'Open Ordering System' : 'Close Ordering System',
                            newState
                              ? 'Enter system password to re-open ordering for students.'
                              : 'Enter system password to halt ordering. Students will only be able to view and download existing receipts.',
                            () => onToggleOrdering(newState),
                            !newState,
                            newState ? 'Open Ordering' : 'Close Ordering'
                          );
                        }}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 ${
                          (!isBoss && systemControls?.allowOrderPortal === false) ? 'cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          ordersOpen
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{ordersOpen ? 'Halt' : 'Re-Open'}</span>
                        <span className="hidden sm:inline"> Ordering</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Wipe Order Register (Danger Zone - Full Width) */}
              <div className={`bg-gradient-to-b from-white via-white to-rose-50/25 border border-rose-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden ${
                (!isBoss && systemControls?.allowOrderWipe === false) ? 'opacity-40 cursor-not-allowed pointer-events-none select-none' : ''
              }`}>
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            Wipe Order Register
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Select a category to wipe individually, or wipe all orders.
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-200/80 shadow-2xs shrink-0">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Requires Auth</span>
                      </span>
                    </div>

                    <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl px-3 py-2 flex items-center space-x-2 text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <p className="text-xs font-medium leading-tight">
                        Wiping clears selected orders and releases device locks for that category.
                      </p>
                    </div>

                    {/* Individual Category Wipe Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {/* Parent Orders Wipe */}
                      <div className="p-3 rounded-xl border border-rose-100 bg-white shadow-2xs flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Parent Orders</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {parentOrdersCount}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Family & parent meal orders</p>
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
                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                            parentOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 cursor-pointer active:scale-95'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Wipe Parents ({parentOrdersCount})</span>
                        </button>
                      </div>

                      {/* Student Orders Wipe */}
                      <div className="p-3 rounded-xl border border-rose-100 bg-white shadow-2xs flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Student Orders</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {studentOrdersCount}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Student phase meal passes</p>
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
                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                            studentOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 cursor-pointer active:scale-95'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Wipe Students ({studentOrdersCount})</span>
                        </button>
                      </div>

                      {/* Staff Orders Wipe */}
                      <div className="p-3 rounded-xl border border-rose-100 bg-white shadow-2xs flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Staff Orders</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {staffOrdersCount}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Staff dining meal vouchers</p>
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
                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                            staffOrdersCount === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 cursor-pointer active:scale-95'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Wipe Staff ({staffOrdersCount})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-rose-100/80 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Need a full reset? Wipe all categories simultaneously:
                    </span>
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
                      className={`w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                        orders.length === 0 || (!isBoss && systemControls?.allowOrderWipe === false)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 cursor-pointer active:scale-95'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Wipe All Orders ({orders.length})</span>
                    </button>
                  </div>
                </div>
              </div>

            {/* SECTION 2: Access Control & Security Credentials */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5 px-0.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shadow-2xs shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Access Control & Credentials</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Card 3: Account Credentials */}
                <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-blue-600" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          Account Credentials
                        </h4>
                      </div>

                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs shrink-0">
                        <span>Super & Admin</span>
                      </span>
                    </div>

                    <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs">
                      <p className="text-xs text-slate-600 font-medium truncate">
                        Logins for Super Admin & Stall Admin accounts.
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xs" title="Super Admin">👑</span>
                        <span className="text-xs" title="Stall Admin">🛡️</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-end">
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
                      className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 shadow-2xs flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95"
                    >
                      <KeyRound className="w-4 h-4 text-slate-700" />
                      <span>Update Credentials</span>
                    </button>
                  </div>
                </div>

                {/* Card 4: Master System Authorization Key */}
                <div className="bg-gradient-to-b from-white via-white to-amber-50/25 border border-amber-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                          <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          System Master Key
                        </h4>
                      </div>

                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-200/80 shadow-2xs shrink-0">
                        <Lock className="w-3 h-3 text-amber-700" />
                        <span>Master Key</span>
                      </span>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2.5 flex items-center space-x-2 text-amber-900">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs font-medium leading-tight truncate">
                        Authorizes order wipes and credential updates.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-amber-100/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSysPass('');
                        setNewSysPass('');
                        setConfirmSysPass('');
                        setSysPassError('');
                        setSysPassModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/25 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Update Master Key</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 6: Boss Exclusive System Control Switchboard */}
        {activeTab === 'boss_controls' && isBoss && (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl text-white">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        System Control Switchboard
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        Boss Authority
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                      Master toggle controls for platform operations. When disabled, features are grayed out for Super Admins without revealing system overrides.
                    </p>
                  </div>
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
                  icon: <Power className="w-5 h-5" />,
                },
                {
                  key: 'allowPhaseChange' as const,
                  title: 'Intake Phase Switching',
                  desc: 'Allow Super Admins to change the active intake phase (Parent, Student, Staff, Closed). When disabled, phase selection is locked.',
                  icon: <Settings className="w-5 h-5" />,
                },
                {
                  key: 'allowOrderWipe' as const,
                  title: 'Order Wipe Controls',
                  desc: 'Allow Super Admins to wipe individual orders and registers. When disabled, every order wipe button across the system is locked and grayed out.',
                  icon: <Trash2 className="w-5 h-5" />,
                },
                {
                  key: 'allowRosterEdit' as const,
                  title: 'Roster Management',
                  desc: 'Allow Super Admins to add, update, or remove Students and Staff credentials. When disabled, rosters cannot be altered.',
                  icon: <Users className="w-5 h-5" />,
                },
              ].map((ctrl) => {
                const isEnabled = systemControls ? systemControls[ctrl.key] !== false : true;
                return (
                  <div
                    key={ctrl.key}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
                            isEnabled
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-600 border-rose-200/80'
                          }`}>
                            {ctrl.icon}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm">{ctrl.title}</h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{ctrl.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
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
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-95 border ${
                          isEnabled
                            ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200 hover:border-rose-600'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
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
                  System Password
                </label>
                <div className="relative">
                  <input
                    type={showSystemPassword ? 'text' : 'password'}
                    value={systemPassword}
                    onChange={(e) => {
                      setSystemPassword(e.target.value);
                      if (systemPasswordError) setSystemPasswordError('');
                    }}
                    placeholder="Enter system password..."
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
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 ${
                    protectedModal.isDanger
                      ? 'bg-red-600 hover:bg-red-700'
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

    </div>
  );
};
