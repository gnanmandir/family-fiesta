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
import { FoodManager } from './FoodManager';
import { PricingManager } from './PricingManager';

interface AdminDashboardProps {
  orders: Order[];
  students: Student[];
  menuItems: FoodItem[];
  adminRole?: 'super' | 'admin';
  onUpdateOrderStatus: (orderNumber: string, status: OrderStatus) => void;
  onDeleteOrder: (orderNumber: string) => void;
  onDeleteCompletedOrders?: () => void;
  onSaveMenuItems: (items: FoodItem[]) => void;
  onStudentUpdated?: (student: Student) => void;
  onStudentDeleted?: (studentId: string, fullName?: string) => Promise<void> | void;
  onWipeStudentOrder?: (student: Student, order?: Order) => Promise<void> | void;
  onResetDeviceLock: () => void;
  onClearAllOrders: () => void;
  onExitAdmin: () => void;
  onLogoutAdmin: () => void;
  ordersOpen?: boolean;
  orderSchedule?: OrderSchedule;
  onToggleOrdering?: (isOpen: boolean) => void;
  onSaveSchedule?: (schedule: OrderSchedule) => Promise<void> | void;
  onRefreshOrders?: () => Promise<void> | void;
}

interface DateTimePickerProps {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (isoString: string) => void;
  onClear?: () => void;
  defaultTime?: { hour: number; minute: number; ampm: 'AM' | 'PM' };
  presets?: { label: string; onClick: () => void }[];
  note?: string;
}

