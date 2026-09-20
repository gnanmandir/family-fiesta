import { FoodItem, Order, Student, DeviceLockInfo, OrderStatus, SystemControls } from '../types';
import { INITIAL_MENU } from '../data/menu';
import { INITIAL_STUDENTS } from '../data/students';
import { api } from './api';

const KEYS = {
  ORDERS: 'jusso_orders_v6',
  MENU: 'jusso_menu_v6',
  STUDENTS: 'flame_co_students_v10',
  DEVICE_ID: 'jusso_device_id_v2',
  DEVICE_ORDER: 'jusso_device_order_v6',
};

const normalizeName = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem(KEYS.DEVICE_ID);
    if (!devId) {
      devId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      localStorage.setItem(KEYS.DEVICE_ID, devId);
    }
    return devId;
  } catch (e) {
    return 'DEV-LOCAL-SESSION';
  }
}

export async function fetchStudents(): Promise<Student[]> {
  try {
    let reg: Record<string, number> = {};
    try {
      const regRaw = localStorage.getItem('student_gm_registry');
      if (regRaw) reg = JSON.parse(regRaw);
    } catch (e) {}

    const resolveGm = (st: Partial<Student>, fallback?: Partial<Student>) => {
      let g = st.gmNo || fallback?.gmNo || (st.fullName ? reg[st.fullName.toLowerCase()] : 0) || (st.id ? reg[st.id.toLowerCase()] : 0) || 0;
      if (!g && st.id) {
        const m = st.id.match(/-(\d+)$/);
        if (m) g = parseInt(m[1], 10);
      }
      if (!g && fallback?.id) {
        const m = fallback.id.match(/-(\d+)$/);
        if (m) g = parseInt(m[1], 10);
      }
      if (!g && st.fullName && st.fullName.toLowerCase() === 'bhavyaop') {
        g = 999;
      }
      return g;
    };

    const data = await api.getStudents();
    if (data && data.length > 0) {
      // Check cached edits to ensure custom edits like 'Diploma' are preserved
      const cached = getCachedStudents();
      const cachedMap = new Map<string, Student>();
      cached.forEach((c) => {
        cachedMap.set(normalizeName(c.fullName), c);
      });

      const map = new Map<string, Student>();
      INITIAL_STUDENTS.forEach((init) => {
        map.set(normalizeName(init.fullName), { ...init });
      });

      data.forEach((s) => {
        const key = normalizeName(s.fullName);
        const existing = map.get(key);
        const localCached = cachedMap.get(key);

        if (existing) {
          const grade =
            s.grade && s.grade !== 'Gurukul Roster'
              ? s.grade
              : localCached?.grade && localCached.grade !== 'Gurukul Roster'
              ? localCached.grade
              : existing.grade || s.grade || 'Gurukul Roster';

          const gmNo = resolveGm(s, existing) || resolveGm(localCached || {});

          map.set(key, {
            ...existing,
            ...s,
            id: existing.id,
            birthDate: s.birthDate || localCached?.birthDate || existing.birthDate,
            gmNo,
            fullName: existing.fullName,
            grade,
          });
        } else {
          const gmNo = resolveGm(s, localCached);
          map.set(key, {
            ...s,
            id: s.id && s.id.match(/-(\d+)$/) ? s.id : `${s.fullName}-${gmNo || 0}`,
            birthDate: s.birthDate || localCached?.birthDate || '',
            gmNo,
            fullName: s.fullName,
            grade: s.grade || localCached?.grade || 'Gurukul Roster',
          });
        }
      });

      const merged = Array.from(map.values());
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(merged));
      return merged;
    }
  } catch (e) {
    console.warn('API error fetching students, using fallback:', e);
  }
  return getCachedStudents();
}

export function getCachedStudents(): Student[] {
  try {
    let reg: Record<string, number> = {};
    try {
      const regRaw = localStorage.getItem('student_gm_registry');
      if (regRaw) reg = JSON.parse(regRaw);
    } catch (e) {}

    const raw = localStorage.getItem(KEYS.STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: Student) => {
          const initial = INITIAL_STUDENTS.find(
            (i) => normalizeName(i.fullName) === normalizeName(s.fullName) || i.id === s.id
          );
          let gm = s.gmNo || initial?.gmNo || (s.fullName ? reg[s.fullName.toLowerCase()] : 0) || (s.id ? reg[s.id.toLowerCase()] : 0) || 0;
          if (!gm && s.id) {
            const m = s.id.match(/-(\d+)$/);
            if (m) gm = parseInt(m[1], 10);
          }
          if (!gm && s.fullName && s.fullName.toLowerCase() === 'bhavyaop') {
            gm = 999;
          }
          return {
            ...s,
            birthDate: s.birthDate || initial?.birthDate,
            gmNo: gm,
          };
        });
      }
    }
  } catch (e) {}
  return INITIAL_STUDENTS;
}

