import React, { useState, useEffect } from 'react';
import {
  Student,
  FoodItem,
  CartItem,
  Order,
  OrderStatus,
  OrderSchedule,
  AdminRole,
  SystemControls,
} from './types';
import { getStudentDisplayName } from './data/students';
import {
  getOrCreateDeviceId,
  fetchStudents,
  getCachedStudents,
  fetchMenuItems,
  getCachedMenuItems,
  saveMenuItems,
  fetchOrders,
  getCachedOrders,
  saveOrder,
  updateOrderDetails,
  updateOrderStatus,
  deleteOrder,
  deleteCompletedOrders,
  getDeviceOrder,
  clearDeviceLock,
  resetAllData,
  deleteAllOrders,
  getStudentExistingOrder,
  getCachedSystemControls,
  setCachedSystemControls,
} from './services/storage';
import { api } from './services/api';
import { isTursoConfigured } from './services/turso';

import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { MenuPage } from './components/MenuPage';
import { CartDrawer } from './components/CartDrawer';
import { OrderConfirmation } from './components/OrderConfirmation';
import { AlreadySubmittedView } from './components/AlreadySubmittedView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { LoginPage } from './components/LoginPage';
import { calculateAllowedBudget } from './utils/budget';
import { evaluateSchedule, isScheduleDone, DEFAULT_SCHEDULE } from './utils/schedule';

