import { FoodItem, Order, OrderStatus, Student, OrderSchedule, SystemControls, AdminRole, LoginHistoryItem } from '../types';
import { tursoService, isTursoConfigured } from './turso';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) errorMsg = body.error;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Students
  getStudents: async (): Promise<Student[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getStudents();
      } catch (e) {
        console.error('Turso getStudents error:', e);
      }
    }
    try {
      const res = await fetchJson<{ success: boolean; data: Student[] }>(`${API_BASE}/students`);
      return res.data || [];
    } catch (e) {
      if (isTursoConfigured) {
        return await tursoService.getStudents();
      }
      return [];
    }
  },

  saveStudent: async (student: Student): Promise<Student> => {
    if (isTursoConfigured) {
      return await tursoService.saveStudent(student);
    }
    return student;
  },

  deleteStudent: async (studentId: string, fullName?: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteStudent(studentId, fullName).catch(() => {});
    }
    await fetchJson(`${API_BASE}/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    }).catch(() => {});
  },

  getDeletedStudents: async (): Promise<{ id: string; fullName: string; normalizedName: string }[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getDeletedStudents();
      } catch (e) {}
    }
    return [];
  },

  addDeletedStudent: async (entry: { id: string; fullName: string; normalizedName: string }): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.addDeletedStudent(entry).catch(() => {});
    }
  },

  removeDeletedStudent: async (studentId: string, fullName?: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.removeDeletedStudent(studentId, fullName).catch(() => {});
    }
  },

  setAdminCredentials: async (username: string, password: string) => {
    if (isTursoConfigured) {
      await tursoService.setAdminCredentials(username, password);
      return;
    }
  },

  getAllRoleTiers: async (): Promise<{ parent: number[]; student: number[]; guest: number[] }> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getAllRoleTiers();
      } catch (e) {
        console.warn('[Turso] Failed to get all role tiers:', e);
      }
    }
    try {
      const p = localStorage.getItem('app_parent_tiers');
      const s = localStorage.getItem('app_student_tiers');
      const g = localStorage.getItem('app_guest_tiers') || localStorage.getItem('app_staff_tiers');
      return {
        parent: p ? JSON.parse(p) : [230, 230, 140, 80],
        student: s ? JSON.parse(s) : [230],
        guest: g ? JSON.parse(g) : [230],
      };
    } catch (e) {
      return {
        parent: [230, 230, 140, 80],
        student: [230],
        guest: [230],
      };
    }
  },

  getRoleTiers: async (role: 'parent' | 'student' | 'guest' | 'staff'): Promise<number[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getRoleTiers(role);
      } catch (e) {
        console.warn(`[Turso] Failed to get ${role} tiers:`, e);
      }
    }
    if (role === 'parent') return [230, 230, 140, 80];
    return [230];
  },

  setRoleTiers: async (role: 'parent' | 'student' | 'guest' | 'staff', tiers: number[]): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.setRoleTiers(role, tiers);
    }
  },

  getGuestTiers: async (): Promise<number[]> => {
    return await api.getRoleTiers('parent');
  },

  setGuestTiers: async (tiers: number[]) => {
    await api.setRoleTiers('parent', tiers);
  },

  getStudentById: async (id: string): Promise<Student> => {
    if (isTursoConfigured) {
      const all = await tursoService.getStudents();
      const found = all.find((s) => s.id.toLowerCase() === id.toLowerCase());
      if (found) return found;
    }
    const res = await fetchJson<{ success: boolean; data: Student }>(`${API_BASE}/students/${encodeURIComponent(id)}`);
    return res.data;
  },

  // Menu
  getMenuItems: async (): Promise<FoodItem[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getMenuItems();
      } catch (e) {
        console.warn('[Turso] Failed to fetch menu, trying fallback:', e);
      }
    }
    const res = await fetchJson<{ success: boolean; data: FoodItem[] }>(`${API_BASE}/menu`);
    return res.data;
  },

  saveMenuItems: async (items: FoodItem[]): Promise<FoodItem[]> => {
    if (isTursoConfigured) {
      for (const item of items) {
        await tursoService.saveMenuItem(item);
      }
      return items;
    }
    const res = await fetchJson<{ success: boolean; data: FoodItem[] }>(`${API_BASE}/menu`, {
      method: 'PUT',
      body: JSON.stringify(items),
    });
    return res.data;
  },

  addMenuItem: async (item: Partial<FoodItem>): Promise<FoodItem> => {
    if (isTursoConfigured) {
      return await tursoService.saveMenuItem(item);
    }
    const res = await fetchJson<{ success: boolean; data: FoodItem }>(`${API_BASE}/menu`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return res.data;
  },

  updateMenuItem: async (id: string, updates: Partial<FoodItem>): Promise<FoodItem> => {
    if (isTursoConfigured) {
      return await tursoService.updateMenuItem(id, updates);
    }
    const res = await fetchJson<{ success: boolean; data: FoodItem }>(`${API_BASE}/menu/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  toggleMenuItem: async (id: string): Promise<FoodItem> => {
    if (isTursoConfigured) {
      const items = await tursoService.getMenuItems();
      const target = items.find((i) => i.id === id);
      if (target) {
        return await tursoService.updateMenuItem(id, { isAvailable: !target.isAvailable });
      }
    }
    const res = await fetchJson<{ success: boolean; data: FoodItem }>(`${API_BASE}/menu/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    });
    return res.data;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteMenuItem(id);
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/menu/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getOrders();
      } catch (e) {
        console.warn('[Turso] Failed to fetch orders, trying fallback:', e);
      }
    }
    const res = await fetchJson<{ success: boolean; data: Order[] }>(`${API_BASE}/orders`);
    return res.data;
  },

  getOrderByStudent: async (studentId: string, role?: string): Promise<Order | null> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getOrderByStudent(studentId, role);
      } catch (e) {}
    }
    try {
      const res = await fetchJson<{ success: boolean; data: Order }>(
        `${API_BASE}/orders/student/${encodeURIComponent(studentId)}`
      );
      return res.data;
    } catch (e) {
      return null;
    }
  },

  getOrderByDevice: async (deviceId: string): Promise<Order | null> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getOrderByDevice(deviceId);
      } catch (e) {}
    }
    try {
      const res = await fetchJson<{ success: boolean; data: Order }>(
        `${API_BASE}/orders/device/${encodeURIComponent(deviceId)}`
      );
      return res.data;
    } catch (e) {
      return null;
    }
  },

  placeOrder: async (orderPayload: Partial<Order>): Promise<Order> => {
    if (isTursoConfigured) {
      return await tursoService.placeOrder(orderPayload as Order);
    }
    const res = await fetchJson<{ success: boolean; data: Order }>(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
    return res.data;
  },

  updateOrder: async (orderNumber: string, orderPayload: Partial<Order>): Promise<Order> => {
    if (isTursoConfigured) {
      return await tursoService.updateOrder(orderNumber, orderPayload);
    }
    const res = await fetchJson<{ success: boolean; data: Order }>(
      `${API_BASE}/orders/${encodeURIComponent(orderNumber)}`,
      {
        method: 'PUT',
        body: JSON.stringify(orderPayload),
      }
    );
    return res.data;
  },

  updateOrderStatus: async (orderNumber: string, status: OrderStatus): Promise<Order> => {
    if (isTursoConfigured) {
      await tursoService.updateOrderStatus(orderNumber, status);
      const orders = await tursoService.getOrders();
      return orders.find((o) => o.orderNumber === orderNumber)!;
    }
    const res = await fetchJson<{ success: boolean; data: Order }>(
      `${API_BASE}/orders/${encodeURIComponent(orderNumber)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return res.data;
  },

  deleteOrder: async (orderNumber: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteOrder(orderNumber);
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}`, {
      method: 'DELETE',
    });
  },

  wipeStudentOrder: async (studentId: string, studentFullName?: string, orderNumber?: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.wipeStudentOrder(studentId, studentFullName, orderNumber);
    }
  },

  deleteCompletedOrders: async (): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteCompletedOrders();
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/orders/completed`, {
      method: 'DELETE',
    });
  },

  deleteAllOrders: async (): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteAllOrders();
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/orders`, {
      method: 'DELETE',
    });
  },

  deleteOrdersByRole: async (role: 'parent' | 'student' | 'guest' | 'staff'): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteOrdersByRole(role);
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/orders/role/${encodeURIComponent(role)}`, {
      method: 'DELETE',
    }).catch(() => {});
  },

  clearDeviceLock: async (deviceId: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.clearDeviceLock(deviceId);
      return;
    }
    try {
      await fetchJson<{ success: boolean }>(`${API_BASE}/orders/device/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
      });
    } catch (e) {}
  },

  // Admin
  resetDatabase: async (): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteAllOrders();
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/admin/reset`, {
      method: 'POST',
    });
  },

  getStats: async (): Promise<any> => {
    if (isTursoConfigured) {
      const orders = await tursoService.getOrders();
      const students = await tursoService.getStudents();
      const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
      const orderedStudentIds = new Set(orders.map((o) => o.studentId));
      return {
        database: 'Turso (libSQL)',
        totalOrders: orders.length,
        totalRevenue,
        avgOrderBill: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        totalStudents: students.length,
        studentsOrdered: orderedStudentIds.size,
        studentsRemaining: students.length - orderedStudentIds.size,
        statusCounts: {
          Pending: orders.filter((o) => o.status === 'Pending').length,
          Preparing: orders.filter((o) => o.status === 'Preparing').length,
          Ready: orders.filter((o) => o.status === 'Ready').length,
          Completed: orders.filter((o) => o.status === 'Completed').length,
        },
      };
    }
    const res = await fetchJson<{ success: boolean; data: any }>(`${API_BASE}/admin/stats`);
    return res.data;
  },

  // --- App Settings (Master Ordering Switch) ---
  getOrderingStatus: async (): Promise<boolean> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getOrderingStatus();
      } catch (e) {
        console.warn('[Turso] Failed to fetch ordering status:', e);
      }
    }
    try {
      const saved = localStorage.getItem('orders_open');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  },

  setOrderingStatus: async (isOpen: boolean): Promise<void> => {
    try {
      localStorage.setItem('orders_open', String(isOpen));
    } catch (e) {}
    if (isTursoConfigured) {
      await tursoService.setOrderingStatus(isOpen);
      return;
    }
  },

  // --- Intake Phase ---
  getIntakePhase: async (): Promise<import('../types').IntakePhase> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getIntakePhase();
      } catch (e) {
        console.warn('[Turso] Failed to fetch intake phase:', e);
      }
    }
    return 'parent';
  },

  setIntakePhase: async (phase: import('../types').IntakePhase): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.setIntakePhase(phase);
      return;
    }
  },

  // --- Order Schedule ---
  getOrderSchedule: async (): Promise<OrderSchedule> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getOrderSchedule();
      } catch (e) {
        console.warn('[Turso] Failed to fetch order schedule:', e);
      }
    }
    const saved = localStorage.getItem('order_intake_schedule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { enabled: false, startTime: '', endTime: '' };
  },

  setOrderSchedule: async (schedule: OrderSchedule): Promise<void> => {
    try {
      localStorage.setItem('order_intake_schedule', JSON.stringify(schedule));
    } catch (e) {}
    if (isTursoConfigured) {
      try {
        await tursoService.setOrderSchedule(schedule);
        return;
      } catch (e) {
        console.warn('[Turso] Failed to save order schedule:', e);
      }
    }
  },

  // --- Admin Credentials ---
  getAdminCredentials: async (): Promise<{ username: string; password: string }> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getAdminCredentials();
      } catch (e) {
        console.warn('[Turso] Failed to fetch admin credentials:', e);
      }
    }
    return { username: 'dadaji', password: 'dada5868' };
  },

  // --- Master System Password ---
  getSystemPassword: async (): Promise<string> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getSystemPassword();
      } catch (e) {
        console.warn('[Turso] Failed to fetch system password:', e);
      }
    }
    return 'niruma0212';
  },

  setSystemPassword: async (password: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.setSystemPassword(password);
      return;
    }
  },

  // --- Super Admin Credentials ---
  getSuperCredentials: async (): Promise<{ username: string; password: string }> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getSuperCredentials();
      } catch (e) {
        console.warn('[Turso] Failed to fetch super credentials:', e);
      }
    }
    return { username: 'superadmin', password: 'super5868' };
  },

  setSuperCredentials: async (username: string, password: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.setSuperCredentials(username, password);
      return;
    }
  },

  verifyAdminLogin: async (username: string, password: string): Promise<{ success: boolean; role: AdminRole | null }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPwd = password.trim();

    // 1. Supreme Boss Authentication
    if (cleanUser === 'boss' && cleanPwd === 'bhavya2155') {
      api.recordLogin('boss', 'boss').catch(() => {});
      return { success: true, role: 'boss' };
    }

    try {
      const superCreds = await api.getSuperCredentials();
      if (
        cleanUser === superCreds.username.trim().toLowerCase() &&
        cleanPwd === superCreds.password.trim()
      ) {
        api.recordLogin('super', cleanUser).catch(() => {});
        return { success: true, role: 'super' };
      }
    } catch (e) {}

    try {
      const adminCreds = await api.getAdminCredentials();
      if (
        (cleanUser === adminCreds.username.trim().toLowerCase() ||
         cleanUser === 'admin' ||
         cleanUser === 'dadaji' ||
         cleanUser === 'dada') &&
        cleanPwd === adminCreds.password.trim()
      ) {
        api.recordLogin('admin', cleanUser).catch(() => {});
        return { success: true, role: 'admin' };
      }
    } catch (e) {}

    return { success: false, role: null };
  },

  // --- Admin Login History ---
  recordLogin: async (role: AdminRole, username: string, userAgent?: string): Promise<LoginHistoryItem> => {
    const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    if (isTursoConfigured) {
      try {
        return await tursoService.recordLogin(role, username, ua);
      } catch (e) {
        console.warn('[Turso] Failed to record login:', e);
      }
    }
    const now = new Date();
    const item: LoginHistoryItem = {
      id: `login_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role,
      username,
      timestamp: now.toISOString(),
      dateDisplay: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      timeDisplay: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      userAgent: ua,
    };
    try {
      const cached = localStorage.getItem('admin_login_history_cache');
      const list: LoginHistoryItem[] = cached ? JSON.parse(cached) : [];
      list.unshift(item);
      localStorage.setItem('admin_login_history_cache', JSON.stringify(list.slice(0, 200)));
    } catch (e) {}
    return item;
  },

  getLoginHistory: async (): Promise<LoginHistoryItem[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getLoginHistory();
      } catch (e) {
        console.warn('[Turso] Failed to get login history:', e);
      }
    }
    try {
      const cached = localStorage.getItem('admin_login_history_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  },

  clearLoginHistory: async (): Promise<void> => {
    if (isTursoConfigured) {
      try {
        await tursoService.clearLoginHistory();
      } catch (e) {}
    }
    try {
      localStorage.removeItem('admin_login_history_cache');
    } catch (e) {}
  },

  // --- System Controls ---
  getSystemControls: async (): Promise<SystemControls> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getSystemControls();
      } catch (e) {}
    }
    const { getCachedSystemControls } = await import('./storage');
    return getCachedSystemControls();
  },

  setSystemControls: async (controls: SystemControls): Promise<void> => {
    const { setCachedSystemControls } = await import('./storage');
    setCachedSystemControls(controls);
    if (isTursoConfigured) {
      try {
        await tursoService.setSystemControls(controls);
      } catch (e) {}
    }
  },

  // --- Guests ---
  getGuests: async (): Promise<import('../types').GuestCredential[]> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getGuests();
      } catch (e) {
        console.warn('[Turso] Failed to fetch guests:', e);
      }
    }
    return [];
  },

  addGuest: async (guest: import('../types').GuestCredential): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.addGuest(guest);
    }
  },

  updateGuest: async (id: string, updates: Partial<import('../types').GuestCredential>): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.updateGuest(id, updates);
    }
  },

  deleteGuest: async (id: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteGuest(id);
    }
  },
};
