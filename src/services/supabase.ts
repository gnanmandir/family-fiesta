import { FoodItem, Order, OrderStatus, Student } from '../types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

async function supabaseFetch<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-cache', ...options, headers });
      if (!res.ok) {
        if ([429, 502, 503, 504].includes(res.status) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        let errorText = `Supabase Error (${res.status}): ${res.statusText}`;
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) errorText = errJson.message;
        } catch (e) {}
        throw new Error(errorText);
      }

      const text = await res.text();
      return text ? JSON.parse(text) : (null as any);
    } catch (err: any) {
      if (attempt < retries && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network'))) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Supabase request failed after retries');
}

export const supabaseService = {
  // --- Students ---
  getStudents: async (): Promise<Student[]> => {
    const rows = await supabaseFetch<any[]>('students?select=*&order=first_name.asc');
    return rows.map((r) => ({
      id: r.id,
      gmNo: r.gm_no,
      firstName: r.first_name,
      parentName: r.parent_name,
      fullName: r.full_name,
      grade: r.grade || 'Gurukul Roster',
      birthDate: r.birth_date,
    }));
  },

  saveStudent: async (student: Student): Promise<Student> => {
    const payload = {
      id: student.id,
      gm_no: student.gmNo,
      first_name: student.firstName,
      parent_name: student.parentName,
      full_name: student.fullName,
      grade: student.grade,
      birth_date: student.birthDate,
    };
    await supabaseFetch('students?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload),
    });
    return student;
  },

  // --- Menu Items ---
  getMenuItems: async (): Promise<FoodItem[]> => {
    const rows = await supabaseFetch<any[]>('menu_items?select=*&order=id.asc');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description || '',
      price: Number(r.price),
      image: r.image,
      isVeg: r.is_veg !== undefined ? r.is_veg : true,
      isChefSpecial: Boolean(r.is_chef_special),
      isAvailable: r.is_available !== undefined ? r.is_available : true,
      portionValue: r.portion_value ? Number(r.portion_value) : undefined,
      portionUnit: (r.portion_unit as any) || undefined,
    }));
  },

  saveMenuItem: async (item: Partial<FoodItem>): Promise<FoodItem> => {
    const basePayload: any = {
      id: item.id || `FOOD-${Math.floor(100 + Math.random() * 900)}`,
      name: item.name,
      category: item.category,
      description: item.description || '',
      price: item.price,
      image: item.image,
      is_veg: item.isVeg !== undefined ? item.isVeg : true,
      is_chef_special: Boolean(item.isChefSpecial),
      is_available: item.isAvailable !== undefined ? item.isAvailable : true,
    };

    const extendedPayload = {
      ...basePayload,
      ...(item.portionValue !== undefined ? { portion_value: item.portionValue } : {}),
      ...(item.portionUnit ? { portion_unit: item.portionUnit } : {}),
    };

    let r: any;
    try {
      const res = await supabaseFetch<any[]>('menu_items?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(extendedPayload),
      });
      r = res[0] || extendedPayload;
    } catch (e) {
      // Fallback without portion columns if remote DB schema doesn't have them yet
      const res = await supabaseFetch<any[]>('menu_items?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(basePayload),
      });
      r = res[0] || basePayload;
    }

    return {
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      price: Number(r.price),
      image: r.image,
      isVeg: r.is_veg,
      isChefSpecial: r.is_chef_special,
      isAvailable: r.is_available,
      portionValue: item.portionValue,
      portionUnit: item.portionUnit,
    };
  },

  updateMenuItem: async (id: string, updates: Partial<FoodItem>): Promise<FoodItem> => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.isVeg !== undefined) payload.is_veg = updates.isVeg;
    if (updates.isChefSpecial !== undefined) payload.is_chef_special = updates.isChefSpecial;
    if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;

    const res = await supabaseFetch<any[]>(`menu_items?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const r = res[0] || updates;
    return {
      id,
      name: r.name,
      category: r.category,
      description: r.description,
      price: Number(r.price),
      image: r.image,
      isVeg: r.is_veg,
      isChefSpecial: r.is_chef_special,
      isAvailable: r.is_available,
    };
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await supabaseFetch(`menu_items?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // --- Orders ---
  getOrders: async (): Promise<Order[]> => {
    const rows = await supabaseFetch<any[]>('orders?select=*&order=created_at.desc');
    return rows.map((r) => ({
      orderNumber: r.order_number,
      studentId: r.student_id,
      studentName: r.student_name,
      parentName: r.parent_name || '',
      fullName: r.full_name || '',
      deviceId: r.device_id,
      peopleCount: Number(r.people_count) || 1,
      allowedBudget: Number(r.allowed_budget),
      items: r.items || [],
      totalAmount: Number(r.total_amount),
      status: r.status as OrderStatus,
      createdAt: r.created_at,
      dateDisplay: r.date_display || '',
      timeDisplay: r.time_display || '',
    }));
  },

  getOrderByStudent: async (studentId: string): Promise<Order | null> => {
    const rows = await supabaseFetch<any[]>(
      `orders?student_id=eq.${encodeURIComponent(studentId)}&select=*&limit=1`
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      orderNumber: r.order_number,
      studentId: r.student_id,
      studentName: r.student_name,
      parentName: r.parent_name || '',
      fullName: r.full_name || '',
      deviceId: r.device_id,
      peopleCount: Number(r.people_count) || 1,
      allowedBudget: Number(r.allowed_budget),
      items: r.items || [],
      totalAmount: Number(r.total_amount),
      status: r.status as OrderStatus,
      createdAt: r.created_at,
      dateDisplay: r.date_display || '',
      timeDisplay: r.time_display || '',
    };
  },

  getOrderByDevice: async (deviceId: string): Promise<Order | null> => {
    const rows = await supabaseFetch<any[]>(
      `orders?device_id=eq.${encodeURIComponent(deviceId)}&select=*&order=created_at.desc&limit=1`
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      orderNumber: r.order_number,
      studentId: r.student_id,
      studentName: r.student_name,
      parentName: r.parent_name || '',
      fullName: r.full_name || '',
      deviceId: r.device_id,
      peopleCount: Number(r.people_count) || 1,
      allowedBudget: Number(r.allowed_budget),
      items: r.items || [],
      totalAmount: Number(r.total_amount),
      status: r.status as OrderStatus,
      createdAt: r.created_at,
      dateDisplay: r.date_display || '',
      timeDisplay: r.time_display || '',
    };
  },

  placeOrder: async (order: Order): Promise<Order> => {
    const payload = {
      order_number: order.orderNumber,
      student_id: order.studentId,
      student_name: order.studentName,
      parent_name: order.parentName || '',
      full_name: order.fullName || '',
      device_id: order.deviceId,
      people_count: order.peopleCount,
      allowed_budget: order.allowedBudget,
      items: order.items,
      total_amount: order.totalAmount,
      status: order.status || 'Pending',
      created_at: order.createdAt || new Date().toISOString(),
      date_display: order.dateDisplay || '',
      time_display: order.timeDisplay || '',
    };

    await supabaseFetch('orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Save device lock
    if (order.deviceId) {
      await supabaseFetch('device_locks?on_conflict=device_id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          device_id: order.deviceId,
          student_id: order.studentId,
          student_name: order.studentName,
          order_number: order.orderNumber,
          order_date: order.createdAt,
        }),
      }).catch(() => {});
    }

    return order;
  },

  updateOrder: async (orderNumber: string, orderPayload: Partial<Order>): Promise<Order> => {
    const payload: any = {};
    if (orderPayload.peopleCount !== undefined) payload.people_count = orderPayload.peopleCount;
    if (orderPayload.allowedBudget !== undefined) payload.allowed_budget = orderPayload.allowedBudget;
    if (orderPayload.items !== undefined) payload.items = orderPayload.items;
    if (orderPayload.totalAmount !== undefined) payload.total_amount = orderPayload.totalAmount;

    await supabaseFetch(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const rows = await supabaseFetch<any[]>(
      `orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*`
    );
    const r = rows[0];

    // Safety check: verify if the update actually applied
    if (r.total_amount !== payload.total_amount && payload.total_amount !== undefined) {
      alert("WARNING: Supabase received the edit request but refused to update the database row. This is almost certainly because your Supabase 'orders' table is missing an UPDATE Row Level Security (RLS) policy.");
    }

    return {
      orderNumber: r.order_number,
      studentId: r.student_id,
      studentName: r.student_name,
      parentName: r.parent_name || '',
      fullName: r.full_name || '',
      deviceId: r.device_id,
      peopleCount: Number(r.people_count) || 1,
      allowedBudget: Number(r.allowed_budget),
      items: r.items || [],
      totalAmount: Number(r.total_amount),
      status: r.status as OrderStatus,
      createdAt: r.created_at,
      dateDisplay: r.date_display || '',
      timeDisplay: r.time_display || '',
    };
  },

  updateOrderStatus: async (orderNumber: string, status: OrderStatus): Promise<void> => {
    await supabaseFetch(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteOrder: async (orderNumber: string): Promise<void> => {
    await supabaseFetch(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
      method: 'DELETE',
    });
  },

  deleteCompletedOrders: async (): Promise<void> => {
    await supabaseFetch('orders?status=eq.Completed', {
      method: 'DELETE',
    });
  },

  deleteAllOrders: async (): Promise<void> => {
    // 1. Fetch all orders to delete individually (most reliable against PostgREST filters)
    try {
      const existing = await supabaseFetch<any[]>('orders?select=order_number');
      if (existing && existing.length > 0) {
        await Promise.all(
          existing.map((o) =>
            supabaseFetch(`orders?order_number=eq.${encodeURIComponent(o.order_number)}`, {
              method: 'DELETE',
            }).catch((err) => console.warn('Individual order delete failed:', err))
          )
        );
      }
    } catch (e) {
      console.warn('Failed to fetch orders for individual deletion:', e);
    }

    // 2. Also attempt bulk delete
    try {
      await supabaseFetch('orders?order_number=not.is.null', {
        method: 'DELETE',
      });
    } catch (e) {}

    // 3. Delete all device locks
    try {
      await supabaseFetch('device_locks?device_id=not.is.null', {
        method: 'DELETE',
      });
    } catch (e) {}
  },

  clearDeviceLock: async (deviceId: string): Promise<void> => {
    await supabaseFetch(`device_locks?device_id=eq.${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    }).catch(() => {});
  },

  // --- App Settings (Master Ordering Switch) ---
  getOrderingStatus: async (): Promise<boolean> => {
    try {
      const rows = await supabaseFetch<any[]>('app_settings?key=eq.orders_open&select=value');
      if (rows && rows.length > 0) {
        return rows[0].value === 'true';
      }
    } catch (e) {
      // Table may not exist yet, default to open
    }
    return true; // default: orders open
  },

  setOrderingStatus: async (isOpen: boolean): Promise<void> => {
    await supabaseFetch<any[]>('app_settings?on_conflict=key', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ key: 'orders_open', value: String(isOpen) }),
    });
  },

  getAdminCredentials: async (): Promise<{username: string, password: string}> => {
    try {
      const rows = await supabaseFetch<any[]>('app_settings?key=in.(admin_username,admin_password)&select=*');
      if (rows && rows.length > 0) {
        let username = 'dada';
        let password = 'dada58';
        rows.forEach(r => {
          if (r.key === 'admin_username') username = r.value;
          if (r.key === 'admin_password') password = r.value;
        });
        return { username, password };
      }
    } catch (e) {
      // ignore
    }
    return { username: 'dada', password: 'dada58' };
  },

  setAdminCredentials: async (username: string, password: string): Promise<void> => {
    await supabaseFetch('app_settings?on_conflict=key', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: 'admin_username', value: username }),
    });
    await supabaseFetch('app_settings?on_conflict=key', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: 'admin_password', value: password }),
    });
  },

  getGuestTiers: async (): Promise<number[]> => {
    try {
      const rows = await supabaseFetch<any[]>('app_settings?key=eq.guest_tiers&select=value');
      if (rows && rows.length > 0) {
        return JSON.parse(rows[0].value);
      }
    } catch (e) {
      // ignore
    }
    return [220, 220, 160, 70]; // Default fallback
  },

  setGuestTiers: async (tiers: number[]): Promise<void> => {
    await supabaseFetch('app_settings?on_conflict=key', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: 'guest_tiers', value: JSON.stringify(tiers) }),
    });
  },
};
