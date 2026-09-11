export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Completed';

export interface Student {
  id: string; // e.g. "Darsh Pradip Ramjiyani"
  gmNo: number; // e.g. 1
  firstName: string; // e.g. "Darsh"
  parentName: string; // e.g. "Pradip Ramjiyani"
  fullName: string; // e.g. "Darsh Pradip Ramjiyani"
  grade: string; // e.g. "Std 10"
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  isChefSpecial?: boolean;
  isAvailable: boolean;
  portionValue?: number;
  portionUnit?: 'ml' | 'g';
}

export interface CartItem {
  food: FoodItem;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  portion?: string;
}

export interface Order {
  orderNumber: string; // e.g. FLM-2026-8942
  studentId: string;
  studentName: string; // e.g. Dhairya (Bhavesh)
  parentName: string;
  fullName: string;
  deviceId: string;
  peopleCount: number; // 1 to 5
  allowedBudget: number; // peopleCount * 220
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string; // ISO date string
  dateDisplay: string;
  timeDisplay: string;
}

export interface DeviceLockInfo {
  deviceId: string;
  studentId: string;
  studentName: string;
  orderNumber: string;
  orderDate: string;
}
