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
  DELETED_STUDENTS: 'flame_co_deleted_students_v1',
};

export interface DeletedStudentEntry {
  id: string;
  fullName: string;
  normalizedName: string;
  deletedAt: string;
}

const normalizeName = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function getLocalDeletedStudents(): DeletedStudentEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.DELETED_STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function isStudentDeleted(
  studentId?: string,
  fullName?: string,
  deletedList?: DeletedStudentEntry[]
): boolean {
  const list = deletedList || getLocalDeletedStudents();
  const sId = (studentId || '').toLowerCase().trim();
  const normName = fullName ? normalizeName(fullName) : '';
  return list.some((d) => {
    if (sId && d.id && d.id.toLowerCase().trim() === sId) return true;
    if (normName && d.normalizedName && d.normalizedName === normName) return true;
    return false;
  });
}

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
    // 1. Sync deleted students from backend
    let deletedList = getLocalDeletedStudents();
    try {
      const remoteDeleted = await api.getDeletedStudents();
      if (remoteDeleted && remoteDeleted.length > 0) {
        const mergedDeleted = [...deletedList];
        remoteDeleted.forEach((rd) => {
          if (!mergedDeleted.some((d) => (rd.id && d.id?.toLowerCase() === rd.id.toLowerCase()) || (rd.normalizedName && d.normalizedName === rd.normalizedName))) {
            mergedDeleted.push({
              id: rd.id,
              fullName: rd.fullName,
              normalizedName: rd.normalizedName,
              deletedAt: new Date().toISOString(),
            });
          }
        });
        deletedList = mergedDeleted;
        localStorage.setItem(KEYS.DELETED_STUDENTS, JSON.stringify(deletedList));
      }
    } catch (e) {}

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
      const cachedByGm = new Map<number, Student>();
      cached.forEach((c) => {
        if (!isStudentDeleted(c.id, c.fullName, deletedList)) {
          cachedMap.set(normalizeName(c.fullName), c);
          if (c.gmNo && c.gmNo > 0) {
            cachedByGm.set(c.gmNo, c);
          }
        }
      });

      const map = new Map<string, Student>();
      INITIAL_STUDENTS.forEach((init) => {
        if (!isStudentDeleted(init.id, init.fullName, deletedList)) {
          const key = init.gmNo && init.gmNo > 0 ? `gm_${init.gmNo}` : (init.id ? `id_${init.id.toLowerCase()}` : `name_${normalizeName(init.fullName)}`);
          map.set(key, { ...init });
        }
      });

      data.forEach((s) => {
        if (isStudentDeleted(s.id, s.fullName, deletedList)) {
          return;
        }

        const gmNo = resolveGm(s) || (s.gmNo || 0);
        const key = gmNo && gmNo > 0 ? `gm_${gmNo}` : (s.id ? `id_${s.id.toLowerCase()}` : `name_${normalizeName(s.fullName)}`);

        // Check if there is an existing student record by GM, ID, or Name
        let existing = map.get(key);
        if (!existing && gmNo > 0) {
          existing = map.get(`gm_${gmNo}`);
        }
        if (!existing && s.id) {
          existing = map.get(`id_${s.id.toLowerCase()}`);
        }
        if (!existing) {
          existing = map.get(`name_${normalizeName(s.fullName)}`);
        }

        const localCached = (gmNo > 0 ? cachedByGm.get(gmNo) : undefined) || cachedMap.get(normalizeName(s.fullName));

        const fullName = s.fullName || existing?.fullName || '';
        const firstName = s.firstName || fullName.split(' ')[0] || fullName;
        const studentId = s.id && s.id.match(/-(\d+)$/) ? s.id : `${fullName}-${gmNo || 0}`;

        const grade =
          s.grade && s.grade !== 'Gurukul Roster'
            ? s.grade
            : localCached?.grade && localCached.grade !== 'Gurukul Roster'
            ? localCached.grade
            : existing?.grade || s.grade || 'Gurukul Roster';

        const mergedStudent: Student = {
          ...(existing || {}),
          ...s,
          id: studentId,
          fullName,
          firstName,
          parentName: s.parentName || existing?.parentName || 'Parent',
          birthDate: s.birthDate || localCached?.birthDate || existing?.birthDate || '',
          gmNo,
          grade,
        };

        // If existing was under a different key (e.g. name changed), remove old key
        if (existing) {
          const oldKey = existing.gmNo && existing.gmNo > 0
            ? `gm_${existing.gmNo}`
            : (existing.id ? `id_${existing.id.toLowerCase()}` : `name_${normalizeName(existing.fullName)}`);
          if (oldKey !== key) {
            map.delete(oldKey);
          }
          const oldNameKey = `name_${normalizeName(existing.fullName)}`;
          if (oldNameKey !== key) {
            map.delete(oldNameKey);
          }
        }

        map.set(key, mergedStudent);
      });

      // Filter and deduplicate merged results
      const seenGm = new Set<number>();
      const seenId = new Set<string>();
      const merged: Student[] = [];

      for (const st of map.values()) {
        if (isStudentDeleted(st.id, st.fullName, deletedList)) continue;
        if (st.gmNo && st.gmNo > 0) {
          if (seenGm.has(st.gmNo)) continue;
          seenGm.add(st.gmNo);
        } else if (st.id) {
          if (seenId.has(st.id.toLowerCase())) continue;
          seenId.add(st.id.toLowerCase());
        }
        merged.push(st);
      }

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
    const deletedList = getLocalDeletedStudents();
    let reg: Record<string, number> = {};
    try {
      const regRaw = localStorage.getItem('student_gm_registry');
      if (regRaw) reg = JSON.parse(regRaw);
    } catch (e) {}

    const raw = localStorage.getItem(KEYS.STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped = parsed
          .filter((s: Student) => !isStudentDeleted(s.id, s.fullName, deletedList))
          .map((s: Student) => {
            const initial = INITIAL_STUDENTS.find(
              (i) => (s.gmNo && i.gmNo === s.gmNo) || normalizeName(i.fullName) === normalizeName(s.fullName) || i.id === s.id
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

        // Deduplicate to ensure no stale duplicate names or GM entries exist in cache
        const seenGm = new Set<number>();
        const seenId = new Set<string>();
        const deduplicated: Student[] = [];
        for (const st of mapped) {
          if (st.gmNo && st.gmNo > 0) {
            if (seenGm.has(st.gmNo)) continue;
            seenGm.add(st.gmNo);
          } else if (st.id) {
            if (seenId.has(st.id.toLowerCase())) continue;
            seenId.add(st.id.toLowerCase());
          }
          deduplicated.push(st);
        }
        return deduplicated;
      }
    }
  } catch (e) {}
  const deletedList = getLocalDeletedStudents();
  return INITIAL_STUDENTS.filter((s) => !isStudentDeleted(s.id, s.fullName, deletedList));
}

