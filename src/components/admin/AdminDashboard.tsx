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
import { PricingManager } from './PricingManager';

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
    'overview' | 'orders' | 'students' | 'food' | 'settings' | 'pricing'
  >('overview');

  const handleProtectedAction = (action: () => void, message: string = "Enter system control password to proceed:") => {
    const pwd = prompt(message);
    if (pwd === 'niruma0212') {
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

        {/* Tab: Pricing Manager */}
        {activeTab === 'pricing' && (
          <PricingManager />
        )}

        {/* Tab 5: System Controls */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                <RotateCcw className="w-7 h-7 mr-3 text-indigo-600" />
                System Controls & Operations
              </h2>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Emergency stall controls, device lock resets, database registers, and admin credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Master Ordering Switch */}
              {onToggleOrdering && (
                <div className={`p-6 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                  ordersOpen ? 'bg-white border-emerald-200' : 'bg-white border-red-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Power className={`w-5 h-5 ${ordersOpen ? 'text-emerald-600' : 'text-red-600'}`} />
                        <h4 className="font-bold text-slate-900 text-base">Master Ordering Switch</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ordersOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ordersOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {ordersOpen
                        ? 'Ordering is active. Students can choose attendees, build orders, and submit new coupons.'
                        : 'Ordering is halted. Students can view submitted receipts but cannot modify or submit new orders.'}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const newState = !ordersOpen;
                        const msg = newState
                          ? 'Re-open ordering? Students will be able to place new orders again.'
                          : 'Close ordering? Students will only be able to view/download existing receipts.';
                        if (confirm(msg)) {
                          handleProtectedAction(() => onToggleOrdering(newState), 'Enter system password (niruma0212) to toggle ordering:');
                        }
                      }}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm flex items-center space-x-2 ${
                        ordersOpen
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      <span>{ordersOpen ? 'Close Ordering' : 'Open Ordering'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 2: Reset Device Lock */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-slate-900 text-base">Device Lock Reset</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      Testing Utility
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Clear the local browser device lock allowing this tablet or computer to place repeat test orders under different student IDs.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleProtectedAction(() => {
                        onResetDeviceLock();
                        alert('Device lock cleared successfully.');
                      }, 'Enter system password (niruma0212) to clear lock:');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm"
                  >
                    Clear Device Lock
                  </button>
                </div>
              </div>

              {/* Card 3: Clear / Wipe All Orders */}
              <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <h4 className="font-bold text-slate-900 text-base">Wipe Order Register</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                      High Impact
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Permanently wipe all submitted food orders and reset the token sequence. Ideal for fresh festival stall day initialization.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('CRITICAL WARNING: Are you sure you want to permanently DELETE ALL ORDERS? This cannot be undone.')) {
                        handleProtectedAction(async () => {
                          try {
                            await onClearAllOrders();
                            alert('All orders wiped successfully!');
                          } catch (err) {
                            alert('Encountered an issue wiping orders: ' + err);
                          }
                        }, 'Enter system password (niruma0212) to confirm WIPE:');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe All Orders</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Admin Login Credentials */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-slate-900 text-base">Admin Credentials</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                      Security
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Update the main admin username and password used to sign into this administrative operations portal.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      const newUsername = prompt("Enter NEW Admin Username:");
                      if (!newUsername) return;
                      const newPassword = prompt("Enter NEW Admin Password:");
                      if (!newPassword) return;
                      
                      if (confirm(`Change admin login to Username: "${newUsername}" / Password: "${newPassword}"?`)) {
                        handleProtectedAction(async () => {
                          try {
                            const { api } = await import('../../services/api');
                            await api.setAdminCredentials(newUsername, newPassword);
                            alert("Admin credentials updated successfully! You will use these to log in next time.");
                          } catch(e) {
                            alert("Failed to update credentials.");
                          }
                        }, 'Enter system password (niruma0212) to confirm change:');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm"
                  >
                    Update Credentials
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
