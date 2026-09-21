import {
  FoodItem,
  Order,
  OrderStatus,
  Student,
  OrderSchedule,
  SystemControls,
  LoginHistoryItem,
  AdminRole,
  AdminActionType,
  AdminActivityLog,
  AdminPresence,
} from '../types';

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
    return rows.map((r) => {
      let gm = r.gm_no ? Number(r.gm_no) : undefined;
      if (!gm && r.id) {
        const m = String(r.id).match(/-(\d+)$/);
        if (m) gm = parseInt(m[1], 10);
      }
      if (!gm && r.full_name && String(r.full_name).toLowerCase() === 'bhavyaop') {
        gm = 999;
      }
      return {
        id: r.id,
        firstName: r.first_name,
        parentName: r.parent_name,
        fullName: r.full_name,
        grade: r.grade || 'Gurukul Roster',
        birthDate: r.birth_date,
        gmNo: gm,
      };
    });
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
        isEdited: Boolean(r.is_edited === 1 || r.is_edited === '1'),
        orderType: (r.order_type as any) || 'parent',
      };
    });
  },

  getOrderByStudent: async (studentId: string, role?: string): Promise<Order | null> => {
    let sql = 'SELECT * FROM orders WHERE student_id = ?';
    const args: any[] = [studentId];
    if (role) {
      sql += ' AND order_type = ?';
      args.push(role);
    }
    sql += ' ORDER BY created_at DESC LIMIT 1';
    const rows = await tursoQuery(sql, args);
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
      isEdited: Boolean(r.is_edited === 1 || r.is_edited === '1'),
      orderType: (r.order_type as any) || 'parent',
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
      isEdited: Boolean(r.is_edited === 1 || r.is_edited === '1'),
      orderType: (r.order_type as any) || 'parent',
    };
  },

  placeOrder: async (order: Order): Promise<Order> => {
    const itemsJson = JSON.stringify(order.items || []);
    await tursoQuery(
      `INSERT INTO orders (order_number, student_id, student_name, parent_name, full_name, device_id, people_count, allowed_budget, items, total_amount, status, created_at, date_display, time_display, order_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        order.orderType || 'parent',
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

  updateOrder: async (orderNumber: string, orderPayload: Partial<Order>): Promise<Order> => {
    const sets: string[] = [];
    const args: any[] = [];

    if (orderPayload.peopleCount !== undefined) {
      sets.push('people_count = ?');
      args.push(orderPayload.peopleCount);
    }
    if (orderPayload.allowedBudget !== undefined) {
      sets.push('allowed_budget = ?');
      args.push(orderPayload.allowedBudget);
    }
    if (orderPayload.items !== undefined) {
      sets.push('items = ?');
      args.push(JSON.stringify(orderPayload.items));
    }
    if (orderPayload.totalAmount !== undefined) {
      sets.push('total_amount = ?');
      args.push(orderPayload.totalAmount);
    }
    if (orderPayload.status !== undefined) {
      sets.push('status = ?');
      args.push(orderPayload.status);
    }
    if (orderPayload.dateDisplay !== undefined) {
      sets.push('date_display = ?');
      args.push(orderPayload.dateDisplay);
    }
    if (orderPayload.timeDisplay !== undefined) {
      sets.push('time_display = ?');
      args.push(orderPayload.timeDisplay);
    }
    if (orderPayload.createdAt !== undefined) {
      sets.push('created_at = ?');
      args.push(orderPayload.createdAt);
    }
    if (orderPayload.isEdited !== undefined) {
      sets.push('is_edited = ?');
      args.push(orderPayload.isEdited ? 1 : 0);
    }
    if (orderPayload.orderType !== undefined) {
      sets.push('order_type = ?');
      args.push(orderPayload.orderType);
    }

    if (sets.length > 0) {
      args.push(orderNumber);
      await tursoQuery(`UPDATE orders SET ${sets.join(', ')} WHERE order_number = ?`, args);
    }

    const rows = await tursoQuery('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
    if (rows && rows.length > 0) {
      const r = rows[0];
      let items: any[] = [];
      try {
        items = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
      } catch (e) {
        items = [];
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
        items,
        totalAmount: Number(r.total_amount),
        status: r.status as OrderStatus,
        createdAt: r.created_at,
        dateDisplay: r.date_display || '',
        timeDisplay: r.time_display || '',
        isEdited: Boolean(r.is_edited === 1 || r.is_edited === '1'),
        orderType: (r.order_type as any) || 'parent',
      };
    }

    return orderPayload as Order;
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

  deleteOrdersByRole: async (role: 'parent' | 'student' | 'guest' | 'staff'): Promise<void> => {
    let orderTypeCondition = "order_type = ?";
    let params: any[] = [role];
    if (role === 'parent') {
      orderTypeCondition = "(order_type = 'parent' OR order_type IS NULL OR order_type = '')";
      params = [];
    } else if (role === 'guest' || role === 'staff') {
      orderTypeCondition = "(order_type = 'guest' OR order_type = 'staff')";
      params = [];
    }

    await tursoQuery(
      `DELETE FROM device_locks WHERE order_number IN (SELECT order_number FROM orders WHERE ${orderTypeCondition})`,
      params
    ).catch(() => {});

    await tursoQuery(`DELETE FROM orders WHERE ${orderTypeCondition}`, params);
  },

  clearDeviceLock: async (deviceId: string): Promise<void> => {
    await tursoQuery('DELETE FROM device_locks WHERE device_id = ?', [deviceId]).catch(() => {});
  },

  wipeStudentOrder: async (studentId: string, studentFullName?: string, orderNumber?: string): Promise<void> => {
    if (orderNumber) {
      await tursoQuery('DELETE FROM orders WHERE order_number = ?', [orderNumber]).catch(() => {});
      await tursoQuery('DELETE FROM device_locks WHERE order_number = ?', [orderNumber]).catch(() => {});
    }
    if (studentId) {
      await tursoQuery('DELETE FROM orders WHERE student_id = ? OR LOWER(student_id) = LOWER(?)', [studentId, studentId]).catch(() => {});
      await tursoQuery('DELETE FROM device_locks WHERE student_id = ? OR LOWER(student_id) = LOWER(?)', [studentId, studentId]).catch(() => {});
    }
    if (studentFullName) {
      await tursoQuery('DELETE FROM orders WHERE full_name = ? OR LOWER(full_name) = LOWER(?)', [studentFullName, studentFullName]).catch(() => {});
      await tursoQuery('DELETE FROM orders WHERE student_name = ? OR LOWER(student_name) = LOWER(?)', [studentFullName, studentFullName]).catch(() => {});
    }
  },

  // --- Admin Credentials ---
  getAdminCredentials: async (): Promise<{ username: string; password: string }> => {
    const rows = await tursoQuery("SELECT key, value FROM app_settings WHERE key IN ('admin_username', 'admin_password')");
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    return {
      username: map['admin_username'] || 'dadaji',
      password: map['admin_password'] || 'dada5868',
    };
  },

  setAdminCredentials: async (username: string, password: string): Promise<void> => {
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('admin_username', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [username, new Date().toISOString()]
    );
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('admin_password', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [password, new Date().toISOString()]
    );
  },

  // --- Super Admin Credentials ---
  getSuperCredentials: async (): Promise<{ username: string; password: string }> => {
    const rows = await tursoQuery("SELECT key, value FROM app_settings WHERE key IN ('super_username', 'super_password')");
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    return {
      username: map['super_username'] || 'superadmin',
      password: map['super_password'] || 'super5868',
    };
  },

  setSuperCredentials: async (username: string, password: string): Promise<void> => {
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('super_username', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [username, new Date().toISOString()]
    );
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('super_password', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [password, new Date().toISOString()]
    );
  },

  // --- Role Tiers (Parent, Student, Staff / Guest) ---
  getAllRoleTiers: async (): Promise<{ parent: number[]; student: number[]; guest: number[] }> => {
    try {
      const rows = await tursoQuery<{ key: string; value: string }>(
        "SELECT key, value FROM app_settings WHERE key IN ('parent_tiers', 'student_tiers', 'guest_tiers', 'staff_tiers')"
      );
      const result = {
        parent: [230, 230, 140, 80],
        student: [230],
        guest: [230],
      };
      if (rows && rows.length > 0) {
        rows.forEach((r) => {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (r.key === 'parent_tiers') result.parent = parsed;
              if (r.key === 'student_tiers') result.student = parsed;
              if (r.key === 'guest_tiers' || r.key === 'staff_tiers') result.guest = parsed;
            }
          } catch (e) {}
        });
      }
      return result;
    } catch (e) {
      return {
        parent: [230, 230, 140, 80],
        student: [230],
        guest: [230],
      };
    }
  },

  getRoleTiers: async (role: 'parent' | 'student' | 'guest' | 'staff'): Promise<number[]> => {
    const keys = role === 'staff' || role === 'guest'
      ? "('guest_tiers', 'staff_tiers')"
      : role === 'parent'
      ? "('parent_tiers')"
      : "('student_tiers')";
    const rows = await tursoQuery<{ value: string }>(`SELECT value FROM app_settings WHERE key IN ${keys} ORDER BY updated_at DESC LIMIT 1`);
    if (rows && rows.length > 0 && rows[0].value) {
      try {
        const parsed = JSON.parse(rows[0].value);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (role === 'parent') return [230, 230, 140, 80];
    return [230];
  },

  setRoleTiers: async (role: 'parent' | 'student' | 'guest' | 'staff', tiers: number[]): Promise<void> => {
    const key = role === 'staff' ? 'staff_tiers' : `${role}_tiers`;
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, JSON.stringify(tiers), new Date().toISOString()]
    );
    if (role === 'staff' || role === 'guest') {
      // Sync both keys
      await tursoQuery(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('guest_tiers', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [JSON.stringify(tiers), new Date().toISOString()]
      );
      await tursoQuery(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('staff_tiers', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [JSON.stringify(tiers), new Date().toISOString()]
      );
    }
    if (role === 'parent') {
      await tursoQuery(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('parent_tiers', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [JSON.stringify(tiers), new Date().toISOString()]
      );
    }
  },

  getGuestTiers: async (): Promise<number[]> => {
    return await tursoService.getRoleTiers('parent');
  },

  setGuestTiers: async (tiers: number[]): Promise<void> => {
    await tursoService.setRoleTiers('parent', tiers);
  },

  // --- Save Student ---
  saveStudent: async (student: Student): Promise<Student> => {
    try {
      await tursoQuery(
        `INSERT INTO students (id, first_name, parent_name, full_name, grade, birth_date, gm_no)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           first_name = excluded.first_name,
           parent_name = excluded.parent_name,
           full_name = excluded.full_name,
           grade = excluded.grade,
           birth_date = excluded.birth_date,
           gm_no = excluded.gm_no`,
        [student.id, student.firstName, student.parentName, student.fullName, student.grade || 'Gurukul Roster', student.birthDate || null, student.gmNo || null]
      );
    } catch (err: any) {
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes('gm_no') || msg.includes('column')) {
        try {
          await tursoQuery(`ALTER TABLE students ADD COLUMN gm_no INTEGER`);
          await tursoQuery(
            `INSERT INTO students (id, first_name, parent_name, full_name, grade, birth_date, gm_no)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               first_name = excluded.first_name,
               parent_name = excluded.parent_name,
               full_name = excluded.full_name,
               grade = excluded.grade,
               birth_date = excluded.birth_date,
               gm_no = excluded.gm_no`,
            [student.id, student.firstName, student.parentName, student.fullName, student.grade || 'Gurukul Roster', student.birthDate || null, student.gmNo || null]
          );
        } catch (alterErr) {
          await tursoQuery(
            `INSERT INTO students (id, first_name, parent_name, full_name, grade, birth_date)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               first_name = excluded.first_name,
               parent_name = excluded.parent_name,
               full_name = excluded.full_name,
               grade = excluded.grade,
               birth_date = excluded.birth_date`,
            [student.id, student.firstName, student.parentName, student.fullName, student.grade || 'Gurukul Roster', student.birthDate || null]
          );
        }
      } else {
        throw err;
      }
    }

    // Keep existing student orders in sync with updated student name
    try {
      await tursoQuery(
        `UPDATE orders SET student_name = ?, full_name = ? WHERE student_id = ?`,
        [student.fullName, student.fullName, student.id]
      );
    } catch (e) {}

    return student;
  },

  deleteStudent: async (studentId: string, fullName?: string): Promise<void> => {
    await tursoQuery('DELETE FROM students WHERE id = ? OR LOWER(id) = LOWER(?)', [studentId, studentId]).catch(() => {});
    await tursoQuery('DELETE FROM orders WHERE student_id = ? OR LOWER(student_id) = LOWER(?)', [studentId, studentId]).catch(() => {});
    if (fullName) {
      await tursoQuery('DELETE FROM students WHERE full_name = ? OR LOWER(full_name) = LOWER(?)', [fullName, fullName]).catch(() => {});
      await tursoQuery('DELETE FROM orders WHERE full_name = ? OR LOWER(full_name) = LOWER(?)', [fullName, fullName]).catch(() => {});
      await tursoQuery('DELETE FROM orders WHERE student_name = ? OR LOWER(student_name) = LOWER(?)', [fullName, fullName]).catch(() => {});
    }
    await tursoQuery('DELETE FROM device_locks WHERE student_id = ? OR LOWER(student_id) = LOWER(?)', [studentId, studentId]).catch(() => {});
  },

  getDeletedStudents: async (): Promise<{ id: string; fullName: string; normalizedName: string }[]> => {
    try {
      const rows = await tursoQuery("SELECT value FROM app_settings WHERE key = 'deleted_students'");
      if (!rows || rows.length === 0) return [];
      const val = rows[0]?.value;
      if (!val) return [];
      return JSON.parse(val);
    } catch (e) {
      return [];
    }
  },

  addDeletedStudent: async (entry: { id: string; fullName: string; normalizedName: string }): Promise<void> => {
    try {
      const current = await tursoService.getDeletedStudents();
      const exists = current.some(
        (c) =>
          (entry.id && c.id?.toLowerCase() === entry.id.toLowerCase()) ||
          (entry.normalizedName && c.normalizedName === entry.normalizedName)
      );
      if (!exists) {
        current.push(entry);
        await tursoQuery(
          `INSERT INTO app_settings (key, value, updated_at) VALUES ('deleted_students', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [JSON.stringify(current), new Date().toISOString()]
        );
      }
    } catch (e) {}
  },

  removeDeletedStudent: async (studentId: string, fullName?: string): Promise<void> => {
    try {
      const current = await tursoService.getDeletedStudents();
      const norm = fullName ? fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      const updated = current.filter(
        (c) =>
          c.id?.toLowerCase() !== studentId.toLowerCase() &&
          (!norm || c.normalizedName !== norm)
      );
      await tursoQuery(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('deleted_students', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [JSON.stringify(updated), new Date().toISOString()]
      );
    } catch (e) {}
  },

  // --- Ordering Status ---
  getOrderingStatus: async (): Promise<boolean> => {
    const rows = await tursoQuery("SELECT value FROM app_settings WHERE key = 'orders_open'");
    if (!rows || rows.length === 0) return true;
    const val = rows[0]?.value;
    return val === 'true' || val === true || val === 1 || val === '1';
  },

  setOrderingStatus: async (isOpen: boolean): Promise<void> => {
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('orders_open', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [isOpen ? 'true' : 'false', new Date().toISOString()]
    );
  },

  // --- Intake Phase ---
  getIntakePhase: async (): Promise<import('../types').IntakePhase> => {
    const rows = await tursoQuery("SELECT value FROM app_settings WHERE key = 'intake_phase'");
    if (!rows || rows.length === 0) return 'parent';
    const val = rows[0]?.value;
    return (val as import('../types').IntakePhase) || 'parent';
  },

  setIntakePhase: async (phase: import('../types').IntakePhase): Promise<void> => {
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('intake_phase', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [phase, new Date().toISOString()]
    );
  },

  // --- Order Schedule ---
  getOrderSchedule: async (): Promise<OrderSchedule> => {
    const rows = await tursoQuery<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings WHERE key IN ('order_schedule_enabled', 'order_schedule_start', 'order_schedule_end')"
    );
    const schedule: OrderSchedule = {
      enabled: false,
      startTime: '',
      endTime: '',
    };
    if (rows && rows.length > 0) {
      rows.forEach((r) => {
        if (r.key === 'order_schedule_enabled') {
          schedule.enabled = r.value === 'true' || r.value === '1';
        } else if (r.key === 'order_schedule_start') {
          schedule.startTime = r.value || '';
        } else if (r.key === 'order_schedule_end') {
          schedule.endTime = r.value || '';
        }
      });
    }
    return schedule;
  },

  setOrderSchedule: async (schedule: OrderSchedule): Promise<void> => {
    const now = new Date().toISOString();
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('order_schedule_enabled', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [schedule.enabled ? 'true' : 'false', now]
    );
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('order_schedule_start', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [schedule.startTime || '', now]
    );
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('order_schedule_end', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [schedule.endTime || '', now]
    );
  },

  // --- System Master Password ---
  getSystemPassword: async (): Promise<string> => {
    const rows = await tursoQuery("SELECT value FROM app_settings WHERE key = 'system_password'");
    if (rows && rows.length > 0 && rows[0]?.value) {
      return rows[0].value;
    }
    return 'niruma0212';
  },

  setSystemPassword: async (password: string): Promise<void> => {
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('system_password', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [password, new Date().toISOString()]
    );
  },

  // --- Guests ---
  getGuests: async (): Promise<import('../types').GuestCredential[]> => {
    const rows = await tursoQuery('SELECT * FROM guests ORDER BY created_at DESC');
    if (!rows) return [];
    return rows.map((r: any) => ({
      id: r.id,
      guestName: r.guest_name,
      password: r.password,
      createdAt: r.created_at,
    }));
  },

  addGuest: async (guest: import('../types').GuestCredential): Promise<void> => {
    await tursoQuery(
      `INSERT INTO guests (id, guest_name, password, created_at) VALUES (?, ?, ?, ?)`,
      [guest.id, guest.guestName, guest.password, guest.createdAt || new Date().toISOString()]
    );
  },

  updateGuest: async (id: string, updates: Partial<import('../types').GuestCredential>): Promise<void> => {
    const sets: string[] = [];
    const args: any[] = [];
    if (updates.guestName !== undefined) {
      sets.push('guest_name = ?');
      args.push(updates.guestName);
    }
    if (updates.password !== undefined) {
      sets.push('password = ?');
      args.push(updates.password);
    }
    if (sets.length === 0) return;
    args.push(id);
    await tursoQuery(`UPDATE guests SET ${sets.join(', ')} WHERE id = ?`, args);
  },

  deleteGuest: async (id: string): Promise<void> => {
    await tursoQuery(`DELETE FROM guests WHERE id = ?`, [id]);
  },

  // --- System Controls ---
  getSystemControls: async (): Promise<SystemControls> => {
    const DEFAULT_SYSTEM_CONTROLS: SystemControls = {
      allowDataWipe: true,
      allowPhaseChange: true,
      allowOrderWipe: true,
      allowRosterEdit: true,
      allowMenuEdit: true,
      allowOrderPortal: true,
      allowOrderEditing: true,
      allowSuperAdminLogin: true,
    };
    try {
      const rows = await tursoQuery("SELECT value FROM app_settings WHERE key = 'system_controls'");
      if (rows && rows.length > 0 && rows[0]?.value) {
        const parsed = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
        return { ...DEFAULT_SYSTEM_CONTROLS, ...parsed };
      }
    } catch (e) {
      console.warn('[Turso] Failed to get system_controls:', e);
    }
    return DEFAULT_SYSTEM_CONTROLS;
  },

  setSystemControls: async (controls: SystemControls): Promise<void> => {
    const now = new Date().toISOString();
    await tursoQuery(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('system_controls', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(controls), now]
    );
  },

  // --- Admin Login History ---
  recordLogin: async (role: AdminRole, username: string, userAgent?: string): Promise<LoginHistoryItem> => {
    const now = new Date();
    const id = `login_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dateDisplay = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeDisplay = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    const device = parseDeviceFromUserAgent(ua);

    const item: LoginHistoryItem = {
      id,
      role,
      username,
      timestamp: now.toISOString(),
      dateDisplay,
      timeDisplay,
      userAgent: ua,
      device,
    };

    try {
      await tursoQuery(
        `CREATE TABLE IF NOT EXISTS admin_login_history (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          username TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          date_display TEXT,
          time_display TEXT,
          user_agent TEXT,
          device TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      );

      await tursoQuery(
        `INSERT INTO admin_login_history (id, role, username, timestamp, date_display, time_display, user_agent, device)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.role, item.username, item.timestamp, item.dateDisplay, item.timeDisplay, item.userAgent || '', item.device || '']
      );
    } catch (e) {
      console.warn('[Turso] Failed to persist login history to table:', e);
    }

    try {
      const cachedRaw = localStorage.getItem('admin_login_history_cache');
      const list: LoginHistoryItem[] = cachedRaw ? JSON.parse(cachedRaw) : [];
      list.unshift(item);
      localStorage.setItem('admin_login_history_cache', JSON.stringify(list.slice(0, 200)));
    } catch (e) {}

    return item;
  },

  getLoginHistory: async (): Promise<LoginHistoryItem[]> => {
    try {
      await tursoQuery(
        `CREATE TABLE IF NOT EXISTS admin_login_history (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          username TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          date_display TEXT,
          time_display TEXT,
          user_agent TEXT,
          device TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      );

      const rows = await tursoQuery<any>(
        'SELECT * FROM admin_login_history ORDER BY timestamp DESC LIMIT 200'
      );
      if (rows && rows.length > 0) {
        const items: LoginHistoryItem[] = rows.map((r: any) => ({
          id: r.id,
          role: r.role,
          username: r.username,
          timestamp: r.timestamp,
          dateDisplay: r.date_display,
          timeDisplay: r.time_display,
          userAgent: r.user_agent,
          device: r.device || parseDeviceFromUserAgent(r.user_agent),
        }));
        try {
          localStorage.setItem('admin_login_history_cache', JSON.stringify(items));
        } catch (e) {}
        return items;
      }
    } catch (e) {
      console.warn('[Turso] Failed to get login history:', e);
    }

    try {
      const cachedRaw = localStorage.getItem('admin_login_history_cache');
      if (cachedRaw) return JSON.parse(cachedRaw);
    } catch (e) {}
    return [];
  },

  clearLoginHistory: async (): Promise<void> => {
    try {
      await tursoQuery('DELETE FROM admin_login_history');
    } catch (e) {}
    try {
      localStorage.removeItem('admin_login_history_cache');
    } catch (e) {}
  },

  // --- Admin Activity & Audit Trail ---
  recordActivity: async (
    actionType: AdminActionType,
    title: string,
    details: string,
    role?: AdminRole,
    username?: string,
    userAgent?: string
  ): Promise<AdminActivityLog> => {
    const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    const finalRole: AdminRole = role || (localStorage.getItem('admin_role') as AdminRole) || 'admin';
    const finalUser: string =
      username ||
      localStorage.getItem('admin_username') ||
      (finalRole === 'boss' ? 'boss' : finalRole === 'super' ? 'superadmin' : 'admin');
    const now = new Date();
    const item: AdminActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: finalRole,
      username: finalUser,
      actionType,
      title,
      details,
      timestamp: now.toISOString(),
      dateDisplay: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      timeDisplay: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      userAgent: ua,
      device: parseDeviceFromUserAgent(ua),
    };

    try {
      await tursoQuery(
        `CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          username TEXT NOT NULL,
          action_type TEXT NOT NULL,
          title TEXT NOT NULL,
          details TEXT,
          timestamp TEXT NOT NULL,
          date_display TEXT,
          time_display TEXT,
          user_agent TEXT,
          device TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      );

      await tursoQuery(
        `INSERT INTO admin_activity_logs (id, role, username, action_type, title, details, timestamp, date_display, time_display, user_agent, device)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.role,
          item.username,
          item.actionType,
          item.title,
          item.details,
          item.timestamp,
          item.dateDisplay,
          item.timeDisplay,
          item.userAgent || '',
          item.device || '',
        ]
      );
    } catch (e) {
      console.warn('[Turso] Failed to persist activity log to table:', e);
    }

    try {
      const cachedRaw = localStorage.getItem('admin_activity_logs_cache');
      const list: AdminActivityLog[] = cachedRaw ? JSON.parse(cachedRaw) : [];
      list.unshift(item);
      localStorage.setItem('admin_activity_logs_cache', JSON.stringify(list.slice(0, 300)));
    } catch (e) {}

    return item;
  },

  getActivityLogs: async (): Promise<AdminActivityLog[]> => {
    try {
      await tursoQuery(
        `CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          username TEXT NOT NULL,
          action_type TEXT NOT NULL,
          title TEXT NOT NULL,
          details TEXT,
          timestamp TEXT NOT NULL,
          date_display TEXT,
          time_display TEXT,
          user_agent TEXT,
          device TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      );

      const rows = await tursoQuery<any>(
        'SELECT * FROM admin_activity_logs ORDER BY timestamp DESC LIMIT 300'
      );
      if (rows && rows.length > 0) {
        const items: AdminActivityLog[] = rows.map((r: any) => ({
          id: r.id,
          role: r.role,
          username: r.username,
          actionType: r.action_type,
          title: r.title,
          details: r.details,
          timestamp: r.timestamp,
          dateDisplay: r.date_display,
          timeDisplay: r.time_display,
          userAgent: r.user_agent,
          device: r.device || parseDeviceFromUserAgent(r.user_agent),
        }));
        try {
          localStorage.setItem('admin_activity_logs_cache', JSON.stringify(items));
        } catch (e) {}
        return items;
      }
    } catch (e) {
      console.warn('[Turso] Failed to get activity logs:', e);
    }

    try {
      const cachedRaw = localStorage.getItem('admin_activity_logs_cache');
      if (cachedRaw) return JSON.parse(cachedRaw);
    } catch (e) {}
    return [];
  },

  clearActivityLogs: async (): Promise<void> => {
    try {
      await tursoQuery('DELETE FROM admin_activity_logs');
    } catch (e) {}
    try {
      localStorage.removeItem('admin_activity_logs_cache');
    } catch (e) {}
  },

  // --- Admin Live Online Presence ---
  pingPresence: async (role?: AdminRole, username?: string): Promise<void> => {
    const finalRole: AdminRole = role || (localStorage.getItem('admin_role') as AdminRole) || 'admin';
    const finalUser: string =
      username ||
      localStorage.getItem('admin_username') ||
      (finalRole === 'boss' ? 'boss' : finalRole === 'super' ? 'superadmin' : 'admin');
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const device = parseDeviceFromUserAgent(ua);
    const now = new Date().toISOString();

    try {
      await tursoQuery(
        `CREATE TABLE IF NOT EXISTS admin_presence (
          username TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          last_seen TEXT NOT NULL,
          user_agent TEXT,
          device TEXT
        )`
      );

      await tursoQuery(
        `INSERT OR REPLACE INTO admin_presence (username, role, last_seen, user_agent, device)
         VALUES (?, ?, ?, ?, ?)`,
        [finalUser, finalRole, now, ua, device]
      );
    } catch (e) {
      console.warn('[Turso] Failed to ping admin presence:', e);
    }
  },

  getOnlineAdmins: async (): Promise<AdminPresence[]> => {
    try {
      await tursoQuery(
        `CREATE TABLE IF NOT EXISTS admin_presence (
          username TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          last_seen TEXT NOT NULL,
          user_agent TEXT,
          device TEXT
        )`
      );

      const rows = await tursoQuery<any>('SELECT * FROM admin_presence');
      if (rows && rows.length > 0) {
        const now = Date.now();
        // Considered active if seen in the last 120 seconds (2 minutes)
        return rows
          .map((r: any) => ({
            username: r.username,
            role: r.role,
            lastSeen: r.last_seen,
            userAgent: r.user_agent,
            device: r.device || parseDeviceFromUserAgent(r.user_agent),
          }))
          .filter((p: AdminPresence) => {
            const seen = new Date(p.lastSeen).getTime();
            return !isNaN(seen) && now - seen < 120000;
          });
      }
    } catch (e) {
      console.warn('[Turso] Failed to get online admins:', e);
    }
    return [];
  },
};

export function parseDeviceFromUserAgent(ua?: string): string {
  if (!ua) return 'Unknown Device';
  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/android/i.test(ua)) os = 'Android Mobile';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS Device';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac OS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return `${os} • ${browser}`;
}