export async function saveStudent(student: Student, originalStudent?: Student): Promise<Student> {
  // If previously marked deleted, unmark it so it can be re-added or updated
  try {
    const deleted = getLocalDeletedStudents();
    const norm = normalizeName(student.fullName);
    const origNorm = originalStudent?.fullName ? normalizeName(originalStudent.fullName) : '';
    const updatedDeleted = deleted.filter(
      (d) =>
        d.id?.toLowerCase() !== student.id?.toLowerCase() &&
        (!originalStudent?.id || d.id?.toLowerCase() !== originalStudent.id.toLowerCase()) &&
        (!norm || d.normalizedName !== norm) &&
        (!origNorm || d.normalizedName !== origNorm)
    );
    if (updatedDeleted.length !== deleted.length) {
      localStorage.setItem(KEYS.DELETED_STUDENTS, JSON.stringify(updatedDeleted));
      api.removeDeletedStudent(student.id, student.fullName).catch(() => {});
      if (originalStudent) {
        api.removeDeletedStudent(originalStudent.id, originalStudent.fullName).catch(() => {});
      }
    }
  } catch (e) {}

  let gmNo = student.gmNo || originalStudent?.gmNo || 0;
  if (!gmNo && student.id) {
    const m = student.id.match(/-(\d+)$/);
    if (m) gmNo = parseInt(m[1], 10);
  }
  if (!gmNo && student.fullName.toLowerCase() === 'bhavyaop') {
    gmNo = 999;
  }

  // Consistent ID based on current name and gmNo
  const studentId = `${student.fullName.trim()}-${gmNo || 0}`;

  const normalizedStudent: Student = {
    ...student,
    id: studentId,
    gmNo,
  };

  try {
    const regRaw = localStorage.getItem('student_gm_registry');
    const reg = regRaw ? JSON.parse(regRaw) : {};
    if (originalStudent) {
      if (originalStudent.fullName) delete reg[originalStudent.fullName.toLowerCase()];
      if (originalStudent.id) delete reg[originalStudent.id.toLowerCase()];
    }
    if (gmNo) {
      reg[student.fullName.toLowerCase()] = gmNo;
      reg[studentId.toLowerCase()] = gmNo;
    }
    localStorage.setItem('student_gm_registry', JSON.stringify(reg));
  } catch (e) {}

  let saved = normalizedStudent;
  try {
    saved = await api.saveStudent(normalizedStudent, originalStudent);
  } catch (e) {
    console.warn('API saveStudent error, saving locally:', e);
  }
  saved = { ...normalizedStudent, ...saved, id: studentId, gmNo };

  const existing = getCachedStudents();
  const targetId = originalStudent?.id?.toLowerCase();
  const targetGm = originalStudent?.gmNo || gmNo;
  const targetName = originalStudent?.fullName ? normalizeName(originalStudent.fullName) : '';

  const index = existing.findIndex(
    (s) =>
      (targetId && s.id.toLowerCase() === targetId) ||
      (targetGm && targetGm > 0 && s.gmNo === targetGm) ||
      (targetName && normalizeName(s.fullName) === targetName) ||
      s.id.toLowerCase() === saved.id.toLowerCase() ||
      normalizeName(s.fullName) === normalizeName(saved.fullName)
  );

  let updated: Student[];
  if (index >= 0) {
    // Purge any other entry that shared targetGm or targetId so no duplicate lingers
    updated = existing.filter(
      (s, i) =>
        i === index ||
        !((targetGm && targetGm > 0 && s.gmNo === targetGm) || (targetId && s.id.toLowerCase() === targetId))
    );
    const targetIdx = updated.findIndex(
      (s) =>
        (targetId && s.id.toLowerCase() === targetId) ||
        (targetGm && targetGm > 0 && s.gmNo === targetGm) ||
        (targetName && normalizeName(s.fullName) === targetName) ||
        s.id.toLowerCase() === saved.id.toLowerCase() ||
        normalizeName(s.fullName) === normalizeName(saved.fullName)
    );
    if (targetIdx >= 0) {
      updated[targetIdx] = {
        ...updated[targetIdx],
        ...saved,
        grade: saved.grade || updated[targetIdx].grade,
        birthDate: saved.birthDate || updated[targetIdx].birthDate,
        fullName: saved.fullName || updated[targetIdx].fullName,
        parentName: saved.parentName || updated[targetIdx].parentName,
        gmNo: saved.gmNo || updated[targetIdx].gmNo,
      };
    } else {
      updated.push(saved);
    }
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
          const matchOldId = targetId && o.studentId?.toLowerCase() === targetId;
          const matchOldName = targetName && normalizeName(o.fullName) === targetName;
          const matchCurrId = o.studentId?.toLowerCase() === saved.id.toLowerCase();
          const matchCurrName = normalizeName(o.fullName) === normalizeName(saved.fullName);
          if (matchOldId || matchOldName || matchCurrId || matchCurrName) {
            changed = true;
            return {
              ...o,
              studentId: saved.id,
              studentName: saved.fullName,
              fullName: saved.fullName,
              parentName: saved.parentName || o.parentName,
            };
          }
          return o;
        });
        if (changed) {
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(mappedOrders));
        }
      }
    }
  } catch (e) {}

  return saved;
}

