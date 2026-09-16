import React, { useState } from 'react';
import { Order, Student, FoodItem, OrderStatus } from '../../types';
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
} from 'lucide-react';
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
  onToggleOrdering?: (isOpen: boolean) => void;
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
  onToggleOrdering,
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

  // In-app Credentials Modal State
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credSysPass, setCredSysPass] = useState('');
  const [credError, setCredError] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // In-app System Password Modal State
  const [sysPassModalOpen, setSysPassModalOpen] = useState(false);
  const [currentSysPass, setCurrentSysPass] = useState('');
  const [newSysPass, setNewSysPass] = useState('');
  const [confirmSysPass, setConfirmSysPass] = useState('');
  const [sysPassError, setSysPassError] = useState('');
  const [isSavingSysPass, setIsSavingSysPass] = useState(false);

  // In-app Super Admin Credentials Modal State
  const [superCredModalOpen, setSuperCredModalOpen] = useState(false);
  const [superCredUsername, setSuperCredUsername] = useState('');
  const [superCredPassword, setSuperCredPassword] = useState('');
  const [superCredSysPass, setSuperCredSysPass] = useState('');
  const [superCredError, setSuperCredError] = useState('');
  const [isSavingSuperCreds, setIsSavingSuperCreds] = useState(false);

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
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-10 py-3.5 shadow-xs">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <button
              type="button"
              onClick={onExitAdmin}
              className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 cursor-pointer transition-colors"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2.5">
              <Logo size="sm" />
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Family Fiesta Admin</h1>
                  {isSuper ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs inline-flex items-center space-x-1">
                      <span>👑</span>
                      <span>Super Admin</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs inline-flex items-center space-x-1">
                      <span>🛡️</span>
                      <span>Admin</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">
                  {isSuper ? 'Full System & Operations Authority' : 'Stall Operations & Reports'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs tracking-wide flex items-center space-x-1.5 active:scale-95 transition-all cursor-pointer"
              title="Log Out of Admin Panel"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
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
              onDeleteOrder={onDeleteOrder}
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
                  <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold inline-flex items-center space-x-1.5">
                    <span>👑</span>
                    <span>Super Admin Authorized</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Festival Operations & Live Controls */}
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 px-1">
                <Power className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Festival Operations & Live Controls
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Card 1: Master Ordering Switch */}
                {onToggleOrdering && (
                  <div className={`p-6 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                    ordersOpen
                      ? 'bg-linear-to-br from-white via-white to-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      : 'bg-linear-to-br from-white via-white to-rose-50/40 border-rose-200 hover:border-rose-300'
                  }`}>
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            ordersOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            <Power className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">Master Ordering Switch</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Portal Intake Status</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 ${
                          ordersOpen ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${ordersOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span>{ordersOpen ? 'OPEN / LIVE' : 'HALTED'}</span>
                        </span>
                      </div>

                      <p className="text-slate-600 text-xs leading-relaxed mt-2">
                        {ordersOpen
                          ? 'Ordering portal is fully active. Students can select attendees, customize dishes, and submit official orders.'
                          : 'Ordering is closed. The fiesta conclusion banner is displayed. Students can only log in to view and download existing receipts.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {ordersOpen ? 'Click to halt intake' : 'Click to resume intake'}
                      </span>

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
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm flex items-center space-x-2 active:scale-95 ${
                          ordersOpen
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        <span>{ordersOpen ? 'Halt Ordering' : 'Re-Open Ordering'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Card 2: Wipe Order Register */}
                <div className="p-6 rounded-2xl bg-linear-to-br from-white via-white to-rose-50/40 border border-rose-200 hover:border-rose-300 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">Wipe Order Register</h4>
                          <p className="text-[11px] text-slate-500 font-medium">Reset Token Sequence</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Destructive Action
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed mt-2">
                      Permanently wipe all submitted food orders and reset the festival coupon token sequence back to #1. Ideal for clean festival stall day initialization.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-rose-500 font-semibold">
                      Requires Authorization
                    </span>

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
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm flex items-center space-x-1.5 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Wipe Order Register</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: Access Control & Security Credentials */}
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 px-1">
                <ShieldAlert className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Access Control & Security Credentials
                </h3>
              </div>

              {/* 3-Column Balanced Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Credentials Card 1: Super Admin */}
                <div className="p-6 rounded-2xl bg-white border border-purple-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        👑 Root Authority
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">Super Admin Account</h4>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1.5">
                      Master administrative credentials with root authority over tier pricing, menu catalog, destructive actions, and credentials.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSuperCredUsername('');
                        setSuperCredPassword('');
                        setSuperCredSysPass('');
                        setSuperCredError('');
                        setSuperCredModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm active:scale-95"
                    >
                      Update Super Account Credentials
                    </button>
                  </div>
                </div>

                {/* Credentials Card 2: Admin Account */}
                <div className="p-6 rounded-2xl bg-white border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        🛡️ Admin Account
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">Admin Account</h4>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1.5">
                      Operational credentials for counter staff to manage live queue, mark orders as delivered, print receipts, and view directory.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCredUsername('');
                        setCredPassword('');
                        setCredSysPass('');
                        setCredError('');
                        setCredModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm active:scale-95"
                    >
                      Update Admin Credentials
                    </button>
                  </div>
                </div>

                {/* Credentials Card 3: Master System Authorization Password */}
                <div className="p-6 rounded-2xl bg-white border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        🔑 Master Key
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">System Authorization Key</h4>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1.5">
                      Master security key required to authorize high-impact operations, wipe student orders, and confirm tier pricing changes.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSysPass('');
                        setNewSysPass('');
                        setConfirmSysPass('');
                        setSysPassError('');
                        setSysPassModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm active:scale-95"
                    >
                      Update Master Key
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

      {/* 2. In-app Update Credentials Modal */}
      {credModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Update Admin Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Set new login credentials for this portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
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
                  await api.setAdminCredentials(credUsername.trim(), credPassword.trim());
                  alert('Admin credentials successfully updated! Use your new credentials on your next login.');
                  setCredModalOpen(false);
                } catch (err: any) {
                  setCredError('Failed to update: ' + (err?.message || err));
                } finally {
                  setIsSavingCreds(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Admin Username
                </label>
                <input
                  type="text"
                  value={credUsername}
                  onChange={(e) => setCredUsername(e.target.value)}
                  placeholder="e.g. dada"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Admin Password
                </label>
                <input
                  type="text"
                  value={credPassword}
                  onChange={(e) => setCredPassword(e.target.value)}
                  placeholder="Enter new admin password..."
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
                  placeholder="Enter system password to confirm..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Confirmation required to prevent unauthorized takeovers.
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
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCreds}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingCreds ? 'Saving...' : 'Save New Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Update Super Admin Credentials Modal */}
      {superCredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Update Super Admin Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Set new master login for Super Account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuperCredModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!superCredUsername.trim() || !superCredPassword.trim()) {
                  setSuperCredError('Username and password cannot be empty.');
                  return;
                }
                const entered = superCredSysPass.trim();
                let validPass = 'niruma0212';
                try {
                  const { api } = await import('../../services/api');
                  validPass = await api.getSystemPassword();
                } catch (err) {}

                const isAuthorized =
                  entered === validPass ||
                  (validPass === 'niruma0212' && entered === 'niurma0212');

                if (!isAuthorized) {
                  setSuperCredError('Incorrect system password. Confirmation required.');
                  return;
                }
                setIsSavingSuperCreds(true);
                try {
                  const { api } = await import('../../services/api');
                  await api.setSuperCredentials(superCredUsername.trim(), superCredPassword.trim());
                  alert('Super Admin credentials successfully updated! Use your new credentials on next sign-in.');
                  setSuperCredModalOpen(false);
                } catch (err: any) {
                  setSuperCredError('Failed to update: ' + (err?.message || err));
                } finally {
                  setIsSavingSuperCreds(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Super Admin Username
                </label>
                <input
                  type="text"
                  value={superCredUsername}
                  onChange={(e) => setSuperCredUsername(e.target.value)}
                  placeholder="e.g. superadmin"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Super Admin Password
                </label>
                <input
                  type="text"
                  value={superCredPassword}
                  onChange={(e) => setSuperCredPassword(e.target.value)}
                  placeholder="Enter new super admin password..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  System Confirmation Password
                </label>
                <input
                  type="password"
                  value={superCredSysPass}
                  onChange={(e) => setSuperCredSysPass(e.target.value)}
                  placeholder="Enter system password to confirm..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Confirmation required to protect root administrative access.
                </p>
              </div>

              {superCredError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{superCredError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSuperCredModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSuperCreds}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSuperCreds ? 'Saving...' : 'Save Super Credentials'}
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

    </div>
  );
};
