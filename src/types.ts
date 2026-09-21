export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Completed';

export interface Student {
  id: string; // e.g. "Darsh Pradip Ramjiyani"
  gmNo: number; // e.g. 1
  firstName: string; // e.g. "Darsh"
  parentName: string; // e.g. "Pradip Ramjiyani"
  lastName?: string; // Optional if existing data lacks it
  fullName: string; // e.g. "Darsh Pradip Ramjiyani"
  grade: string; // e.g. "Std 10"
  birthDate?: string; // used for auth
}

export interface StaffCredential {
  id: string; // e.g. "guest-12345" or "staff-12345"
  guestName: string;
  staffName?: string;
  password: string;
  createdAt: string;
}

export type GuestCredential = StaffCredential;

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
  isEdited?: boolean;
  orderType?: 'parent' | 'student' | 'guest' | 'staff';
}

export interface DeviceLockInfo {
  deviceId: string;
  studentId: string;
  studentName: string;
  orderNumber: string;
  orderDate: string;
}

export interface OrderSchedule {
  enabled: boolean;
  startTime: string; // ISO or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO or YYYY-MM-DDTHH:mm
}

export type IntakePhase = 'parent' | 'student' | 'guest' | 'staff' | 'closed';

export type AdminRole = 'boss' | 'super' | 'admin';

export interface SystemControls {
  allowPhaseChange: boolean;     // Super Admin changing intake phase
  allowOrderWipe: boolean;       // Super Admin wiping individual/all orders everywhere
  allowRosterEdit: boolean;      // Super Admin managing students / staff
  allowDataWipe?: boolean;       // Super Admin wipe order register (legacy/optional)
  allowMenuEdit?: boolean;       // Super Admin editing food items / pricing (legacy/optional)
  allowOrderPortal?: boolean;    // Live food ordering portal for users (legacy/optional)
  allowOrderEditing?: boolean;   // Users editing already-submitted orders (legacy/optional)
  allowSuperAdminLogin?: boolean;// Allowing non-boss admins to log in (legacy/optional)
}

export interface LoginHistoryItem {
  id: string;
  role: AdminRole;
  username: string;
  timestamp: string; // ISO string
  dateDisplay: string; // e.g. "21 Sep 2026"
  timeDisplay: string; // e.g. "09:21 PM"
  userAgent?: string;
  device?: string; // e.g. "Windows PC (Chrome)", "Android Mobile (Chrome)"
}