function parseDateTimeParts(val: string) {
  if (!val) return null;
  const parts = val.split('T');
  if (parts.length < 2) return null;
  const dateStr = parts[0];
  const timeStr = parts[1];
  const timeParts = timeStr.split(':');
  if (timeParts.length < 2) return null;
  const h24 = parseInt(timeParts[0], 10);
  const min = parseInt(timeParts[1], 10);
  if (isNaN(h24) || isNaN(min)) return null;
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;
  return { dateStr, hour12, minute: min, ampm, h24 };
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  sublabel,
  icon,
  iconBg,
  value,
  onChange,
  onClear,
  defaultTime = { hour: 11, minute: 59, ampm: 'PM' },
  presets,
  note,
}) => {
  const parsed = parseDateTimeParts(value);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const commit = (dateStr: string, hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    const pad = (n: number) => String(n).padStart(2, '0');
    let targetDate = dateStr;
    if (!targetDate) {
      const now = new Date();
      targetDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;
    onChange(`${targetDate}T${pad(h24)}:${pad(minute)}`);
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
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    handleDateChange(dateStr);
  };

  const stepHour = (delta: number) => {
    const curH = parsed ? parsed.hour12 : defaultTime.hour;
    const curM = parsed ? parsed.minute : defaultTime.minute;
    const curAp = parsed ? parsed.ampm : defaultTime.ampm;
    let next = (curH + delta) % 12;
    if (next <= 0) next += 12;
    commit(parsed?.dateStr || '', next, curM, curAp);
  };

  const stepMinute = (delta: number) => {
    const curH = parsed ? parsed.hour12 : defaultTime.hour;
    const curM = parsed ? parsed.minute : defaultTime.minute;
    const curAp = parsed ? parsed.ampm : defaultTime.ampm;
    let next = curM + delta;
    if (next >= 60) next = 0;
    else if (next < 0) next = 55;
    commit(parsed?.dateStr || '', curH, next, curAp);
  };

  const setAmpm = (newAp: 'AM' | 'PM') => {
    const curH = parsed ? parsed.hour12 : defaultTime.hour;
    const curM = parsed ? parsed.minute : defaultTime.minute;
    commit(parsed?.dateStr || '', curH, curM, newAp);
  };

  const handleHourInput = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      commit(parsed?.dateStr || '', num, parsed ? parsed.minute : defaultTime.minute, parsed ? parsed.ampm : defaultTime.ampm);
    }
  };

  const handleMinuteInput = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      commit(parsed?.dateStr || '', parsed ? parsed.hour12 : defaultTime.hour, num, parsed ? parsed.ampm : defaultTime.ampm);
    }
  };

  const handleNativeTime = (h24Str: string) => {
    if (!h24Str) return;
    const [h, m] = h24Str.split(':').map((v) => parseInt(v, 10));
    if (isNaN(h) || isNaN(m)) return;
    const ap: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    commit(parsed?.dateStr || '', h12, m, ap);
  };

  const currentHour = parsed ? parsed.hour12 : defaultTime.hour;
  const currentMinute = parsed ? parsed.minute : defaultTime.minute;
  const currentAmpm = parsed ? parsed.ampm : defaultTime.ampm;
  const currentH24 = parsed ? parsed.h24 : (defaultTime.ampm === 'PM' ? (defaultTime.hour % 12) + 12 : defaultTime.hour % 12);

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${iconBg}`}>
            {icon}
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xs font-black text-slate-900">{label}</span>
            {sublabel && <span className="text-[11px] text-slate-400 font-medium">{sublabel}</span>}
          </div>
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
            Tomorrow
          </button>
          {value && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10.5px] text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2-Column: Calendar for Date & Adjustable Clock for Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Column 1: Calendar for Date */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar (Date)</span>
            </span>
            <span className="text-[9.5px] text-slate-400 font-normal">Click to pick</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={parsed?.dateStr || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch (err) {}
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer outline-none transition-all h-9.5"
            />
          </div>
        </div>

        {/* Column 2: Adjustable Clock for Time with AM/PM */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Adjustable Clock (Time)</span>
            </span>
            <span className="text-[9.5px] text-slate-400 font-normal">Adjust or click 🕒</span>
          </label>

          <div className="flex items-center space-x-1.5">
            {/* Hour Stepper */}
            <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs h-9.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => stepHour(-1)}
                className="w-6 sm:w-7 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer select-none shrink-0"
                title="Decrease Hour"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={String(currentHour).padStart(2, '0')}
                onChange={(e) => handleHourInput(e.target.value)}
                className="w-full text-center text-xs font-black text-slate-900 outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => stepHour(1)}
                className="w-6 sm:w-7 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer select-none shrink-0"
                title="Increase Hour"
              >
                +
              </button>
            </div>

            <span className="font-extrabold text-slate-400 text-sm select-none">:</span>

            {/* Minute Stepper */}
            <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs h-9.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => stepMinute(-5)}
                className="w-6 sm:w-7 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer select-none shrink-0"
                title="Decrease 5 mins"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={String(currentMinute).padStart(2, '0')}
                onChange={(e) => handleMinuteInput(e.target.value)}
                className="w-full text-center text-xs font-black text-slate-900 outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => stepMinute(5)}
                className="w-6 sm:w-7 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer select-none shrink-0"
                title="Increase 5 mins"
              >
                +
              </button>
            </div>

            {/* AM / PM Toggle Pill */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl h-9.5 shrink-0">
              <button
                type="button"
                onClick={() => setAmpm('AM')}
                className={`px-2.5 h-full rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentAmpm === 'AM'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setAmpm('PM')}
                className={`px-2.5 h-full rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentAmpm === 'PM'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PM
              </button>
            </div>

            {/* Native Clock Popup Trigger Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  try {
                    timeInputRef.current?.showPicker?.();
                  } catch (err) {}
                }}
                title="Open clock picker popup"
                className="w-9.5 h-9.5 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4" />
              </button>
              <input
                ref={timeInputRef}
                type="time"
                value={`${String(currentH24).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`}
                onChange={(e) => handleNativeTime(e.target.value)}
                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar: Presets / Note / Selected Badge */}
      {(note || (presets && presets.length > 0) || value) && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10.5px]">
          {note && !value && (
            <span className="text-slate-400 italic truncate">{note}</span>
          )}

          {presets && presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">Presets:</span>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={p.onClick}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-[10.5px] font-semibold border border-slate-200 cursor-pointer shadow-2xs transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {value && (
            <span className="font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md ml-auto text-[10.5px]">
              ✓ {formatScheduleDisplay(value)}
            </span>
          )}
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
  onUpdateOrderStatus,
  onDeleteOrder,
  onDeleteCompletedOrders,
  onSaveMenuItems,
  onStudentUpdated,
  onStudentDeleted,
  onWipeStudentOrder,
  onResetDeviceLock,
  onClearAllOrders,
  onExitAdmin,
  onLogoutAdmin,
  ordersOpen = true,
  orderSchedule,
  onToggleOrdering,
  onSaveSchedule,
  onRefreshOrders,
}) => {
  const isSuper = adminRole === 'super';
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'students' | 'food' | 'settings' | 'pricing'
  >('overview');

  // Protect restricted System Controls tab if not super admin
  React.useEffect(() => {
    if (!isSuper && activeTab === 'settings') {
      setActiveTab('overview');
    }
  }, [isSuper, activeTab]);

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
            { id: 'students', label: `Students (${studentsOrdered}/${totalStudents})`, icon: <Users className="w-4 h-4" /> },
            { id: 'food', label: `Menu Catalog (${menuItems.length})`, icon: <UtensilsCrossed className="w-4 h-4" /> },
            { id: 'pricing', label: 'Pricing & Tiers', icon: <IndianRupee className="w-4 h-4" /> },
            ...(isSuper ? [
              { id: 'settings', label: 'System Controls', icon: <RotateCcw className="w-4 h-4" /> },
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
              onStudentUpdated={onStudentUpdated}
              onStudentDeleted={onStudentDeleted}
              onDeleteOrder={onDeleteOrder}
              onWipeStudentOrder={onWipeStudentOrder}
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
            />
          </div>
        )}

        {/* Tab: Pricing Manager */}
        {activeTab === 'pricing' && (
          <PricingManager adminRole={adminRole} />
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                    <div className="pt-3.5 mt-4 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2">
                      <button
                        type="button"
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
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 border ${
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
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 ${
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

                {/* Card 2: Wipe Order Register (Danger Zone) */}
                <div className="bg-gradient-to-b from-white via-white to-rose-50/25 border border-rose-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          Wipe Order Register
                        </h4>
                      </div>

                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-200/80 shadow-2xs shrink-0">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Requires Auth</span>
                      </span>
                    </div>

                    <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl px-3 py-2.5 flex items-center space-x-2 text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <p className="text-xs font-medium leading-tight">
                        Permanently wipes all orders and resets coupon tokens to #1.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-rose-100/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        openProtectedAction(
                          'Permanently Wipe All Orders',
                          'CRITICAL WARNING: This action will permanently erase all order records and cannot be undone. Enter system password to proceed.',
                          async () => {
                            await onClearAllOrders();
                            alert('All orders wiped successfully!');
                          },
                          true,
                          'Wipe All Orders'
                        );
                      }}
                      className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Wipe Order Register</span>
                    </button>
                  </div>
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
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/90 relative overflow-hidden my-auto animate-in zoom-in-95 duration-150">
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
              <div className="overflow-y-auto px-5 py-3.5 space-y-2.5 flex-1">
                {/* Card 1: Auto-Open Time (Orders Start) */}
                <DateTimePicker
                  label="Auto-Open Time"
                  sublabel="(Orders start)"
                  icon={<Power className="w-3 h-3" />}
                  iconBg="bg-emerald-100 text-emerald-700"
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
                  presets={[
                    {
                      label: 'Tomorrow 9:00 AM',
                      onClick: () => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(9, 0, 0, 0);
                        setScheduleStart(toDateTimeLocalString(tomorrow));
                        setScheduleError('');
                      },
                    },
                  ]}
                />

                {/* Card 2: Auto-Close Time (Orders Halt) */}
                <DateTimePicker
                  label="Auto-Close Time"
                  sublabel="(Orders halt)"
                  icon={<Clock className="w-3 h-3" />}
                  iconBg="bg-rose-100 text-rose-700"
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
                  presets={[
                    {
                      label: 'Tonight 11:59 PM',
                      onClick: () => {
                        const tonight = new Date();
                        tonight.setHours(23, 59, 0, 0);
                        setScheduleEnd(toDateTimeLocalString(tonight));
                        setScheduleError('');
                      },
                    },
                    {
                      label: 'Tomorrow 11:59 PM',
                      onClick: () => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(23, 59, 0, 0);
                        setScheduleEnd(toDateTimeLocalString(tomorrow));
                        setScheduleError('');
                      },
                    },
                    {
                      label: 'In 2 Hours',
                      onClick: () => {
                        const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
                        setScheduleEnd(toDateTimeLocalString(twoHours));
                        setScheduleError('');
                      },
                    },
                  ]}
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
