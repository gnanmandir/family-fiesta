import { FoodItem, Order, OrderStatus, Student } from '../types';

let TURSO_URL = (import.meta.env.VITE_TURSO_DATABASE_URL || '').trim();
if (TURSO_URL.startsWith('libsql://')) {
  TURSO_URL = TURSO_URL.replace('libsql://', 'https://');
}
TURSO_URL = TURSO_URL.replace(/\/+$/, '');

const TURSO_TOKEN = (import.meta.env.VITE_TURSO_AUTH_TOKEN || '').trim();

export const isTursoConfigured = Boolean(TURSO_URL && TURSO_TOKEN);

interface TursoArg {
  type: 'text' | 'integer' | 'float' | 'null';
  value?: string;
}

function formatArg(val: any): TursoArg {
  if (val === null || val === undefined) return { type: 'null' };
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? { type: 'integer', value: String(val) }
      : { type: 'float', value: String(val) };
  }
  if (typeof val === 'boolean') {
    return { type: 'integer', value: val ? '1' : '0' };
  }
  return { type: 'text', value: String(val) };
}

async function tursoQuery<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const url = `${TURSO_URL}/v2/pipeline`;
  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: args.map(formatArg),
        },
      },
      { type: 'close' },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errText = `Turso HTTP Error (${res.status}): ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.message) errText = errJson.message;
    } catch (e) {}
    throw new Error(errText);
  }

  const data = await res.json();
  const execResult = data?.results?.[0];

  if (execResult?.type === 'error') {
    throw new Error(execResult.error?.message || 'Turso execution error');
  }

  const resultObj = execResult?.response?.result;
  if (!resultObj || !resultObj.cols) return [];

  const cols = resultObj.cols.map((c: any) => c.name);
  const rows = resultObj.rows || [];

  return rows.map((row: any[]) => {
    const obj: any = {};
    cols.forEach((colName: string, idx: number) => {
      const cell = row[idx];
      obj[colName] = cell?.value !== undefined ? cell.value : null;
    });
    return obj as T;
  });
}

export const tursoService = {
  // --- Students ---
  getStudents: async (): Promise<Student[]> => {
    const rows = await tursoQuery('SELECT * FROM students ORDER BY first_name ASC');
    return rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      parentName: r.parent_name,
      fullName: r.full_name,
      grade: r.grade || 'Gurukul Roster',
      birthDate: r.birth_date,
    }));
  },

  // --- Menu ---
  getMenuItems: async (): Promise<FoodItem[]> => {
    const rows = await tursoQuery('SELECT * FROM menu_items ORDER BY id ASC');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description || '',
      price: Number(r.price),
      image: r.image,
      isVeg: r.is_veg === '1' || r.is_veg === 1,
      isChefSpecial: r.is_chef_special === '1' || r.is_chef_special === 1,
      isAvailable: r.is_available === '1' || r.is_available === 1,
      portionValue: r.portion_value ? Number(r.portion_value) : undefined,
      portionUnit: (r.portion_unit as any) || undefined,
    }));
  },

  saveMenuItem: async (item: Partial<FoodItem>): Promise<FoodItem> => {
    const id = item.id || `FOOD-${Math.floor(100 + Math.random() * 900)}`;
    const isVeg = item.isVeg !== undefined ? (item.isVeg ? 1 : 0) : 1;
    const isChef = item.isChefSpecial ? 1 : 0;
    const isAvail = item.isAvailable !== undefined ? (item.isAvailable ? 1 : 0) : 1;
    const portionVal = item.portionValue !== undefined && item.portionValue !== null ? Number(item.portionValue) : null;
    const portionUn = item.portionUnit || null;

    try {
      await tursoQuery(
        `INSERT INTO menu_items (id, name, category, description, price, image, is_veg, is_chef_special, is_available, portion_value, portion_unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           category = excluded.category,
           description = excluded.description,
           price = excluded.price,
           image = excluded.image,
           is_veg = excluded.is_veg,
           is_chef_special = excluded.is_chef_special,
           is_available = excluded.is_available,
           portion_value = excluded.portion_value,
           portion_unit = excluded.portion_unit`,
        [id, item.name, item.category, item.description || '', item.price, item.image, isVeg, isChef, isAvail, portionVal, portionUn]
      );
    } catch (e) {
      // Fallback if table doesn't have portion columns yet
      await tursoQuery(
        `INSERT INTO menu_items (id, name, category, description, price, image, is_veg, is_chef_special, is_available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           category = excluded.category,
           description = excluded.description,
           price = excluded.price,
           image = excluded.image,
           is_veg = excluded.is_veg,
           is_chef_special = excluded.is_chef_special,
           is_available = excluded.is_available`,
        [id, item.name, item.category, item.description || '', item.price, item.image, isVeg, isChef, isAvail]
      );
    }

    return {
      id,
      name: item.name!,
      category: item.category!,
      description: item.description || '',
      price: Number(item.price),
      image: item.image!,
      isVeg: Boolean(isVeg),
      isChefSpecial: Boolean(isChef),
      isAvailable: Boolean(isAvail),
      portionValue: item.portionValue,
      portionUnit: item.portionUnit,
    };
  },

  updateMenuItem: async (id: string, updates: Partial<FoodItem>): Promise<FoodItem> => {
    const items = await tursoService.getMenuItems();
    const existing = items.find((i) => i.id === id);
    const updated = { ...existing, ...updates, id };
    return tursoService.saveMenuItem(updated);
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await tursoQuery('DELETE FROM menu_items WHERE id = ?', [id]);
  },

  // --- Orders ---
  getOrders: async (): Promise<Order[]> => {
    const rows = await tursoQuery('SELECT * FROM orders ORDER BY created_at DESC');
    return rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(r.items || '[]');
      } catch (e) {}
      return {
        orderNumber: r.order_number,
        studentId: r.student_id,
        studentName: r.student_name,
        parentName: r.parent_name || '',
        fullName: r.full_name || '',
        deviceId: r.device_id,
        peopleCount: Number(r.people_count) || 1,
        allowedBudget: Number(r.allowed_budget),
        items: parsedItems,
        totalAmount: Number(r.total_amount),
        status: r.status as OrderStatus,
        createdAt: r.created_at,
        dateDisplay: r.date_display || '',
        timeDisplay: r.time_display || '',
      };
    });
  },

  getOrderByStudent: async (studentId: string): Promise<Order | null> => {
    const rows = await tursoQuery('SELECT * FROM orders WHERE student_id = ? LIMIT 1', [studentId]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    let items = [];
    try { items = JSON.parse(r.items || '[]'); } catch (e) {}
    return {
      orderNumber: r.order_number,
      studentId: r.student_id,
      studentName: r.student_name,
      parentName: r.parent_name || '',
      fullName: r.full_name || '',
      deviceId: r.device_id,
      peopleCount: Number(r.people_count) || 1,
      allowedBudget: Number(r.allowed_budget),
      items,
      totalAmount: Number(r.total_amount),
      status: r.status as OrderStatus,
      createdAt: r.created_at,
      dateDisplay: r.date_display || '',
      timeDisplay: r.time_display || '',
    };
  },

  getOrderByDevice: async (deviceId: string): Promise<Order | null> => {
    const rows = await tursoQuery('SELECT * FROM orders WHERE device_id = ? ORDER BY created_at DESC LIMIT 1', [deviceId]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    let items = [];
    try { items = JSON.parse(r.items || '[]'); } catch (e) {}
    return {
      orderNumber: r.order_number,
      studentId: r.student_id,
      studentName: r.student_name,
      parentName: r.parent_name || '',
      fullName: r.full_name || '',
      deviceId: r.device_id,
      peopleCount: Number(r.people_count) || 1,
      allowedBudget: Number(r.allowed_budget),
      items,
      totalAmount: Number(r.total_amount),
      status: r.status as OrderStatus,
      createdAt: r.created_at,
      dateDisplay: r.date_display || '',
      timeDisplay: r.time_display || '',
    };
  },

  placeOrder: async (order: Order): Promise<Order> => {
    const itemsJson = JSON.stringify(order.items || []);
    await tursoQuery(
      `INSERT INTO orders (order_number, student_id, student_name, parent_name, full_name, device_id, people_count, allowed_budget, items, total_amount, status, created_at, date_display, time_display)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.orderNumber,
        order.studentId,
        order.studentName,
        order.parentName || '',
        order.fullName || '',
        order.deviceId,
        order.peopleCount,
        order.allowedBudget,
        itemsJson,
        order.totalAmount,
        order.status || 'Pending',
        order.createdAt || new Date().toISOString(),
        order.dateDisplay || '',
        order.timeDisplay || '',
      ]
    );

    if (order.deviceId) {
      await tursoQuery(
        `INSERT OR REPLACE INTO device_locks (device_id, student_id, student_name, order_number, order_date)
         VALUES (?, ?, ?, ?, ?)`,
        [order.deviceId, order.studentId, order.studentName, order.orderNumber, order.createdAt]
      ).catch(() => {});
    }

    return order;
  },

  updateOrderStatus: async (orderNumber: string, status: OrderStatus): Promise<void> => {
    await tursoQuery('UPDATE orders SET status = ? WHERE order_number = ?', [status, orderNumber]);
  },

  deleteOrder: async (orderNumber: string): Promise<void> => {
    await tursoQuery('DELETE FROM orders WHERE order_number = ?', [orderNumber]);
  },

  deleteCompletedOrders: async (): Promise<void> => {
    await tursoQuery("DELETE FROM orders WHERE status = 'Completed'");
  },

  deleteAllOrders: async (): Promise<void> => {
    await tursoQuery('DELETE FROM orders');
    await tursoQuery('DELETE FROM device_locks').catch(() => {});
  },

  clearDeviceLock: async (deviceId: string): Promise<void> => {
    await tursoQuery('DELETE FROM device_locks WHERE device_id = ?', [deviceId]).catch(() => {});
  },
};
