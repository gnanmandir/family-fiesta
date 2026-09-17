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
  const [scheduleEnabled, setScheduleEnabled] = useState(isScheduleActuallyActive);
  const [scheduleStart, setScheduleStart] = useState(isScheduleActuallyActive ? (orderSchedule?.startTime ?? '') : '');
  const [scheduleEnd, setScheduleEnd] = useState(isScheduleActuallyActive ? (orderSchedule?.endTime ?? '') : '');
  const [scheduleError, setScheduleError] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  useEffect(() => {
    if (orderSchedule && !isScheduleModalOpen) {
      const active = orderSchedule.enabled && !isScheduleDone(orderSchedule);
      if (active) {
        setScheduleEnabled(orderSchedule.enabled);
        setScheduleStart(orderSchedule.startTime || '');
        setScheduleEnd(orderSchedule.endTime || '');
      } else {
        setScheduleEnabled(false);
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
                            setScheduleEnabled(orderSchedule.enabled);
                            setScheduleStart(orderSchedule.startTime || '');
                            setScheduleEnd(orderSchedule.endTime || '');
                          } else {
                            setScheduleEnabled(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Schedule Order Intake</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Automate food ordering start and stop dates</p>
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

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setScheduleError('');

                if (scheduleEnabled && scheduleStart && scheduleEnd) {
                  const startMs = new Date(scheduleStart).getTime();
                  const endMs = new Date(scheduleEnd).getTime();
                  if (!isNaN(startMs) && !isNaN(endMs) && endMs <= startMs) {
                    setScheduleError('Conclude date & time must be after the start date & time.');
                    return;
                  }
                }

                if (scheduleEnabled && !scheduleStart && !scheduleEnd) {
                  setScheduleError('Please enter an Auto-Stop date (to halt ordering at a future time) or an Auto-Start date.');
                  return;
                }

                const newSched: OrderSchedule = {
                  enabled: scheduleEnabled,
                  startTime: scheduleStart,
                  endTime: scheduleEnd,
                };

                // Immediately close the schedule modal so it does not block the authentication box
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
                    // If user cancels out of password prompt, re-open schedule modal with inputs preserved
                    setIsScheduleModalOpen(true);
                  }
                );
              }}
              className="space-y-4"
            >
              {/* Toggle Switch Card */}
              <div
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  scheduleEnabled
                    ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      Automate with Schedule Calendar
                    </span>
                    {scheduleEnabled && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                        ON
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    {scheduleEnabled
                      ? 'Orders open and halt automatically based on the schedule.'
                      : 'Manual toggle mode.'}
                  </p>
                </div>

                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                  scheduleEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                }`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs transition-transform" />
                </div>
              </div>

              {/* Date & Time Fields */}
              <div className={`space-y-3.5 transition-opacity ${scheduleEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                {/* Start Date & Time */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Auto-Start Date & Time <span className="font-normal text-slate-400 text-[11px]">(Optional)</span>
                    </label>
                    {scheduleStart && (
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleStart('');
                          setScheduleError('');
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={scheduleStart}
                      onChange={(e) => {
                        setScheduleStart(e.target.value);
                        setScheduleError('');
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional. Leave blank if ordering is already open now.
                  </p>
                </div>

                {/* End Date & Time */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Auto-Stop / Conclude Date & Time <span className="font-normal text-slate-400 text-[11px]">(Optional)</span>
                    </label>
                    {scheduleEnd && (
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleEnd('');
                          setScheduleError('');
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={scheduleEnd}
                      onChange={(e) => {
                        setScheduleEnd(e.target.value);
                        setScheduleError('');
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional. Ordering automatically closes at this time.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Quick Presets:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const tonight = new Date();
                        tonight.setHours(23, 59, 0, 0);
                        setScheduleStart('');
                        setScheduleEnd(toDateTimeLocalString(tonight));
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200 cursor-pointer transition-colors"
                      title="Keep open now, auto-halt tonight at 11:59 PM"
                    >
                      Close Tonight (11:59 PM)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(23, 59, 0, 0);
                        setScheduleStart('');
                        setScheduleEnd(toDateTimeLocalString(tomorrow));
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                      title="Keep open now, auto-halt tomorrow at 11:59 PM"
                    >
                      Close Tomorrow (11:59 PM)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
                        setScheduleStart('');
                        setScheduleEnd(toDateTimeLocalString(twoHours));
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                      title="Keep open now, auto-halt in 2 hours"
                    >
                      Close in 2 Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const friday = new Date(now);
                        const day = now.getDay();
                        const diffToFri = (5 - day + 7) % 7;
                        friday.setDate(now.getDate() + diffToFri);
                        friday.setHours(9, 0, 0, 0);

                        const sunday = new Date(friday);
                        sunday.setDate(friday.getDate() + 2);
                        sunday.setHours(23, 59, 0, 0);

                        setScheduleStart(toDateTimeLocalString(friday));
                        setScheduleEnd(toDateTimeLocalString(sunday));
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                    >
                      Festival Weekend (Fri–Sun)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleStart('');
                        setScheduleEnd('');
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Preview Card */}
              {scheduleEnabled && (scheduleStart || scheduleEnd) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Intake Preview:</span>
                  </div>
                  <div className="text-slate-600 text-[11.5px] leading-relaxed">
                    {(() => {
                      const tempSched: OrderSchedule = {
                        enabled: true,
                        startTime: scheduleStart,
                        endTime: scheduleEnd,
                      };
                      const ev = evaluateSchedule(tempSched, true);
                      if (ev.isBeforeStart) {
                        return `⏳ Waiting to Open: Intake will open automatically on ${formatScheduleDisplay(scheduleStart)}. Until then, ordering remains closed.`;
                      } else if (ev.isAfterEnd) {
                        return `⏹️ Ended: Schedule has concluded as of ${formatScheduleDisplay(scheduleEnd)}. Portal will remain closed.`;
                      } else {
                        if (!scheduleStart && scheduleEnd) {
                          return `🟢 Active Now: Order taking is currently open and will automatically halt on ${formatScheduleDisplay(scheduleEnd)}.`;
                        }
                        if (scheduleStart && !scheduleEnd) {
                          return `🟢 Active: Order intake opened on ${formatScheduleDisplay(scheduleStart)} and remains open.`;
                        }
                        return `🟢 Active: Current time is within schedule window. Portal will be open and taking orders until ${formatScheduleDisplay(scheduleEnd)}.`;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Helper tip when enabled but no dates entered yet */}
              {scheduleEnabled && !scheduleStart && !scheduleEnd && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-800 text-xs flex items-center space-x-2 font-medium">
                  <Clock className="w-4 h-4 shrink-0 text-indigo-600" />
                  <span>Tip: Order taking is currently open! You can just set the Auto-Stop date above (or click a quick preset) to automatically conclude ordering at that time.</span>
                </div>
              )}

              {/* Error Message */}
              {scheduleError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{isSavingSchedule ? 'Saving...' : 'Save Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
