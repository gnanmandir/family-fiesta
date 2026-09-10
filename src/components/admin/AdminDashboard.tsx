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
} from 'lucide-react';
import { AnalyticsCharts } from './AnalyticsCharts';
import { OrderTable } from './OrderTable';
import { StudentManager } from './StudentManager';
import { FoodManager } from './FoodManager';

interface AdminDashboardProps {
  orders: Order[];
  students: Student[];
  menuItems: FoodItem[];
  onUpdateOrderStatus: (orderNumber: string, status: OrderStatus) => void;
  onDeleteOrder: (orderNumber: string) => void;
  onDeleteCompletedOrders?: () => void;
  onSaveMenuItems: (items: FoodItem[]) => void;
  onResetDeviceLock: () => void;
  onClearAllOrders: () => void;
  onExitAdmin: () => void;
  onLogoutAdmin: () => void;
  ordersOpen?: boolean;
  onToggleOrdering?: (isOpen: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  students,
  menuItems,
  onUpdateOrderStatus,
  onDeleteOrder,
  onDeleteCompletedOrders,
  onSaveMenuItems,
  onResetDeviceLock,
  onClearAllOrders,
  onExitAdmin,
  onLogoutAdmin,
  ordersOpen = true,
  onToggleOrdering,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'students' | 'food' | 'settings'
  >('overview');

  const handleProtectedAction = (action: () => void, message: string = "Enter admin password to proceed:") => {
    const pwd = prompt(message);
    if (pwd === 'dada58') {
      action();
    } else if (pwd !== null) {
      alert('Incorrect password.');
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
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Family Fiesta Admin</h1>
                <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">
                  Stall Operations & Reports
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Master Ordering Toggle */}
            {onToggleOrdering && (
              <button
                type="button"
                onClick={() => {
                  const newState = !ordersOpen;
                  const msg = newState
                    ? 'Re-open ordering? Students will be able to place new orders again.'
                    : 'Close ordering? Students will only be able to view/download existing receipts.';
                  if (confirm(msg)) {
                    handleProtectedAction(() => onToggleOrdering(newState), 'Enter admin password to toggle ordering:');
                  }
                }}
                className={`px-3.5 py-2 rounded-xl font-semibold text-xs tracking-wide flex items-center space-x-1.5 active:scale-95 transition-all cursor-pointer border ${
                  ordersOpen
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                }`}
                title={ordersOpen ? 'Orders are OPEN — click to close' : 'Orders are CLOSED — click to re-open'}
              >
                <Power className="w-4 h-4" />
                <span>{ordersOpen ? 'Orders: Open' : 'Orders: Closed'}</span>
                <span className={`w-2 h-2 rounded-full ${ordersOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </button>
            )}

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
            { id: 'settings', label: 'System Controls', icon: <RotateCcw className="w-4 h-4" /> },
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
            />
          </div>
        )}

        {/* Tab 3: Student Directory */}
        {activeTab === 'students' && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <StudentManager
              students={students}
              orders={orders}
            />
          </div>
        )}

        {/* Tab 4: Food Management */}
        {activeTab === 'food' && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-xs">
            <FoodManager menuItems={menuItems} onSaveMenuItems={onSaveMenuItems} />
          </div>
        )}

        {/* Tab 5: System Controls */}
        {activeTab === 'settings' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200 space-y-6 max-w-2xl mx-auto shadow-xs text-stone-900">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-3">
              System Controls & Device Reset
            </h3>

            <div className="space-y-4 text-xs">
              
              {/* Master Ordering Switch */}
              {onToggleOrdering && (
                <div className={`p-4 rounded-xl flex items-center justify-between ${ordersOpen ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div>
                    <h4 className={`font-bold text-sm ${ordersOpen ? 'text-emerald-900' : 'text-red-900'}`}>
                      Master Ordering Switch
                    </h4>
                    <p className={`mt-0.5 ${ordersOpen ? 'text-emerald-700' : 'text-red-700'}`}>
                      {ordersOpen
                        ? 'Orders are currently OPEN. Students can place & edit orders.'
                        : 'Orders are CLOSED. Students can only view & download their existing receipts.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newState = !ordersOpen;
                      const msg = newState
                        ? 'Re-open ordering? Students will be able to place new orders again.'
                        : 'Close ordering? Students will only be able to view/download existing receipts.';
                      if (confirm(msg)) {
                        handleProtectedAction(() => onToggleOrdering(newState), 'Enter admin password to toggle ordering:');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ml-3 cursor-pointer transition-colors shadow-xs flex items-center space-x-1.5 ${
                      ordersOpen
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{ordersOpen ? 'Close Orders' : 'Open Orders'}</span>
                  </button>
                </div>
              )}

              {/* Reset Device Lock */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Clear Device Lock</h4>
                  <p className="text-stone-500 mt-0.5">Clears local device order lock for placing test orders.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleProtectedAction(() => {
                      onResetDeviceLock();
                      alert('Device lock cleared successfully.');
                    }, 'Enter admin password to clear device lock:');
                  }}
                  className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold whitespace-nowrap ml-3 cursor-pointer transition-colors shadow-xs"
                >
                  Clear Lock
                </button>
              </div>

              {/* Clear All Orders */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">Wipe All Orders</h4>
                  <p className="text-amber-800 mt-0.5">Permanently resets the order register for a clean stall setup.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete ALL orders? This action is irreversible.')) {
                      handleProtectedAction(() => {
                        onClearAllOrders();
                        alert('All orders wiped successfully.');
                      }, 'Enter admin password to confirm WIPE ALL ORDERS:');
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold whitespace-nowrap ml-3 cursor-pointer transition-colors shadow-xs"
                >
                  Wipe Orders
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
};
