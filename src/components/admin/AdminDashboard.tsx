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

  // Schedule Intake Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(orderSchedule?.enabled ?? false);
  const [scheduleStart, setScheduleStart] = useState(orderSchedule?.startTime ?? '');
  const [scheduleEnd, setScheduleEnd] = useState(orderSchedule?.endTime ?? '');
  const [scheduleError, setScheduleError] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  useEffect(() => {
    if (orderSchedule) {
      setScheduleEnabled(orderSchedule.enabled);
      setScheduleStart(orderSchedule.startTime || '');
      setScheduleEnd(orderSchedule.endTime || '');
    }
  }, [orderSchedule]);

  const openProtectedAction = (
    title: string,
    description: string,
    action: () => void | Promise<void>,
    isDanger: boolean = false,
    confirmText: string = 'Confirm'
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
    });
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
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      System Controls & Operations
                    </h2>
                    <p className="text-slate-500 mt-1 text-xs sm:text-sm">
                      Master switches, order registers, database resets, and administrative access controls.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center space-x-1.5 shadow-2xs">
                    <span>👑</span>
                    <span>Super Admin Authorized</span>
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL 1: Festival Operations & Live Controls */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Power className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Festival Operations</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Live intake status and coupon token sequence</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Row 1: Master Ordering Switch & Automated Calendar Schedule */}
                {onToggleOrdering && (
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        ordersOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        <Power className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                          <h4 className="text-sm font-bold text-slate-900">Online Food Ordering Portal</h4>
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                            ordersOpen
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ordersOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span>{ordersOpen ? 'Active & Taking Orders' : 'Ordering Halted / Concluded'}</span>
                          </span>

                          {orderSchedule?.enabled && (
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              ordersOpen
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <Calendar className="w-3 h-3 text-indigo-600" />
                              <span>{ordersOpen ? 'Calendar Active' : 'Schedule Set (Closed)'}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                          {ordersOpen
                            ? 'Students can select attendees, browse menu stalls, and submit orders.'
                            : 'Ordering is closed. The conclusion notice is shown. Students can only view and download receipts.'}
                        </p>

                        {orderSchedule?.enabled && (orderSchedule.startTime || orderSchedule.endTime) && (
                          <div className="mt-1 flex items-center space-x-2 text-[11px] text-indigo-700 font-medium bg-indigo-50/70 border border-indigo-100/90 px-2.5 py-1 rounded-lg w-fit">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                            <span>
                              Window: {orderSchedule.startTime ? formatScheduleDisplay(orderSchedule.startTime) : 'Immediate'} → {orderSchedule.endTime ? formatScheduleDisplay(orderSchedule.endTime) : 'Continuous'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      {/* Schedule Intake Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleError('');
                          if (orderSchedule) {
                            setScheduleEnabled(orderSchedule.enabled);
                            setScheduleStart(orderSchedule.startTime || '');
                            setScheduleEnd(orderSchedule.endTime || '');
                          }
                          setIsScheduleModalOpen(true);
                        }}
                        className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 border ${
                          orderSchedule?.enabled
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                        title="Configure automated opening and concluding schedule"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{orderSchedule?.enabled ? 'Edit Schedule' : 'Schedule Calendar'}</span>
                      </button>

                      {/* Manual Override Button */}
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
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 ${
                          ordersOpen
                            ? 'bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{ordersOpen ? 'Halt Ordering' : 'Re-Open Ordering'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Row 2: Wipe Order Register */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-bold text-slate-900">Wipe Order Register</h4>
                        <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                          Requires Auth
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                        Permanently wipe all submitted food orders and reset the festival coupon token sequence back to #1.
                      </p>
                    </div>
                  </div>

                  <div className="sm:shrink-0 flex items-center">
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
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-white bg-white hover:bg-rose-600 border border-slate-200 hover:border-rose-600 cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Wipe Order Register</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 2: Access Control & Security Credentials */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Security & Credentials</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Administrative login accounts and master authorization key</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Row 1: Account Credentials */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <KeyRound className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-bold text-slate-900">Administrative Credentials</h4>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          Super Admin & Stall Admin
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                        Update usernames and passwords for either Super Admin (full system access) or Stall Admin (counter operations).
                      </p>
                    </div>
                  </div>

                  <div className="sm:shrink-0 flex items-center">
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
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Credentials</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Master System Authorization Key */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-bold text-slate-900">System Authorization Key</h4>
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Master Key
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                        Master authorization password required to verify high-impact actions, wipe student orders, and confirm security changes.
                      </p>
                    </div>
                  </div>

                  <div className="sm:shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSysPass('');
                        setNewSysPass('');
                        setConfirmSysPass('');
                        setSysPassError('');
                        setSysPassModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                onClick={() => setProtectedModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
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
                  onClick={() => setProtectedModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
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
                  Master System Authorization Password required to apply credential changes.
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

                const newSched: OrderSchedule = {
                  enabled: scheduleEnabled,
                  startTime: scheduleStart,
                  endTime: scheduleEnd,
                };

                openProtectedAction(
                  'Save Intake Schedule',
                  'Enter system master password to apply the automated order intake schedule.',
                  async () => {
                    setIsSavingSchedule(true);
                    try {
                      if (onSaveSchedule) {
                        await onSaveSchedule(newSched);
                      }
                      setIsScheduleModalOpen(false);
                    } catch (err: any) {
                      setScheduleError(err?.message || 'Failed to save schedule');
                    } finally {
                      setIsSavingSchedule(false);
                    }
                  },
                  false,
                  'Confirm & Save Schedule'
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
                      ? 'Portal will automatically open and halt according to the times below.'
                      : 'Disabled. Intake is controlled exclusively via manual Halt/Re-Open.'}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auto-Start Intake Date & Time
                  </label>
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
                    Leave blank to open immediately when enabled.
                  </p>
                </div>

                {/* End Date & Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auto-Stop / Conclude Date & Time
                  </label>
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
                    Intake will automatically conclude and stop accepting orders at this time.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Quick Presets:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                        setScheduleStart(toDateTimeLocalString(now));
                        setScheduleEnd(toDateTimeLocalString(end));
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                    >
                      Next 24 Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                        setScheduleStart(toDateTimeLocalString(now));
                        setScheduleEnd(toDateTimeLocalString(end));
                        setScheduleError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                    >
                      Next 48 Hours
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
                      Festival Weekend (Fri-Sun)
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
                      Clear Dates
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
                        return `⏳ Waiting: Intake will open automatically on ${formatScheduleDisplay(scheduleStart)}. Until then, ordering remains closed.`;
                      } else if (ev.isAfterEnd) {
                        return `⏹️ Ended: Schedule has concluded as of ${formatScheduleDisplay(scheduleEnd)}. Portal will remain closed.`;
                      } else {
                        return `🟢 Active: Current time is within schedule window. Portal will be open and taking orders until ${scheduleEnd ? formatScheduleDisplay(scheduleEnd) : 'concluded'}.`;
                      }
                    })()}
                  </div>
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