export async function saveStudent(student: Student): Promise<Student> {
  let gmNo = student.gmNo || 0;
  if (!gmNo && student.id) {
    const m = student.id.match(/-(\d+)$/);
    if (m) gmNo = parseInt(m[1], 10);
  }
  if (!gmNo && student.fullName.toLowerCase() === 'bhavyaop') {
    gmNo = 999;
  }

  let studentId = student.id || '';
  if (!studentId || !studentId.match(/-(\d+)$/)) {
    studentId = `${student.fullName}-${gmNo}`;
  } else if (gmNo && !studentId.endsWith(`-${gmNo}`)) {
    studentId = studentId.replace(/-(\d+)$/, `-${gmNo}`);
  }

  const normalizedStudent: Student = {
    ...student,
    id: studentId,
    gmNo,
  };

  try {
    const regRaw = localStorage.getItem('student_gm_registry');
    const reg = regRaw ? JSON.parse(regRaw) : {};
    if (gmNo) {
      reg[student.fullName.toLowerCase()] = gmNo;
      reg[studentId.toLowerCase()] = gmNo;
    }
    localStorage.setItem('student_gm_registry', JSON.stringify(reg));
  } catch (e) {}

  let saved = normalizedStudent;
  try {
    saved = await api.saveStudent(normalizedStudent);
  } catch (e) {
    console.warn('API saveStudent error, saving locally:', e);
  }
  saved = { ...normalizedStudent, ...saved, id: studentId, gmNo };

  const existing = getCachedStudents();
  const index = existing.findIndex(
    (s) => s.id === saved.id || normalizeName(s.fullName) === normalizeName(saved.fullName)
  );
  
  let updated: Student[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = {
      ...existing[index],
      ...saved,
      grade: saved.grade || existing[index].grade,
      birthDate: saved.birthDate || existing[index].birthDate,
      fullName: saved.fullName || existing[index].fullName,
      parentName: saved.parentName || existing[index].parentName,
      gmNo: saved.gmNo || existing[index].gmNo,
    };
  } else {
    updated = [...existing, saved];
  }
  
  // Sort alphabetically by first name
  updated.sort((a, b) => a.firstName.localeCompare(b.firstName));
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updated));

  // Sync any local cached orders for this student
  try {
    const rawOrders = localStorage.getItem(KEYS.ORDERS);
    if (rawOrders) {
      const parsedOrders = JSON.parse(rawOrders);
      if (Array.isArray(parsedOrders)) {
        let changed = false;
        const mappedOrders = parsedOrders.map((o: Order) => {
          if (o.studentId === saved.id || normalizeName(o.fullName) === normalizeName(saved.fullName)) {
            changed = true;
            return { ...o, fullName: saved.fullName, studentName: saved.fullName };
          }
          return o;
        });
        if (changed) {
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(mappedOrders));
        }
      }
    }
  } catch (e) {}

  return index >= 0 ? updated[index] : saved;
}

export async function deleteStudent(studentId: string, fullName?: string): Promise<void> {
  try {
    await api.deleteStudent(studentId, fullName);
  } catch (e) {
    console.warn('API deleteStudent error, deleting locally:', e);
  }

  const existing = getCachedStudents();
  const normName = fullName ? normalizeName(fullName) : '';
  const updated = existing.filter(
    (s) => s.id !== studentId && (normName ? normalizeName(s.fullName) !== normName : true)
  );
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updated));

  // Clean up any orders associated with this student in local cache (both parent and student orders)
  try {
    const cachedOrders = getCachedOrders();
    const filteredOrders = cachedOrders.filter(
      (o) =>
        o.studentId !== studentId &&
        (normName ? normalizeName(o.fullName || o.studentName || '') !== normName : true)
    );
    if (filteredOrders.length !== cachedOrders.length) {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(filteredOrders));
    }
  } catch (e) {}

  // Clean up from student GM registry
  try {
    const regRaw = localStorage.getItem('student_gm_registry');
    if (regRaw) {
      const reg = JSON.parse(regRaw);
      if (fullName) delete reg[fullName.toLowerCase()];
      delete reg[studentId.toLowerCase()];
      localStorage.setItem('student_gm_registry', JSON.stringify(reg));
    }
  } catch (e) {}
}

