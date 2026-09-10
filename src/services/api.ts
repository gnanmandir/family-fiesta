import { FoodItem, Order, OrderStatus, Student } from '../types';
import { tursoService, isTursoConfigured } from './turso';
import { supabaseService, isSupabaseConfigured } from './supabase';

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
        console.warn('[Turso] Failed to fetch students, trying fallback:', e);
      }
    }
    if (isSupabaseConfigured) {
      try {
        return await supabaseService.getStudents();
      } catch (e) {
        console.warn('[Supabase] Failed to fetch students, trying fallback:', e);
      }
    }
    const res = await fetchJson<{ success: boolean; data: Student[] }>(`${API_BASE}/students`);
    return res.data;
  },

  getStudentById: async (id: string): Promise<Student> => {
    if (isTursoConfigured) {
      const all = await tursoService.getStudents();
      const found = all.find((s) => s.id.toLowerCase() === id.toLowerCase());
      if (found) return found;
    }
    if (isSupabaseConfigured) {
      const all = await supabaseService.getStudents();
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
    if (isSupabaseConfigured) {
      try {
        return await supabaseService.getMenuItems();
      } catch (e) {
        console.warn('[Supabase] Failed to fetch menu, trying fallback:', e);
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
    if (isSupabaseConfigured) {
      try {
        const existing = await supabaseService.getMenuItems();
        const incomingIds = new Set(items.map((i) => i.id));
        for (const ex of existing) {
          if (!incomingIds.has(ex.id)) {
            await supabaseService.deleteMenuItem(ex.id);
          }
        }
      } catch (e) {
        console.warn('Error syncing deleted menu items with Supabase:', e);
      }
      for (const item of items) {
        await supabaseService.saveMenuItem(item);
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
    if (isSupabaseConfigured) {
      return await supabaseService.saveMenuItem(item);
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
    if (isSupabaseConfigured) {
      return await supabaseService.updateMenuItem(id, updates);
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
    if (isSupabaseConfigured) {
      const items = await supabaseService.getMenuItems();
      const target = items.find((i) => i.id === id);
      if (target) {
        return await supabaseService.updateMenuItem(id, { isAvailable: !target.isAvailable });
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
    if (isSupabaseConfigured) {
      await supabaseService.deleteMenuItem(id);
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
    if (isSupabaseConfigured) {
      try {
        return await supabaseService.getOrders();
      } catch (e) {
        console.warn('[Supabase] Failed to fetch orders, trying fallback:', e);
      }
    }
    const res = await fetchJson<{ success: boolean; data: Order[] }>(`${API_BASE}/orders`);
    return res.data;
  },

  getOrderByStudent: async (studentId: string): Promise<Order | null> => {
    if (isTursoConfigured) {
      try {
        return await tursoService.getOrderByStudent(studentId);
      } catch (e) {}
    }
    if (isSupabaseConfigured) {
      try {
        return await supabaseService.getOrderByStudent(studentId);
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
    if (isSupabaseConfigured) {
      try {
        return await supabaseService.getOrderByDevice(deviceId);
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
    if (isSupabaseConfigured) {
      return await supabaseService.placeOrder(orderPayload as Order);
    }
    const res = await fetchJson<{ success: boolean; data: Order }>(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
    return res.data;
  },

  updateOrder: async (orderNumber: string, orderPayload: Partial<Order>): Promise<Order> => {
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
    if (isSupabaseConfigured) {
      await supabaseService.updateOrderStatus(orderNumber, status);
      const orders = await supabaseService.getOrders();
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
    if (isSupabaseConfigured) {
      await supabaseService.deleteOrder(orderNumber);
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}`, {
      method: 'DELETE',
    });
  },

  deleteCompletedOrders: async (): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.deleteCompletedOrders();
      return;
    }
    if (isSupabaseConfigured) {
      await supabaseService.deleteCompletedOrders();
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
    if (isSupabaseConfigured) {
      await supabaseService.deleteAllOrders();
      return;
    }
    await fetchJson<{ success: boolean }>(`${API_BASE}/orders`, {
      method: 'DELETE',
    });
  },

  clearDeviceLock: async (deviceId: string): Promise<void> => {
    if (isTursoConfigured) {
      await tursoService.clearDeviceLock(deviceId);
      return;
    }
    if (isSupabaseConfigured) {
      await supabaseService.clearDeviceLock(deviceId);
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
    if (isSupabaseConfigured) {
      await supabaseService.deleteAllOrders();
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
    if (isSupabaseConfigured) {
      const orders = await supabaseService.getOrders();
      const students = await supabaseService.getStudents();
      const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
      const orderedStudentIds = new Set(orders.map((o) => o.studentId));
      return {
        database: 'Supabase PostgreSQL',
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
    if (isSupabaseConfigured) {
      try {
        return await supabaseService.getOrderingStatus();
      } catch (e) {
        console.warn('[Supabase] Failed to fetch ordering status:', e);
      }
    }
    // Default: orders are open
    return true;
  },

  setOrderingStatus: async (isOpen: boolean): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseService.setOrderingStatus(isOpen);
      return;
    }
  },
};
