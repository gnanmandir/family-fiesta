import React, { useState, useEffect, useMemo } from 'react';
import { GuestCredential, Order, AdminRole } from '../../types';
import { api } from '../../services/api';
import { INITIAL_STAFF } from '../../data/staff';
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
  initialGuests?: GuestCredential[];
  orders?: Order[];
  adminRole?: AdminRole;
  allowEdit?: boolean;
  allowOrderWipe?: boolean;
  onDeleteOrder?: (orderNumber: string) => Promise<void> | void;
  onWipeStaffOrder?: (staff: GuestCredential, order?: Order) => Promise<void> | void;
}

const getInitialStaffList = (fallbackList?: GuestCredential[]): GuestCredential[] => {
  if (fallbackList && fallbackList.length > 0) return fallbackList;
  try {
    let deletedStaff: any[] = [];
    try {
      const raw = localStorage.getItem('family_fiesta_deleted_staff_v1');
      if (raw) deletedStaff = JSON.parse(raw);
    } catch (e) {}

    const isDeleted = (id: string, name?: string) => {
      const cleanId = (id || '').toLowerCase().trim();
      const normName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return deletedStaff.some((d: any) => {
        if (typeof d === 'string') {
          return d.toLowerCase().trim() === cleanId || (normName && d.toLowerCase().replace(/[^a-z0-9]/g, '') === normName);
        }
        if (d && typeof d === 'object') {
          if (cleanId && d.id && d.id.toLowerCase().trim() === cleanId) return true;
          if (normName && d.normalizedName && d.normalizedName === normName) return true;
        }
        return false;
      });
    };

    const staffMap = new Map<string, GuestCredential>();
    INITIAL_STAFF.forEach((s) => {
      if (!isDeleted(s.id, s.guestName)) {
        staffMap.set(s.id, s);
      }
    });

    try {
      const local = localStorage.getItem('local_staff_credentials_v2');
      if (local) {
        const parsed: GuestCredential[] = JSON.parse(local);
        parsed.forEach((p) => {
          if (!isDeleted(p.id, p.guestName)) {
            staffMap.set(p.id, { ...(staffMap.get(p.id) || {}), ...p });
          }
        });
      }
    } catch (e) {}

    return Array.from(staffMap.values()).sort((a, b) =>
      a.guestName.localeCompare(b.guestName, undefined, { sensitivity: 'base' })
    );
  } catch (e) {
    return [...INITIAL_STAFF].sort((a, b) =>
      a.guestName.localeCompare(b.guestName, undefined, { sensitivity: 'base' })
    );
  }
};

export const GuestManager: React.FC<GuestManagerProps> = ({
  initialGuests,
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

  const [guests, setGuests] = useState<GuestCredential[]>(() => getInitialStaffList(initialGuests));
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ordered' | 'Remaining'>('All');

  // Sync if initialGuests prop updates
  useEffect(() => {
    if (initialGuests && initialGuests.length > 0) {
      setGuests(initialGuests);
    }
  }, [initialGuests]);

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
    try {
      const list = await api.getGuests();
      if (list && list.length > 0) {
        setGuests(list);
      }
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

    const list = guests.filter((g) => {
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

    return list.sort((a, b) =>
      a.guestName.localeCompare(b.guestName, undefined, { sensitivity: 'base' })
    );
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
    <div className="space-y-4">
      {/* 1. Stat Cards Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-stone-200 text-center shadow-xs">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Total Staff</div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">{stats.total}</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center shadow-xs">
          <div className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold">
            Staff Ordered
          </div>
          <div className="text-2xl font-bold text-emerald-950 mt-1 font-mono">{stats.ordered}</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center shadow-xs">
          <div className="text-[10px] text-amber-800 uppercase tracking-wider font-semibold">
            Staff Remaining
          </div>
          <div className="text-2xl font-bold text-amber-950 mt-1 font-mono">{stats.remaining}</div>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff, password, order #..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setIsAddModalOpen(true)}
            className={`px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap transition-colors cursor-pointer ${
              !canEdit ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            + Add Staff
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {(['All', 'Ordered', 'Remaining'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Staff List Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[800px]">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[30%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[6%]" />
              <col className="w-[10%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center">#</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-3">Password</th>
                <th className="py-3 px-3 text-center">Order Status</th>
                <th className="py-3 px-3 text-right">Order Total</th>
                <th className="py-3 px-1 text-center whitespace-nowrap">Edit</th>
                <th className="py-3 px-1 text-center whitespace-nowrap">Wipe Order</th>
                <th className="py-3 px-1 text-center whitespace-nowrap">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredGuests.length > 0 ? (
                filteredGuests.map((staff, idx) => {
                  const ord = getStaffOrder(staff);
                  const isOrdered = Boolean(ord);

                  return (
                    <tr key={staff.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-stone-900 font-bold text-center whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900 truncate">
                        {staff.guestName}
                      </td>
                      <td className="py-3 px-3 font-mono text-indigo-600 font-bold whitespace-nowrap">
                        {staff.password}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        {isOrdered ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px] inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Ordered</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium text-[11px] inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 whitespace-nowrap font-mono">
                        {isOrdered && ord ? `₹${ord.totalAmount}` : '-'}
                      </td>
                      <td className="py-3 px-1 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleOpenEdit(staff)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="py-3 px-1 text-center whitespace-nowrap">
                        {isOrdered && ord ? (
                          <button
                            type="button"
                            disabled={!canWipe}
                            onClick={() => {
                              setWipeModal({ staff, order: ord });
                              setWipePassword('');
                              setWipePasswordError('');
                              setShowWipePassword(false);
                            }}
                            title={!canWipe ? 'Order wiping is disabled' : `Wipe order #${ord.orderNumber}`}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center space-x-1 ${
                              !canWipe
                                ? 'bg-stone-100 text-stone-400 border border-stone-200 opacity-40 cursor-not-allowed pointer-events-none select-none'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Wipe Order</span>
                          </button>
                        ) : (
                          <span className="text-stone-300 font-mono text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-1 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => setDeletingGuest(staff)}
                          title={`Permanently remove ${staff.guestName} from directory`}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-stone-400 text-xs">
                    {searchQuery ? 'No staff match your search criteria.' : 'No staff members exist in this view.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  Enter Name
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
                  Enter Password
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
                  Enter Name
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
                  Enter Password
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