export async function deleteStudent(studentId: string, fullName?: string): Promise<void> {
  const normName = fullName ? normalizeName(fullName) : '';
  const entry: DeletedStudentEntry = {
    id: studentId,
    fullName: fullName || '',
    normalizedName: normName,
    deletedAt: new Date().toISOString(),
  };

  // 1. Record in local deleted students list
  try {
    const deleted = getLocalDeletedStudents();
    const exists = deleted.some(
      (d) =>
        (studentId && d.id?.toLowerCase() === studentId.toLowerCase()) ||
        (normName && d.normalizedName === normName)
    );
    if (!exists) {
      deleted.push(entry);
      localStorage.setItem(KEYS.DELETED_STUDENTS, JSON.stringify(deleted));
    }
  } catch (e) {}

  // 2. Delete from remote DB (Turso & Supabase)
  try {
    await api.deleteStudent(studentId, fullName);
  } catch (e) {
    console.warn('API deleteStudent error, deleting locally:', e);
  }

  // 3. Persist tombstone to remote DB so all devices stay in sync
  try {
    await api.addDeletedStudent(entry);
  } catch (e) {}

  // 4. Clean up local student cache
  const existing = getCachedStudents();
  const updated = existing.filter(
    (s) =>
      s.id.toLowerCase() !== studentId.toLowerCase() &&
      (normName ? normalizeName(s.fullName) !== normName : true)
  );
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updated));

  // 5. Clean up any orders associated with this student in local cache (both parent and student orders)
  try {
    const cachedOrders = getCachedOrders();
    const filteredOrders = cachedOrders.filter((o) => {
      if (o.studentId && o.studentId.toLowerCase() === studentId.toLowerCase()) return false;
      if (normName) {
        if (o.fullName && normalizeName(o.fullName) === normName) return false;
        if (o.studentName && normalizeName(o.studentName) === normName) return false;
      }
      return true;
    });
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(filteredOrders));
  } catch (e) {}

  // 6. Clean up from student GM registry
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
    const deletedList = getLocalDeletedStudents();
    const filtered = (data || []).filter((o) => {
      const matchId = o.studentId && deletedList.some((d) => d.id && d.id.toLowerCase() === o.studentId.toLowerCase());
      const normFull = o.fullName ? normalizeName(o.fullName) : '';
      const normStudent = o.studentName ? normalizeName(o.studentName) : '';
      const matchName = deletedList.some(
        (d) => (normFull && d.normalizedName === normFull) || (normStudent && d.normalizedName === normStudent)
      );
      return !matchId && !matchName;
    });
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.warn('API error fetching orders, using cache:', e);
  }
  return getCachedOrders();
}

export function getCachedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEYS.ORDERS);
    if (raw) {
      const parsed: Order[] = JSON.parse(raw);
      const deletedList = getLocalDeletedStudents();
      return (parsed || []).filter((o) => {
        const matchId = o.studentId && deletedList.some((d) => d.id && d.id.toLowerCase() === o.studentId.toLowerCase());
        const normFull = o.fullName ? normalizeName(o.fullName) : '';
        const normStudent = o.studentName ? normalizeName(o.studentName) : '';
        const matchName = deletedList.some(
          (d) => (normFull && d.normalizedName === normFull) || (normStudent && d.normalizedName === normStudent)
        );
        return !matchId && !matchName;
      });
    }
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