export default function App() {
  // Navigation & Core States
  const [currentView, setCurrentView] = useState<
    'login' | 'home' | 'menu' | 'confirmation' | 'submitted' | 'admin'
  >(() => {
    const savedAdminToken = localStorage.getItem('admin_token');
    const savedView = localStorage.getItem('app_current_view') as any;
    if (savedAdminToken || savedView === 'admin') return 'admin';
    const activeStudent = localStorage.getItem('active_student_id');
    if (activeStudent && savedView && ['home', 'menu', 'confirmation', 'submitted'].includes(savedView)) {
      return savedView;
    }
    return activeStudent ? 'home' : 'login';
  });

  // Application Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [guests, setGuests] = useState<import('./types').GuestCredential[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('orders_open');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });
  const [rawOrdersOpen, setRawOrdersOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('orders_open');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });
  const [orderSchedule, setOrderSchedule] = useState<OrderSchedule>(DEFAULT_SCHEDULE);
  const [intakePhase, setIntakePhase] = useState<import('./types').IntakePhase>('parent');
  const [activeRole, setActiveRole] = useState<import('./types').IntakePhase>(() => {
    return (localStorage.getItem('active_login_role') as import('./types').IntakePhase) || 'parent';
  });

  // Selection & Cart States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    const activeStudentId = localStorage.getItem('active_student_id');
    if (!activeStudentId) return null;
    const cached = getCachedStudents();
    return cached.find((s) => s.id === activeStudentId) || null;
  });

  const [peopleCount, setPeopleCount] = useState<number>(() => {
    const saved = localStorage.getItem('active_people_count');
    return saved ? parseInt(saved, 10) || 1 : 1;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('active_cart');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    try {
      const savedNum = localStorage.getItem('active_order_number');
      const activeLoginRole = (localStorage.getItem('active_login_role') as import('./types').IntakePhase) || 'parent';
      if (savedNum) {
        const cached = getCachedOrders();
        const found = cached.find((o) => o.orderNumber === savedNum);
        if (found && (found.orderType || 'parent') === activeLoginRole) {
          return found;
        }
      }
    } catch (e) {}
    return null;
  });
  const [isEditingOrder, setIsEditingOrder] = useState<boolean>(false);

  // Admin Auth States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('admin_token'));
  });
  const [adminRole, setAdminRole] = useState<AdminRole | null>(() => {
    return (localStorage.getItem('admin_role') as AdminRole) || null;
  });
  const [systemControls, setSystemControls] = useState<SystemControls>(() => {
    return getCachedSystemControls();
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  // On App Mount: Initialize data & check One Device One Order rule
  useEffect(() => {
    getOrCreateDeviceId();

    const buildFallbackStudent = (ord: Order): Student => {
      const full = ord.fullName || ord.studentName || 'Student';
      const parts = full.split(' ');
      return {
        id: ord.studentId,
        fullName: full,
        firstName: parts[0] || 'Student',
        lastName: parts.slice(1).join(' '),
        parentName: ord.parentName || '',
        gmNo: 0,
        grade: '',
      };
    };

    // Initial immediate load from cache
    const cachedStudents = getCachedStudents();
    setStudents(cachedStudents);
    setMenuItems(getCachedMenuItems());
    const cachedOrders = getCachedOrders();
    setOrders(cachedOrders);

    const savedAdminToken = localStorage.getItem('admin_token');
    const savedView = localStorage.getItem('app_current_view');

    // 1. If Admin session is active, strictly stay in Admin panel!
    if (savedAdminToken || savedView === 'admin') {
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
    } else {
      // 2. Student session flow
      const activeStudentId = localStorage.getItem('active_student_id');
      if (activeStudentId && cachedStudents.length > 0) {
        const st = cachedStudents.find((s) => s.id === activeStudentId);
        if (st) {
          setSelectedStudent(st);
          const activeLoginRole = (localStorage.getItem('active_login_role') as import('./types').IntakePhase) || 'parent';
          const existingOrder = cachedOrders.find(
            (o) =>
              ((o.studentId && o.studentId.toLowerCase() === activeStudentId.toLowerCase()) ||
              (o.fullName && o.fullName.toLowerCase() === st.fullName.toLowerCase()) ||
              (o.studentName && o.studentName.toLowerCase() === st.fullName.toLowerCase())) &&
              (o.orderType || 'parent') === activeLoginRole
          );
          if (existingOrder) {
            setActiveOrder(existingOrder);
            if (savedView === 'confirmation') {
              setCurrentView('confirmation');
            } else {
              setCurrentView('submitted');
            }
          } else {
            setActiveOrder(null);
            if (savedView === 'menu') {
              setCurrentView('menu');
            } else {
              setCurrentView('home');
            }
          }
        } else {
          setSelectedStudent(null);
          setActiveOrder(null);
          setCurrentView('login');
        }
      } else if (!activeStudentId) {
        setSelectedStudent(null);
        setActiveOrder(null);
        setCurrentView('login');
      }
    }

    // Asynchronously fetch fresh data from backend
    const loadBackendData = async () => {
      try {
        const [stList, menuList, orderList, isOpen, schedule, currentPhase, guestsList, parentTiers, studentTiers, guestTiers, controls] = await Promise.all([
          fetchStudents(),
          fetchMenuItems(),
          fetchOrders(),
          api.getOrderingStatus(),
          api.getOrderSchedule(),
          api.getIntakePhase(),
          api.getGuests(),
          api.getRoleTiers('parent'),
          api.getRoleTiers('student'),
          api.getRoleTiers('guest'),
          api.getSystemControls(),
        ]);
        setStudents(stList);
        setGuests(guestsList);
        setMenuItems(menuList);
        setOrders(orderList);
        setIntakePhase(currentPhase);
        if (controls) setSystemControls(controls);
        if (parentTiers) localStorage.setItem('app_parent_tiers', JSON.stringify(parentTiers));
        if (studentTiers) localStorage.setItem('app_student_tiers', JSON.stringify(studentTiers));
        if (guestTiers) {
          localStorage.setItem('app_guest_tiers', JSON.stringify(guestTiers));
          localStorage.setItem('app_staff_tiers', JSON.stringify(guestTiers));
        }

        // Check if schedule is already completed/done in real time
        if (schedule && schedule.enabled && isScheduleDone(schedule)) {
          const isStartOnly = schedule.startTime && !schedule.endTime;
          const targetOpen = isStartOnly ? true : false;
          api.setOrderSchedule(DEFAULT_SCHEDULE).catch(() => {});
          api.setOrderingStatus(targetOpen).catch(() => {});
          setRawOrdersOpen(targetOpen);
          setOrderSchedule(DEFAULT_SCHEDULE);
          setOrdersOpen(targetOpen);
        } else {
          setRawOrdersOpen(isOpen);
          setOrderSchedule(schedule);
          const effective = evaluateSchedule(schedule, isOpen);
          setOrdersOpen(effective.isOpen);
        }
        localStorage.setItem('app_guest_tiers', JSON.stringify(dynamicTiers));

        const currentAdminToken = localStorage.getItem('admin_token');
        const currentSavedView = localStorage.getItem('app_current_view');
        if (currentAdminToken || currentSavedView === 'admin') {
          setIsAdminLoggedIn(true);
          setCurrentView('admin');
          return;
        }

        // Check if active student already has an order
        const savedStudentId = localStorage.getItem('active_student_id');
        if (savedStudentId) {
          const foundSt = stList.find((s) => s.id === savedStudentId);
          if (foundSt) {
            setSelectedStudent(foundSt);
          }
          const activeLoginRole = (localStorage.getItem('active_login_role') as import('./types').IntakePhase) || 'parent';
          const studentOrder = orderList.find(
            (o) =>
              ((o.studentId && o.studentId.toLowerCase() === savedStudentId.toLowerCase()) ||
              (foundSt && o.fullName && o.fullName.toLowerCase() === foundSt.fullName.toLowerCase()) ||
              (foundSt && o.studentName && o.studentName.toLowerCase() === foundSt.fullName.toLowerCase())) &&
              (o.orderType || 'parent') === activeLoginRole
          );
          if (studentOrder) {
            setActiveOrder(studentOrder);
            if (currentSavedView === 'confirmation') {
              setCurrentView('confirmation');
            } else {
              setCurrentView('submitted');
            }
          } else {
            setActiveOrder(null);
            if (currentSavedView === 'menu') {
              setCurrentView('menu');
            } else if (foundSt) {
              setCurrentView((prev) => (prev === 'menu' ? 'menu' : 'home'));
            }
          }
        } else {
          setSelectedStudent(null);
          setActiveOrder(null);
          setCurrentView('login');
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };

    loadBackendData();

    // Check URL path or hash for /admin or ?admin
    if (
      window.location.pathname === '/admin' ||
      window.location.hash === '#admin' ||
      window.location.search.includes('admin')
    ) {
      setIsAdminLoginModalOpen(true);
    }

    // Hidden Keyboard Shortcuts for Admin Portal:
    // - F2 (single key, recommended)
    // - Alt + A
    // - Ctrl + Shift + L
    // - Ctrl + Shift + A
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltA = e.altKey && (e.key === 'A' || e.key === 'a');
      const isCtrlShiftL = e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l');
      const isCtrlShiftA = e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a');
      const isF2 = e.key === 'F2';

      if (isAltA || isCtrlShiftL || isCtrlShiftA || isF2) {
        e.preventDefault();
        setIsAdminLoginModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync orders with backend using SSE only when dedicated backend URL is configured
  useEffect(() => {
    if (isTursoConfigured || !import.meta.env.VITE_API_URL) return;

    try {
      const sseUrl = (import.meta.env.VITE_API_URL || '/api') + '/orders/stream';
      const evtSource = new EventSource(sseUrl);

      evtSource.onmessage = async (event) => {
        if (event.data === 'connected') return;
        try {
          const freshOrders = await fetchOrders();
          setOrders(freshOrders);
          if (activeOrder) {
            const updated = freshOrders.find((o) => o.orderNumber === activeOrder.orderNumber);
            if (updated) {
              setActiveOrder(updated);
            }
          }
        } catch (e) {
          // Fallback silently
        }
      };

      return () => evtSource.close();
    } catch (e) {
      // Fallback silently
    }
  }, [activeOrder]);

  // Smart background sync: view-aware & throttled to protect database egress
  useEffect(() => {
    const syncLatestData = async () => {
      // 1. Completely stop network activity when browser tab is inactive / phone screen locked
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        // 2. Fast background sync when user is viewing the Admin Dashboard
        if (currentView === 'admin') {
          const [freshOrders, isOpen, schedule, currentPhase, freshGuests] = await Promise.all([
            fetchOrders(),
            api.getOrderingStatus(),
            api.getOrderSchedule(),
            api.getIntakePhase(),
            api.getGuests(),
          ]);
          if (freshOrders) {
            setOrders(freshOrders);
          }
          if (freshGuests) {
            setGuests(freshGuests);
          }
          if (currentPhase) {
            setIntakePhase(currentPhase);
          }

          if (schedule && schedule.enabled && isScheduleDone(schedule)) {
            const isStartOnly = schedule.startTime && !schedule.endTime;
            const targetOpen = isStartOnly ? true : false;
            api.setOrderSchedule(DEFAULT_SCHEDULE).catch(() => {});
            api.setOrderingStatus(targetOpen).catch(() => {});
            setRawOrdersOpen(targetOpen);
            setOrderSchedule(DEFAULT_SCHEDULE);
            setOrdersOpen(targetOpen);
          } else {
            setRawOrdersOpen((prev) => (prev === isOpen ? prev : isOpen));
            setOrderSchedule((prev) => {
              if (
                prev &&
                prev.enabled === schedule.enabled &&
                prev.startTime === schedule.startTime &&
                prev.endTime === schedule.endTime
              ) {
                return prev;
              }
              return schedule;
            });
            const effective = evaluateSchedule(schedule, isOpen);
            setOrdersOpen((prev) => (prev === effective.isOpen ? prev : effective.isOpen));
          }
        } else {
          // 3. For student views: NEVER download the full orders database!
          // Only check ordering open/closed status at a relaxed interval
          const [isOpen, schedule, currentPhase] = await Promise.all([
            api.getOrderingStatus(),
            api.getOrderSchedule(),
            api.getIntakePhase(),
          ]);
          if (currentPhase) {
            setIntakePhase(currentPhase);
          }

          if (schedule && schedule.enabled && isScheduleDone(schedule)) {
            const isStartOnly = schedule.startTime && !schedule.endTime;
            const targetOpen = isStartOnly ? true : false;
            api.setOrderSchedule(DEFAULT_SCHEDULE).catch(() => {});
            api.setOrderingStatus(targetOpen).catch(() => {});
            setRawOrdersOpen(targetOpen);
            setOrderSchedule(DEFAULT_SCHEDULE);
            setOrdersOpen(targetOpen);
          } else {
            setRawOrdersOpen((prev) => (prev === isOpen ? prev : isOpen));
            setOrderSchedule((prev) => {
              if (
                prev &&
                prev.enabled === schedule.enabled &&
                prev.startTime === schedule.startTime &&
                prev.endTime === schedule.endTime
              ) {
                return prev;
              }
              return schedule;
            });
            const effective = evaluateSchedule(schedule, isOpen);
            setOrdersOpen((prev) => (prev === effective.isOpen ? prev : effective.isOpen));
          }
        }
      } catch (e) {
        // Silent
      }
    };

    // 4. Fast polling interval for Admin: 4s in Admin (Turso is fast & free), 60s in student views
    const pollInterval = currentView === 'admin' ? 4000 : 60000;
    const intervalId = setInterval(syncLatestData, pollInterval);
    return () => clearInterval(intervalId);
  }, [currentView]);

  // 5. On tab regain focus / visibility, do an immediate fresh fetch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (currentView === 'admin') {
          fetchOrders().then((o) => o && setOrders(o)).catch(() => {});
        } else if (currentView === 'menu') {
          fetchMenuItems().then((m) => m && m.length > 0 && setMenuItems(m)).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentView]);

  // 6. Keep effective ordersOpen updated and auto-remove completed schedule
  useEffect(() => {
    const updateEffective = async () => {
      if (!orderSchedule || !orderSchedule.enabled) return;

      if (isScheduleDone(orderSchedule)) {
        const isStartOnly = orderSchedule.startTime && !orderSchedule.endTime;
        const targetOpen = isStartOnly ? true : false;
        try {
          await api.setOrderSchedule(DEFAULT_SCHEDULE);
          await api.setOrderingStatus(targetOpen);
        } catch (e) {
          // Silent
        }
        setOrderSchedule(DEFAULT_SCHEDULE);
        setRawOrdersOpen(targetOpen);
        setOrdersOpen(targetOpen);
      } else {
        const effective = evaluateSchedule(orderSchedule, rawOrdersOpen);
        setOrdersOpen(effective.isOpen);
      }
    };

    updateEffective();
    const ticker = setInterval(updateEffective, 4000);
    return () => clearInterval(ticker);
  }, [orderSchedule, rawOrdersOpen]);

  // Persist session navigation state to localStorage so refresh keeps current view
  useEffect(() => {
    localStorage.setItem('app_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('active_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('active_people_count', String(peopleCount));
  }, [peopleCount]);

  useEffect(() => {
    if (activeOrder?.orderNumber) {
      localStorage.setItem('active_order_number', activeOrder.orderNumber);
    } else {
      localStorage.removeItem('active_order_number');
    }
  }, [activeOrder]);

  // Handler for student select in Home
  const handleSelectStudent = async (student: Student | null) => {
    if (!student) {
      setSelectedStudent(null);
      localStorage.removeItem('active_student_id');
      return;
    }

    localStorage.setItem('active_student_id', student.id);

    // Check if student already placed an order on any device / browser
    const currentRole = localStorage.getItem('active_login_role') || 'parent';
    let existing =
      orders.find(
        (o) =>
          ((o.studentId && o.studentId.toLowerCase() === student.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === student.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === student.fullName.toLowerCase())) &&
          (o.orderType || 'parent') === currentRole
      );

    if (!existing) {
      const fallback = getStudentExistingOrder(student.id, orders, student.fullName, currentRole);
      if (fallback && (fallback.orderType || 'parent') === currentRole) {
        existing = fallback;
      }
    }

    if (!existing) {
      try {
        const onlineOrder = await api.getOrderByStudent(student.id, currentRole);
        if (onlineOrder && (onlineOrder.orderType || 'parent') === currentRole) existing = onlineOrder;
      } catch (e) {}
    }

    if (existing) {
      setActiveOrder(existing);
      setSelectedStudent(student);
      setCurrentView('submitted');
    } else {
      setActiveOrder(null);
      setSelectedStudent(student);
    }
  };

  // Handler to start ordering
  const handleStartOrdering = async () => {
    if (!selectedStudent) return;

    if (isEditingOrder) {
      setCurrentView('menu');
      return;
    }

    // Safety check before entering menu: verify student has no existing order
    const currentRole = localStorage.getItem('active_login_role') || 'parent';
    let existing =
      orders.find(
        (o) =>
          ((o.studentId && o.studentId.toLowerCase() === selectedStudent.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === selectedStudent.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === selectedStudent.fullName.toLowerCase())) &&
          (o.orderType || 'parent') === currentRole
      );

    if (!existing) {
      const fallback = getStudentExistingOrder(selectedStudent.id, orders, selectedStudent.fullName, currentRole);
      if (fallback && (fallback.orderType || 'parent') === currentRole) {
        existing = fallback;
      }
    }

    if (!existing) {
      try {
        const onlineOrder = await api.getOrderByStudent(selectedStudent.id, currentRole);
        if (onlineOrder && (onlineOrder.orderType || 'parent') === currentRole) existing = onlineOrder;
      } catch (e) {}
    }

    if (existing) {
      setActiveOrder(existing);
      setCurrentView('submitted');
      return;
    }

    setCart([]);
    fetchMenuItems().then((m) => m && m.length > 0 && setMenuItems(m)).catch(() => {});
    setCurrentView('menu');
  };

  // Cart Handlers
  const handleAddToCart = (food: FoodItem, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.food.id !== food.id);
      }
      const existingIndex = prev.findIndex((item) => item.food.id === food.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity };
        return updated;
      } else {
        return [...prev, { food, quantity }];
      }
    });
  };

  const handleUpdateCartQuantity = (foodId: string, delta: number) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.food.id === foodId);
      if (existingIndex > -1) {
        const newQty = prev[existingIndex].quantity + delta;
        if (newQty <= 0) {
          return prev.filter((item) => item.food.id !== foodId);
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else if (delta > 0) {
        const foundFood = menuItems.find((m) => m.id === foodId);
        if (foundFood) {
          return [...prev, { food: foundFood, quantity: delta }];
        }
      }
      return prev;
    });
  };

  const handleRemoveCartItem = (foodId: string) => {
    setCart((prev) => prev.filter((item) => item.food.id !== foodId));
  };

  // Edit Existing Order Handler (Infinite modifications permitted)
  const handleEditOrder = () => {
    if (!activeOrder) return;

    // Ensure selectedStudent is restored from activeOrder or students list
    let student = selectedStudent;
    if (!student) {
      student = students.find((s) => s.id === activeOrder.studentId) || null;
      if (!student) {
        const full = activeOrder.fullName || activeOrder.studentName || 'Student';
        const parts = full.split(' ');
        student = {
          id: activeOrder.studentId,
          fullName: full,
          firstName: parts[0] || 'Student',
          lastName: parts.slice(1).join(' '),
          parentName: activeOrder.parentName || '',
          gmNo: 0,
          grade: '',
        };
      }
      setSelectedStudent(student);
    }

    const initialCart: CartItem[] = activeOrder.items.map((it) => {
      const food = menuItems.find((m) => m.id === it.id) || {
        id: it.id,
        name: it.name,
        price: it.price,
        category: 'Dishes',
        description: '',
        image: '',
        isVeg: true,
        isAvailable: true,
      };
      return { food, quantity: it.quantity };
    });
    setCart(initialCart);
    setPeopleCount(activeOrder.peopleCount || 1);
    setIsEditingOrder(true);
    setCurrentView('home');
  };

  // Place or Update Order Handler
  const handlePlaceOrder = async () => {
    const currentStudent =
      selectedStudent ||
      (activeOrder
        ? {
            id: activeOrder.studentId,
            fullName: activeOrder.fullName || activeOrder.studentName || 'Student',
            firstName: (activeOrder.fullName || activeOrder.studentName || 'Student').split(' ')[0],
            lastName: '',
            parentName: activeOrder.parentName || '',
            gmNo: 0,
            grade: '',
          }
        : null);

    if (!currentStudent || cart.length === 0) return;

    const orderItems = cart.map((c) => ({
      id: c.food.id,
      name: c.food.name,
      price: c.food.price,
      quantity: c.quantity,
      total: c.food.price * c.quantity,
      portion: c.food.portionValue && c.food.portionUnit ? `${c.food.portionValue} ${c.food.portionUnit}` : undefined,
    }));

    const totalAmount = orderItems.reduce((sum, i) => sum + i.total, 0);

    // If editing existing order OR student already has an order for this SPECIFIC role, update existing
    let existingToUpdate = (isEditingOrder && activeOrder && (activeOrder.orderType || 'parent') === activeRole) ? activeOrder : null;
    if (!existingToUpdate) {
      existingToUpdate =
        orders.find(
          (o) =>
            ((o.studentId && o.studentId.toLowerCase() === currentStudent.id.toLowerCase()) ||
            (o.fullName && o.fullName.toLowerCase() === currentStudent.fullName.toLowerCase()) ||
            (o.studentName && o.studentName.toLowerCase() === currentStudent.fullName.toLowerCase())) &&
            (o.orderType || 'parent') === activeRole
        ) || null;

      if (!existingToUpdate) {
        try {
          const online = await api.getOrderByStudent(currentStudent.id, activeRole);
          if (online && (online.orderType || 'parent') === activeRole) existingToUpdate = online;
        } catch (e) {}
      }
    }

    if (existingToUpdate) {
      const now = new Date();
      const newDateDisplay = now.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const newTimeDisplay = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const updatedOrder: Order = {
        ...existingToUpdate,
        peopleCount,
        allowedBudget: calculateAllowedBudget(peopleCount, undefined, activeRole),
        items: orderItems,
        totalAmount,
        dateDisplay: newDateDisplay,
        timeDisplay: newTimeDisplay,
        createdAt: now.toISOString(),
        isEdited: true,
        orderType: activeRole || existingToUpdate.orderType || 'parent',
      };

      const saved = await updateOrderDetails(existingToUpdate.orderNumber, updatedOrder);
      const fresh = await fetchOrders();
      setOrders(fresh);
      setActiveOrder(saved || updatedOrder);
      setIsEditingOrder(false);
      setCart([]);
      setIsCartOpen(false);
      setCurrentView('confirmation');
      return;
    }

    // Otherwise, first-time order placement:
    const devId = getOrCreateDeviceId();
    const orderNum = 'FLM-2026-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();

    const newOrder: Order = {
      orderNumber: orderNum,
      studentId: currentStudent.id,
      studentName: getStudentDisplayName(currentStudent),
      parentName: currentStudent.parentName,
      fullName: currentStudent.fullName,
      deviceId: devId,
      peopleCount,
      allowedBudget: calculateAllowedBudget(peopleCount, undefined, activeRole),
      items: orderItems,
      totalAmount,
      status: 'Pending',
      createdAt: now.toISOString(),
      dateDisplay: now.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      timeDisplay: now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      orderType: activeRole || (localStorage.getItem('active_login_role') as import('./types').IntakePhase) || intakePhase || 'parent',
    };

    try {
      const saved = await saveOrder(newOrder);
      const fresh = await fetchOrders();
      setOrders(fresh);
      setActiveOrder(saved || newOrder);
      setIsEditingOrder(false);
      setCart([]);
      setIsCartOpen(false);
      setCurrentView('confirmation');
    } catch (err: any) {
      alert(err?.message || 'An order for this student already exists. Showing registered order.');
      const fresh = await fetchOrders();
      setOrders(fresh);
      const existing = fresh.find(
        (o) =>
          ((o.studentId && o.studentId.toLowerCase() === currentStudent.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === currentStudent.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === currentStudent.fullName.toLowerCase())) &&
          (o.orderType || 'parent') === activeRole
      );
      if (existing) {
        setActiveOrder(existing);
        setIsEditingOrder(false);
        setCart([]);
        setIsCartOpen(false);
        setCurrentView('submitted');
      }
    }
  };

  // Login & Session Handlers
  const handleStudentLogin = async (student: Student, role: import('./types').IntakePhase = 'parent') => {
    setSelectedStudent(student);
    localStorage.setItem('active_student_id', student.id);
    localStorage.setItem('active_login_role', role);
    setActiveRole(role);
    if (role === 'student') {
      setPeopleCount(1);
      localStorage.setItem('active_people_count', '1');
    }

    // Fetch latest fresh menu items from backend
    fetchMenuItems().then((m) => m && m.length > 0 && setMenuItems(m)).catch(() => {});

    // Clean any prior device lock from another student
    const devLock = getDeviceOrder();
    if (devLock && devLock.studentId !== student.id) {
      localStorage.removeItem('jusso_device_order_v6');
    }

    // 1. Check in currently loaded orders state
    const currentRole = role || 'parent';
    let existing =
      orders.find(
        (o) =>
          ((o.studentId && o.studentId.toLowerCase() === student.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === student.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === student.fullName.toLowerCase())) && 
          (o.orderType || 'parent') === currentRole
      );

    if (!existing) {
      const fallback = getStudentExistingOrder(student.id, orders, student.fullName, currentRole);
      if (fallback && (fallback.orderType || 'parent') === currentRole) {
        existing = fallback;
      }
    }

    // 2. Query backend directly (handles new browser / incognito window)
    if (!existing) {
      try {
        const onlineOrder = await api.getOrderByStudent(student.id, currentRole);
        if (onlineOrder && (onlineOrder.orderType || 'parent') === currentRole) existing = onlineOrder;
      } catch (e) {}
    }

    if (existing) {
      setActiveOrder(existing);
      setCurrentView('submitted');
    } else if (intakePhase !== currentRole && intakePhase !== 'closed') {
      // If they haven't ordered, and the phase is not theirs, they are blocked!
      setSelectedStudent(null);
      localStorage.removeItem('active_student_id');
      localStorage.removeItem('active_login_role');
      // Wait, we need to show an error, but App.tsx doesn't have a login error state.
      // It's better to let LoginPage handle this block!
      // But we are here now. Let's just send them to 'home' and handle it or let LoginPage block it.
      // Actually, if we just send them to 'home', they will see it. Let's let them go to home, but wait, if phase is student and parent logs in, they can't order!
      // I'll update LoginPage to block this instead.
      setCurrentView('home');
    } else if (!ordersOpen || intakePhase === 'closed') {
      // Orders are closed and student has no order — show closed notice
      setActiveOrder(null);
      setCurrentView('home');
    } else {
      setActiveOrder(null);
      setCurrentView('home');
    }
  };

  const handleAdminLogin = (role?: AdminRole) => {
    const assignedRole = role || (localStorage.getItem('admin_role') as AdminRole) || 'admin';
    localStorage.setItem('admin_token', 'admin_session_' + Date.now());
    localStorage.setItem('admin_role', assignedRole);
    setAdminRole(assignedRole);
    setIsAdminLoggedIn(true);
    setCurrentView('admin');
  };

  const handleSignOut = () => {
    localStorage.removeItem('active_student_id');
    localStorage.removeItem('jusso_device_order_v6');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('app_current_view');
    localStorage.removeItem('active_cart');
    localStorage.removeItem('active_people_count');
    localStorage.removeItem('active_order_number');
    localStorage.removeItem('active_login_role');
    setSelectedStudent(null);
    setActiveOrder(null);
    setActiveRole('parent');
    setIsAdminLoggedIn(false);
    setAdminRole(null);
    setCart([]);
    setIsEditingOrder(false);
    setCurrentView('login');
  };

  // Admin Actions
  const handleAdminLoginSuccess = (role: AdminRole) => {
    localStorage.setItem('admin_token', 'admin_session_' + Date.now());
    localStorage.setItem('admin_role', role);
    setAdminRole(role);
    setIsAdminLoggedIn(true);
    setIsAdminLoginModalOpen(false);
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminRole(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('app_current_view');
    setCurrentView('login');
  };

  const handleUpdateOrderStatus = async (orderNumber: string, status: OrderStatus) => {
    await updateOrderStatus(orderNumber, status);
    const fresh = await fetchOrders();
    setOrders(fresh);
  };

  const handleDeleteOrder = async (orderNumber: string) => {
    await deleteOrder(orderNumber);
    const fresh = await fetchOrders();
    setOrders(fresh);
  };

  const handleDeleteCompletedOrders = async () => {
    await deleteCompletedOrders();
    const fresh = await fetchOrders();
    setOrders(fresh);
  };

  const handleRefreshOrders = async () => {
    try {
      const [fresh, isOpen, schedule] = await Promise.all([
        fetchOrders(),
        api.getOrderingStatus(),
        api.getOrderSchedule(),
      ]);
      if (fresh) setOrders(fresh);
      setRawOrdersOpen(isOpen);
      setOrderSchedule(schedule);
      const effective = evaluateSchedule(schedule, isOpen);
      setOrdersOpen(effective.isOpen);
    } catch (e) {
      console.error('Failed to refresh orders:', e);
    }
  };

  const handleSaveMenuItems = async (items: FoodItem[]) => {
    await saveMenuItems(items);
    setMenuItems(items);
  };

  const handleStudentUpdated = (updatedStudent: Student) => {
    setStudents((prev) => {
      const idx = prev.findIndex(
        (s) => s.id === updatedStudent.id || s.fullName.toLowerCase() === updatedStudent.fullName.toLowerCase()
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedStudent;
        return copy;
      }
      return [...prev, updatedStudent];
    });
  };

  const handleStudentDeleted = async (studentId: string, fullName?: string) => {
    const { deleteStudent } = await import('./services/storage');
    await deleteStudent(studentId, fullName);
    const norm = fullName ? fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    setStudents((prev) =>
      prev.filter(
        (s) =>
          s.id.toLowerCase() !== studentId.toLowerCase() &&
          (!norm || s.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') !== norm)
      )
    );
    // Immediately filter orders in React state so both parent & student orders are removed instantly
    setOrders((prev) =>
      prev.filter(
        (o) =>
          o.studentId?.toLowerCase() !== studentId.toLowerCase() &&
          (!norm ||
            ((o.fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '') !== norm &&
             (o.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '') !== norm))
      )
    );
    const freshOrders = await fetchOrders();
    if (freshOrders) {
      setOrders(freshOrders);
    }
    if (
      activeOrder &&
      (activeOrder.studentId?.toLowerCase() === studentId.toLowerCase() ||
        (norm && (activeOrder.fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === norm))
    ) {
      setActiveOrder(null);
      localStorage.removeItem('active_order_number');
      localStorage.removeItem('app_device_order');
    }
  };

  const handleWipeStudentOrder = async (student: Student, order?: Order) => {
    const { wipeStudentOrder } = await import('./services/storage');
    await wipeStudentOrder(student.id, student.fullName, order?.orderNumber);
    const fresh = await fetchOrders();
    setOrders(fresh);
    if (
      activeOrder &&
      (activeOrder.orderNumber === order?.orderNumber ||
        (activeOrder.studentId && student.id && activeOrder.studentId.toLowerCase() === student.id.toLowerCase()) ||
        (activeOrder.fullName && activeOrder.fullName.toLowerCase() === student.fullName.toLowerCase()))
    ) {
      setActiveOrder(null);
      localStorage.removeItem('active_order_number');
      localStorage.removeItem('app_device_order');
    }
  };

  const handleResetDeviceLock = async () => {
    await clearDeviceLock();
    setActiveOrder(null);
    localStorage.setItem('admin_token', 'admin_session_' + Date.now());
    localStorage.setItem('app_current_view', 'admin');
    setIsAdminLoggedIn(true);
    setCurrentView('admin');
  };

  const handleClearAllOrders = async () => {
    await handleClearOrdersByRole('all');
  };

  const handleClearOrdersByRole = async (role: 'parent' | 'student' | 'staff' | 'all') => {
    try {
      if (role === 'all') {
        await deleteAllOrders();
        setOrders([]);
        setActiveOrder(null);
        localStorage.removeItem('active_order_number');
        localStorage.removeItem('app_device_order');
      } else {
        const { deleteOrdersByRole } = await import('./services/storage');
        await deleteOrdersByRole(role === 'staff' ? 'staff' : role);
        const fresh = await fetchOrders();
        setOrders(fresh);
        if (activeOrder) {
          const oType = activeOrder.orderType || 'parent';
          const matches =
            role === 'parent'
              ? oType === 'parent'
              : role === 'staff'
              ? oType === 'staff' || oType === 'guest'
              : oType === role;
          if (matches) {
            setActiveOrder(null);
            localStorage.removeItem('active_order_number');
            localStorage.removeItem('app_device_order');
          }
        }
      }
      // Ensure admin remains firmly on admin dashboard
      localStorage.setItem('admin_token', 'admin_session_' + Date.now());
      localStorage.setItem('app_current_view', 'admin');
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
    } catch (e) {
      console.error('Error clearing orders by role:', e);
    }
  };

  const handleToggleOrdering = async (isOpen: boolean) => {
    try {
      try {
        localStorage.setItem('orders_open', String(isOpen));
      } catch (e) {}
      setRawOrdersOpen(isOpen);
      setOrdersOpen(isOpen);

      // If halting ordering, turn off active schedule so it doesn't immediately re-open
      if (!isOpen && orderSchedule?.enabled) {
        const offSchedule: OrderSchedule = { ...orderSchedule, enabled: false };
        setOrderSchedule(offSchedule);
        api.setOrderSchedule(offSchedule).catch(() => {});
      }

      await api.setOrderingStatus(isOpen);
      const effective = evaluateSchedule(!isOpen ? { ...orderSchedule, enabled: false } : orderSchedule, isOpen);
      setOrdersOpen(effective.isOpen);
    } catch (e) {
      console.error('Error toggling ordering status:', e);
      try {
        localStorage.setItem('orders_open', String(isOpen));
      } catch (e2) {}
      setRawOrdersOpen(isOpen);
      setOrdersOpen(isOpen);
    }
  };

  const handleSaveSchedule = async (newSchedule: OrderSchedule) => {
    try {
      await api.setOrderSchedule(newSchedule);
      setOrderSchedule(newSchedule);
      if (newSchedule.enabled) {
        await api.setOrderingStatus(true);
        setRawOrdersOpen(true);
      }
      const effective = evaluateSchedule(newSchedule, true);
      setOrdersOpen(effective.isOpen);
    } catch (e) {
      console.error('Error saving order schedule:', e);
      alert('Failed to update intake schedule. Please try again.');
      throw e;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/20 selection:text-slate-900 relative overflow-x-hidden">

      {/* Header - shown on main screens, hidden on login and admin */}
      {currentView !== 'admin' && currentView !== 'login' && (
        <Header
          currentView={currentView}
          onNavigateHome={() => {
            if (currentView !== 'submitted' && currentView !== 'login') {
              setCurrentView('home');
            }
          }}
          onOpenAdmin={() => {
            if (isAdminLoggedIn) {
              setCurrentView('admin');
            } else {
              setIsAdminLoginModalOpen(true);
            }
          }}
          onSignOut={handleSignOut}
          selectedStudentName={
            selectedStudent
              ? getStudentDisplayName(selectedStudent)
              : activeOrder
              ? activeOrder.fullName || activeOrder.studentName
              : undefined
          }
          cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {/* View Switcher */}
      <main className="relative z-10">
        {currentView === 'login' && (
          <LoginPage
            students={students}
            guests={guests}
            onStudentLogin={handleStudentLogin}
            onAdminLogin={handleAdminLogin}
            ordersOpen={ordersOpen}
            intakePhase={intakePhase}
          />
        )}

        {currentView === 'home' && (
          <HomePage
            students={students}
            selectedStudent={selectedStudent}
            onSelectStudent={handleSelectStudent}
            peopleCount={peopleCount}
            onChangePeopleCount={setPeopleCount}
            onStartOrdering={handleStartOrdering}
            onOpenAdmin={() => setIsAdminLoginModalOpen(true)}
            onSignOut={handleSignOut}
            ordersOpen={ordersOpen}
            role={activeRole}
          />
        )}

        {currentView === 'menu' && (
          <MenuPage
            menuItems={menuItems}
            cart={cart}
            selectedStudent={
              selectedStudent || {
                id: activeOrder?.studentId || 'student',
                fullName: activeOrder?.fullName || activeOrder?.studentName || 'Student',
                firstName: (activeOrder?.fullName || activeOrder?.studentName || 'Student').split(' ')[0],
                lastName: '',
                parentName: activeOrder?.parentName || '',
                gmNo: 0,
                grade: '',
              }
            }
            peopleCount={peopleCount}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onPlaceOrder={handlePlaceOrder}
            isEditing={isEditingOrder}
          />
        )}

        {(currentView === 'confirmation' || currentView === 'submitted') && activeOrder && (
          <OrderConfirmation
            order={activeOrder}
            onRefreshOrder={(up) => setActiveOrder(up)}
            onEditOrder={(ordersOpen && (intakePhase === activeOrder.orderType || activeOrder.orderType === undefined)) ? handleEditOrder : undefined}
            ordersOpen={ordersOpen && (intakePhase === activeOrder.orderType || activeOrder.orderType === undefined)}
          />
        )}

        {currentView === 'admin' && isAdminLoggedIn && (
          <AdminDashboard
            orders={orders}
            students={students}
            menuItems={menuItems}
            adminRole={adminRole || 'admin'}
            systemControls={systemControls}
            onUpdateSystemControls={async (controls) => {
              setSystemControls(controls);
              await api.setSystemControls(controls);
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onDeleteCompletedOrders={handleDeleteCompletedOrders}
            onSaveMenuItems={handleSaveMenuItems}
            onStudentUpdated={handleStudentUpdated}
            onStudentDeleted={handleStudentDeleted}
            onWipeStudentOrder={handleWipeStudentOrder}
            onResetDeviceLock={handleResetDeviceLock}
            onClearAllOrders={handleClearAllOrders}
            onClearOrdersByRole={handleClearOrdersByRole}
            onExitAdmin={handleAdminLogout}
            onLogoutAdmin={handleAdminLogout}
            ordersOpen={ordersOpen}
            orderSchedule={orderSchedule}
            onToggleOrdering={handleToggleOrdering}
            onSaveSchedule={handleSaveSchedule}
            onRefreshOrders={handleRefreshOrders}
            intakePhase={intakePhase}
            onSetIntakePhase={async (phase) => {
              await api.setIntakePhase(phase);
              setIntakePhase(phase);
            }}
          />
        )}
      </main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        selectedStudent={
          selectedStudent || {
            id: activeOrder?.studentId || 'student',
            fullName: activeOrder?.fullName || activeOrder?.studentName || 'Student',
            firstName: (activeOrder?.fullName || activeOrder?.studentName || 'Student').split(' ')[0],
            lastName: '',
            parentName: activeOrder?.parentName || '',
            gmNo: 0,
            grade: '',
          }
        }
        peopleCount={peopleCount}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Password Modal for Admin */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

    </div>
  );
}