export async function fetchMenuItems(): Promise<FoodItem[]> {
  try {
    const data = await api.getMenuItems();
    if (data && data.length > 0) {
      localStorage.setItem(KEYS.MENU, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('API error fetching menu, using fallback:', e);
  }
  return getCachedMenuItems();
}

export function getCachedMenuItems(): FoodItem[] {
  try {
    const raw = localStorage.getItem(KEYS.MENU);
    if (raw) {
      const items: FoodItem[] = JSON.parse(raw);
      // Auto-backfill portionValue & portionUnit from INITIAL_MENU if missing
      return items.map((it) => {
        if (!it.portionValue) {
          const match = INITIAL_MENU.find((m) => m.id === it.id || m.name.trim().toLowerCase() === it.name.trim().toLowerCase());
          if (match && match.portionValue) {
            return { ...it, portionValue: match.portionValue, portionUnit: match.portionUnit };
          }
        }
        return it;
      });
    }
  } catch (e) {}
  return INITIAL_MENU;
}

export async function saveMenuItems(items: FoodItem[]): Promise<void> {
  try {
    localStorage.setItem(KEYS.MENU, JSON.stringify(items));
    await api.saveMenuItems(items);
  } catch (e) {
    console.error('Error saving menu items to backend:', e);
  }
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const data = await api.getOrders();
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(data));
    return data;
  } catch (e) {
    console.warn('API error fetching orders, using cache:', e);
  }
  return getCachedOrders();
}

export function getCachedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEYS.ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export async function saveOrder(order: Order): Promise<Order> {
  // 1. Save to backend first so server enforces one order per student
  const saved = await api.placeOrder(order);
  const finalOrder = saved || order;

  // 2. Only cache locally upon successful backend acceptance
  const existing = getCachedOrders();
  const updated = [finalOrder, ...existing.filter((o) => o.orderNumber !== finalOrder.orderNumber)];
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(updated));
  return finalOrder;
}

export async function updateOrderDetails(orderNumber: string, updates: Partial<Order>): Promise<Order> {
  try {
    const existing = getCachedOrders();
    const target = existing.find((o) => o.orderNumber === orderNumber);
    const updatedOrder = { ...target, ...updates } as Order;
    const updatedList = existing.map((o) => (o.orderNumber === orderNumber ? updatedOrder : o));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(updatedList));

    const saved = await api.updateOrder(orderNumber, updates);
    return saved || updatedOrder;
  } catch (e) {
    console.error('Error updating order:', e);
    const existing = getCachedOrders();
    return existing.find((o) => o.orderNumber === orderNumber) as Order;
  }
}

export async function updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<void> {
  try {
    const orders = getCachedOrders();
    const updated = orders.map((o) => (o.orderNumber === orderNumber ? { ...o, status } : o));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(updated));
    await api.updateOrderStatus(orderNumber, status);
  } catch (e) {
    console.error('Error updating order status:', e);
  }
}

export async function deleteOrder(orderNumber: string): Promise<void> {
  try {
    const orders = getCachedOrders();
    const updated = orders.filter((o) => o.orderNumber !== orderNumber);
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(updated));

    const currentLock = getDeviceOrder();
    if (currentLock && currentLock.orderNumber === orderNumber) {
      localStorage.removeItem(KEYS.DEVICE_ORDER);
    }
    const activeOrdNum = localStorage.getItem('active_order_number');
    if (activeOrdNum === orderNumber) {
      localStorage.removeItem('active_order_number');
    }
    await api.deleteOrder(orderNumber);
  } catch (e) {
    console.error('Error deleting order:', e);
  }
}

export async function wipeStudentOrder(studentId: string, studentFullName?: string, orderNumber?: string): Promise<void> {
  try {
    const orders = getCachedOrders();
    const normalize = (v: string) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = studentFullName ? normalize(studentFullName) : '';

    const remaining = orders.filter((o) => {
      if (orderNumber && o.orderNumber === orderNumber) return false;
      const matchId = o.studentId && studentId && o.studentId.toLowerCase() === studentId.toLowerCase();
      const matchName = normName && (normalize(o.fullName) === normName || normalize(o.studentName) === normName);
      return !matchId && !matchName;
    });

    localStorage.setItem(KEYS.ORDERS, JSON.stringify(remaining));

    const activeOrdNum = localStorage.getItem('active_order_number');
    if (activeOrdNum && (activeOrdNum === orderNumber || !remaining.some((o) => o.orderNumber === activeOrdNum))) {
      localStorage.removeItem('active_order_number');
      localStorage.removeItem(KEYS.DEVICE_ORDER);
    }

    if (orderNumber) {
      try {
        await api.deleteOrder(orderNumber);
      } catch (e) {}
    }
    await api.wipeStudentOrder(studentId, studentFullName);
  } catch (e) {
    console.error('Error in wipeStudentOrder:', e);
  }
}

