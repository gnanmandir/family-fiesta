import { FoodItem, Order, Student, DeviceLockInfo, OrderStatus } from '../types';
import { INITIAL_MENU } from '../data/menu';
import { INITIAL_STUDENTS } from '../data/students';
import { api } from './api';

const KEYS = {
  ORDERS: 'jusso_orders_v6',
  MENU: 'jusso_menu_v6',
  STUDENTS: 'flame_co_students_v7',
  DEVICE_ID: 'jusso_device_id_v2',
  DEVICE_ORDER: 'jusso_device_order_v6',
};

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
    const data = await api.getStudents();
    if (data && data.length > 0) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('API error fetching students, using fallback:', e);
  }
  return getCachedStudents();
}

export function getCachedStudents(): Student[] {
  try {
    const raw = localStorage.getItem(KEYS.STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_STUDENTS;
}

export async function saveStudent(student: Student): Promise<Student> {
  const saved = await api.saveStudent(student);
  const existing = getCachedStudents();
  const index = existing.findIndex(s => s.id === saved.id);
  
  let updated;
  if (index >= 0) {
    updated = [...existing];
    updated[index] = saved;
  } else {
    updated = [...existing, saved];
  }
  
  // Sort alphabetically by first name
  updated.sort((a, b) => a.firstName.localeCompare(b.firstName));
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updated));
  return saved;
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

  // 3. Save device lock
  const lockInfo: DeviceLockInfo = {
    deviceId: order.deviceId,
    studentId: finalOrder.studentId,
    studentName: finalOrder.studentName,
    orderNumber: finalOrder.orderNumber,
    orderDate: finalOrder.createdAt,
  };
  localStorage.setItem(KEYS.DEVICE_ORDER, JSON.stringify(lockInfo));

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
    await api.deleteOrder(orderNumber);
  } catch (e) {
    console.error('Error deleting order:', e);
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

export function getStudentExistingOrder(studentId: string, ordersList?: Order[], studentName?: string): Order | null {
  const orders = ordersList || getCachedOrders();
  const sId = (studentId || '').trim().toLowerCase();
  const sName = (studentName || '').trim().toLowerCase();
  return (
    orders.find((o) => {
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
