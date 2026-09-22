import React, { useState, useEffect, useMemo } from 'react';
import { GuestCredential, Order, AdminRole } from '../../types';
import { api } from '../../services/api';
import {
  Plus,
  Trash2,
  KeyRound,
  Edit2,
  Users,
  Search,
  CheckCircle2,
  Clock,
  X,
  ShieldAlert,
  ShoppingBag,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

interface GuestManagerProps {
  orders?: Order[];
  adminRole?: AdminRole;
  allowEdit?: boolean;
  allowOrderWipe?: boolean;
  onDeleteOrder?: (orderNumber: string) => Promise<void> | void;
  onWipeStaffOrder?: (staff: GuestCredential, order?: Order) => Promise<void> | void;
}

export const GuestManager: React.FC<GuestManagerProps> = ({
  orders = [],
  adminRole = 'admin',
  allowEdit = true,
  allowOrderWipe = true,
  onDeleteOrder,
  onWipeStaffOrder,
}) => {
  const isBoss = adminRole === 'boss';
  const canEdit = isBoss || allowEdit;
  const canWipe = isBoss || allowOrderWipe;

  const [guests, setGuests] = useState<GuestCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ordered' | 'Remaining'>('All');

  // Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Edit Modal
  const [editingGuest, setEditingGuest] = useState<GuestCredential | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Wipe Modal
  const [wipeModal, setWipeModal] = useState<{ staff: GuestCredential; order?: Order } | null>(null);
  const [wipePassword, setWipePassword] = useState('');
  const [wipePasswordError, setWipePasswordError] = useState('');
  const [showWipePassword, setShowWipePassword] = useState(false);
  const [isWipingInProgress, setIsWipingInProgress] = useState(false);

  // Delete Modal
  const [deletingGuest, setDeletingGuest] = useState<GuestCredential | null>(null);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);

  const normalize = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const list = await api.getGuests();
      setGuests(list);
    } catch (e) {
      console.warn('Failed to load guests:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  // Helper to reliably find an order for a staff member
  const getStaffOrder = (staff: GuestCredential): Order | undefined => {
    const normName = normalize(staff.guestName);
    return orders.find((o) => {
      const isStaffType =
        o.orderType === 'staff' ||
        o.orderType === 'guest' ||
        o.parentName === 'Gurukul Staff';
      if (!isStaffType) return false;
      if (o.studentId && staff.id && o.studentId.toLowerCase() === staff.id.toLowerCase()) return true;
      if (o.fullName && normalize(o.fullName) === normName) return true;
      if (o.studentName && normalize(o.studentName) === normName) return true;
      return false;
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    let ordered = 0;
    let remaining = 0;
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let completed = 0;

    guests.forEach((g) => {
      const ord = getStaffOrder(g);
      if (ord) {
        ordered++;
        if (ord.status === 'Pending') pending++;
        else if (ord.status === 'Preparing') preparing++;
        else if (ord.status === 'Ready') ready++;
        else if (ord.status === 'Completed') completed++;
      } else {
        remaining++;
      }
    });

    return { total: guests.length, ordered, remaining, pending, preparing, ready, completed };
  }, [guests, orders]);

  // Filtered staff list
  const filteredGuests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qNorm = normalize(searchQuery);

    return guests.filter((g) => {
      const ord = getStaffOrder(g);
      const isOrdered = Boolean(ord);

      // Tab filter
      if (filter === 'Ordered' && !isOrdered) return false;
      if (filter === 'Remaining' && isOrdered) return false;

      // Search query
      if (!q) return true;

      const nameMatch =
        g.guestName.toLowerCase().includes(q) ||
        normalize(g.guestName).includes(qNorm);
      const pwdMatch = g.password.toLowerCase().includes(q);
      const orderMatch = ord ? ord.orderNumber.toLowerCase().includes(q) : false;

      return nameMatch || pwdMatch || orderMatch;
    });
  }, [guests, orders, searchQuery, filter]);

  // Handlers
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim() || !newPassword.trim()) return;
    const newGuest: GuestCredential = {
      id: `staff-${Date.now()}`,
      guestName: newGuestName.trim(),
      staffName: newGuestName.trim(),
      password: newPassword.trim(),
      createdAt: new Date().toISOString(),
    };
    await api.addGuest(newGuest);
    setNewGuestName('');
    setNewPassword('');
    setIsAddModalOpen(false);
    fetchGuests();
  };

  const handleOpenEdit = (guest: GuestCredential) => {
    setEditingGuest(guest);
    setEditName(guest.guestName);
    setEditPassword(guest.password);
  };

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !editName.trim() || !editPassword.trim()) return;
    await api.updateGuest(editingGuest.id, {
      guestName: editName.trim(),
      password: editPassword.trim(),
    });
    setEditingGuest(null);
    fetchGuests();
  };

  const handleDeleteGuest = async () => {
    if (!deletingGuest) return;
    setIsDeletingInProgress(true);
    try {
      await api.deleteGuest(deletingGuest.id, deletingGuest.guestName);
      setDeletingGuest(null);
      fetchGuests();
    } catch (e) {
      console.error('Failed to delete staff:', e);
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  const handleConfirmWipeWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wipeModal) return;

    if (!canWipe) {
      setWipePasswordError('Order wiping is currently disabled.');
      return;
    }

    const entered = wipePassword.trim();
    if (!entered) {
      setWipePasswordError('Please enter password to authorize.');
      return;
    }

    let validPass = 'niruma0212';
    try {
      validPass = await api.getSystemPassword();
    } catch (e) {}

    const isAuthorized =
      entered === validPass || (validPass === 'niruma0212' && entered === 'niurma0212');

    if (!isAuthorized) {
      setWipePasswordError('Incorrect system password. Authorization failed.');
      return;
    }

    setIsWipingInProgress(true);
    try {
      if (onWipeStaffOrder) {
        await onWipeStaffOrder(wipeModal.staff, wipeModal.order);
      } else if (wipeModal.order?.orderNumber && onDeleteOrder) {
        await onDeleteOrder(wipeModal.order.orderNumber);
      }
      setWipeModal(null);
    } catch (err: any) {
      setWipePasswordError('Failed to wipe order: ' + (err?.message || err));
    } finally {
      setIsWipingInProgress(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case 'Preparing':
        return <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Preparing</span>;
      case 'Ready':
        return <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Ready</span>;
      case 'Completed':
        return <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Statistics Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Staff Roster & Meal Orders
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage credentials, monitor order placement status, and oversee dining vouchers.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setIsAddModalOpen(true)}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 shrink-0 ${
            canEdit
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-98'
              : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed pointer-events-none'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Staff</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[11px] font-bold text-slate-400">members</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
          <span className="text-xs font-semibold text-emerald-700 block">Orders Placed</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{stats.ordered}</span>
            <span className="text-[11px] font-bold text-emerald-600">
              ({stats.total > 0 ? Math.round((stats.ordered / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs bg-gradient-to-br from-amber-50/40 to-white">
          <span className="text-xs font-semibold text-amber-800 block">Remaining / Not Ordered</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-800">{stats.remaining}</span>
            <span className="text-[11px] font-bold text-amber-700">pending</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Kitchen Progress</span>
          <div className="flex items-center space-x-2 mt-2 text-[11px] font-bold">
            <span className="text-amber-600" title="Pending">{stats.pending}P</span>
            <span className="text-slate-300">•</span>
            <span className="text-sky-600" title="Preparing">{stats.preparing}Prep</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-600" title="Delivered">{stats.completed}Done</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, password, or order #..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Ordered', 'Remaining'] as const).map((tab) => {
            const count =
              tab === 'All'
                ? stats.total
                : tab === 'Ordered'
                ? stats.ordered
                : stats.remaining;
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-indigo-500/40 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table Area */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            Loading staff roster and order statuses...
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No staff members found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'No staff match your search criteria.'
                : 'No staff members exist in this view.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4 sm:px-5 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 sm:px-5">Staff Member</th>
                  <th className="py-3.5 px-4 sm:px-5">Password Code</th>
                  <th className="py-3.5 px-4 sm:px-5">Order Status</th>
                  <th className="py-3.5 px-4 sm:px-5">Order Details</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuests.map((staff, idx) => {
                  const ord = getStaffOrder(staff);
                  const isOrdered = Boolean(ord);

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="py-3.5 px-4 sm:px-5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Staff Name & ID */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200/60">
                            {staff.guestName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {staff.guestName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {staff.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Password Code */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs">
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          <span>{staff.password}</span>
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        {isOrdered && ord ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ORDERED</span>
                            </div>
                            <div>{getStatusBadge(ord.status)}</div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-slate-500 bg-slate-100 border border-slate-200 font-semibold text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Remaining</span>
                          </div>
                        )}
                      </td>

                      {/* Order Details */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        {isOrdered && ord ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-indigo-600 text-xs">
                              {ord.orderNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {ord.items?.length || 0} item(s) • ₹{ord.totalAmount}
                            </div>
                            {(ord.dateDisplay || ord.timeDisplay) && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {ord.dateDisplay} {ord.timeDisplay}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No order placed</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit Staff Button */}
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleOpenEdit(staff)}
                            title="Edit Staff Credentials"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              canEdit
                                ? 'text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Wipe Order Button (only if ordered) */}
                          {isOrdered && ord && (
                            <button
                              type="button"
                              disabled={!canWipe}
                              onClick={() => {
                                setWipeModal({ staff, order: ord });
                                setWipePassword('');
                                setWipePasswordError('');
                                setShowWipePassword(false);
                              }}
                              title="Wipe / Reset Staff Order"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                canWipe
                                  ? 'text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200'
                                  : 'text-slate-300 cursor-not-allowed'
                              }`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Staff Member Button */}
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setDeletingGuest(staff)}
                            title="Delete Staff Member"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              canEdit
                                ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Add New Staff Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff Member Name
                </label>
                <input
                  type="text"
                  required
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="e.g. Bhimjibhai Maniya"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Code
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. 93"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Staff Modal */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Staff Member</h3>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {editingGuest.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGuest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff Member Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Code
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Wipe Order Password Modal */}
      {wipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Wipe Staff Order</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Authorization Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWipeModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-900">
                Staff: {wipeModal.staff.guestName}
              </div>
              {wipeModal.order && (
                <div className="text-slate-600 font-medium">
                  Order: <span className="font-mono font-bold text-indigo-600">{wipeModal.order.orderNumber}</span> (₹{wipeModal.order.totalAmount})
                </div>
              )}
              <p className="text-red-600 font-semibold text-[11px] pt-1">
                This will delete the staff member's order and allow them to place a new order.
              </p>
            </div>

            <form onSubmit={handleConfirmWipeWithPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master System Password
                </label>
                <div className="relative">
                  <input
                    type={showWipePassword ? 'text' : 'password'}
                    required
                    value={wipePassword}
                    onChange={(e) => {
                      setWipePassword(e.target.value);
                      setWipePasswordError('');
                    }}
                    placeholder="Enter password..."
                    className="w-full pl-3.5 pr-10 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWipePassword(!showWipePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showWipePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {wipePasswordError && (
                  <p className="text-xs text-red-600 font-semibold mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{wipePasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWipeModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWipingInProgress}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center space-x-1.5"
                >
                  {isWipingInProgress ? (
                    <span>Wiping...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Authorize & Wipe</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Delete Staff Confirmation Modal */}
      {deletingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Delete Staff Member</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to remove this staff member?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingGuest(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-900">
                Staff Name: {deletingGuest.guestName}
              </div>
              <div className="text-slate-600">
                Password Code: <span className="font-mono font-bold text-slate-800">{deletingGuest.password}</span>
              </div>
              <p className="text-slate-500 text-[11px] pt-1">
                This will remove the staff credentials and prevent them from signing in to the staff portal.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingGuest(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingInProgress}
                onClick={handleDeleteGuest}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center space-x-1.5"
              >
                {isDeletingInProgress ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