export async function deleteCompletedOrders(): Promise<void> {
  try {
    const orders = getCachedOrders();
    const updated = orders.filter((o) => o.status !== 'Completed');
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(updated));

    const currentLock = getDeviceOrder();
    if (currentLock) {
      const stillExists = updated.some((o) => o.orderNumber === currentLock.orderNumber);
      if (!stillExists) {
        localStorage.removeItem(KEYS.DEVICE_ORDER);
      }
    }
    await api.deleteCompletedOrders();
  } catch (e) {
    console.error('Error deleting completed orders:', e);
  }
}

export async function deleteAllOrders(): Promise<void> {
  try {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
    localStorage.removeItem(KEYS.DEVICE_ORDER);
    await api.deleteAllOrders();
  } catch (e) {
    console.error('Error deleting all orders:', e);
  }
}

export async function deleteOrdersByRole(role: 'parent' | 'student' | 'guest' | 'staff'): Promise<void> {
  try {
    const existing = getCachedOrders();
    const isTarget = (o: Order) => {
      const oType = o.orderType || 'parent';
      if (role === 'parent') return oType === 'parent';
      if (role === 'guest' || role === 'staff') return oType === 'guest' || oType === 'staff';
      return oType === role;
    };
    const remaining = existing.filter((o) => !isTarget(o));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(remaining));

    const deviceOrder = getDeviceOrder();
    if (deviceOrder) {
      const orderInDeleted = existing.find((o) => o.orderNumber === deviceOrder.orderNumber && isTarget(o));
      if (orderInDeleted) {
        localStorage.removeItem(KEYS.DEVICE_ORDER);
      }
    }

    await api.deleteOrdersByRole(role);
  } catch (e) {
    console.error(`Error deleting ${role} orders:`, e);
  }
}

export function getDeviceOrder(): DeviceLockInfo | null {
  try {
    const raw = localStorage.getItem(KEYS.DEVICE_ORDER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

export async function checkDeviceOrderOnline(deviceId: string): Promise<Order | null> {
  try {
    const onlineOrder = await api.getOrderByDevice(deviceId);
    if (onlineOrder) {
      const lockInfo: DeviceLockInfo = {
        deviceId: onlineOrder.deviceId,
        studentId: onlineOrder.studentId,
        studentName: onlineOrder.studentName,
        orderNumber: onlineOrder.orderNumber,
        orderDate: onlineOrder.createdAt,
      };
      localStorage.setItem(KEYS.DEVICE_ORDER, JSON.stringify(lockInfo));
      return onlineOrder;
    }
  } catch (e) {}
  return null;
}

export function getStudentExistingOrder(studentId: string, ordersList?: Order[], studentName?: string, role?: string): Order | null {
  const orders = ordersList || getCachedOrders();
  const sId = (studentId || '').trim().toLowerCase();
  const sName = (studentName || '').trim().toLowerCase();
  return (
    orders.find((o) => {
      if (role && (o.orderType || 'parent') !== role) return false;
      const oId = (o.studentId || '').trim().toLowerCase();
      const oFull = (o.fullName || '').trim().toLowerCase();
      const oName = (o.studentName || '').trim().toLowerCase();
      if (sId && oId === sId) return true;
      if (sName && (oFull === sName || oName === sName)) return true;
      if (sId && (oFull === sId || oName === sId)) return true;
      return false;
    }) || null
  );
}

export async function clearDeviceLock(): Promise<void> {
  try {
    const devId = getOrCreateDeviceId();
    localStorage.removeItem(KEYS.DEVICE_ORDER);
    await api.clearDeviceLock(devId);
  } catch (e) {
    console.error('Error clearing device lock:', e);
  }
}

export async function resetAllData(): Promise<void> {
  try {
    localStorage.removeItem(KEYS.ORDERS);
    localStorage.removeItem(KEYS.DEVICE_ORDER);
    localStorage.setItem(KEYS.MENU, JSON.stringify(INITIAL_MENU));
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    await api.resetDatabase();
  } catch (e) {
    console.error('Error resetting data:', e);
  }
}

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

export function getCachedSystemControls(): SystemControls {
  try {
    const raw = localStorage.getItem('system_controls');
    if (raw) return { ...DEFAULT_SYSTEM_CONTROLS, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_SYSTEM_CONTROLS;
}

export function setCachedSystemControls(controls: SystemControls): void {
  try {
    localStorage.setItem('system_controls', JSON.stringify(controls));
  } catch (e) {}
}

