import React, { useState, useEffect } from 'react';
import {
  Student,
  FoodItem,
  CartItem,
  Order,
  OrderStatus,
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
} from './services/storage';
import { api } from './services/api';

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
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
      if (savedNum) {
        const cached = getCachedOrders();
        return cached.find((o) => o.orderNumber === savedNum) || null;
      }
    } catch (e) {}
    return null;
  });
  const [isEditingOrder, setIsEditingOrder] = useState<boolean>(false);

  // Admin Auth States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('admin_token'));
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
          const existingOrder = cachedOrders.find(
            (o) =>
              (o.studentId && o.studentId.toLowerCase() === activeStudentId.toLowerCase()) ||
              (o.fullName && o.fullName.toLowerCase() === st.fullName.toLowerCase()) ||
              (o.studentName && o.studentName.toLowerCase() === st.fullName.toLowerCase())
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
        const [stList, menuList, orderList] = await Promise.all([
          fetchStudents(),
          fetchMenuItems(),
          fetchOrders(),
        ]);
        setStudents(stList);
        setMenuItems(menuList);
        setOrders(orderList);

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
          const studentOrder = orderList.find(
            (o) =>
              (o.studentId && o.studentId.toLowerCase() === savedStudentId.toLowerCase()) ||
              (foundSt && o.fullName && o.fullName.toLowerCase() === foundSt.fullName.toLowerCase()) ||
              (foundSt && o.studentName && o.studentName.toLowerCase() === foundSt.fullName.toLowerCase())
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

  // Sync orders with backend using SSE for live status updates
  useEffect(() => {
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
  }, [activeOrder]);

  // Periodic background sync: ensures any menu price/availability/item change in Admin reflects on all devices within seconds
  useEffect(() => {
    const syncLatestData = async () => {
      try {
        const [freshMenu, freshOrders] = await Promise.all([
          fetchMenuItems(),
          fetchOrders(),
        ]);
        if (freshMenu && freshMenu.length > 0) {
          setMenuItems(freshMenu);
        }
        if (freshOrders && freshOrders.length > 0) {
          setOrders(freshOrders);
        }
      } catch (e) {
        // Silent
      }
    };

    const intervalId = setInterval(syncLatestData, 5000);
    return () => clearInterval(intervalId);
  }, []);

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
    let existing =
      orders.find(
        (o) =>
          (o.studentId && o.studentId.toLowerCase() === student.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === student.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === student.fullName.toLowerCase())
      ) || getStudentExistingOrder(student.id, orders, student.fullName);

    if (!existing) {
      try {
        const onlineOrder = await api.getOrderByStudent(student.id);
        if (onlineOrder) existing = onlineOrder;
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
    let existing =
      orders.find(
        (o) =>
          (o.studentId && o.studentId.toLowerCase() === selectedStudent.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === selectedStudent.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === selectedStudent.fullName.toLowerCase())
      ) || getStudentExistingOrder(selectedStudent.id, orders, selectedStudent.fullName);

    if (!existing) {
      try {
        const onlineOrder = await api.getOrderByStudent(selectedStudent.id);
        if (onlineOrder) existing = onlineOrder;
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
    }));

    const totalAmount = orderItems.reduce((sum, i) => sum + i.total, 0);

    // If editing existing order OR student already has an order, ALWAYS update existing instead of creating duplicate!
    let existingToUpdate = (isEditingOrder && activeOrder) ? activeOrder : null;
    if (!existingToUpdate) {
      existingToUpdate =
        orders.find(
          (o) =>
            (o.studentId && o.studentId.toLowerCase() === currentStudent.id.toLowerCase()) ||
            (o.fullName && o.fullName.toLowerCase() === currentStudent.fullName.toLowerCase()) ||
            (o.studentName && o.studentName.toLowerCase() === currentStudent.fullName.toLowerCase())
        ) || null;

      if (!existingToUpdate) {
        try {
          const online = await api.getOrderByStudent(currentStudent.id);
          if (online) existingToUpdate = online;
        } catch (e) {}
      }
    }

    if (existingToUpdate) {
      const updatedOrder: Order = {
        ...existingToUpdate,
        peopleCount,
        allowedBudget: calculateAllowedBudget(peopleCount),
        items: orderItems,
        totalAmount,
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
      allowedBudget: calculateAllowedBudget(peopleCount),
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
          (o.studentId && o.studentId.toLowerCase() === currentStudent.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === currentStudent.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === currentStudent.fullName.toLowerCase())
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
  const handleStudentLogin = async (student: Student) => {
    setSelectedStudent(student);
    localStorage.setItem('active_student_id', student.id);

    // Fetch latest fresh menu items from backend
    fetchMenuItems().then((m) => m && m.length > 0 && setMenuItems(m)).catch(() => {});

    // Clean any prior device lock from another student
    const devLock = getDeviceOrder();
    if (devLock && devLock.studentId !== student.id) {
      localStorage.removeItem('jusso_device_order_v6');
    }

    // 1. Check in currently loaded orders state
    let existing =
      orders.find(
        (o) =>
          (o.studentId && o.studentId.toLowerCase() === student.id.toLowerCase()) ||
          (o.fullName && o.fullName.toLowerCase() === student.fullName.toLowerCase()) ||
          (o.studentName && o.studentName.toLowerCase() === student.fullName.toLowerCase())
      ) || getStudentExistingOrder(student.id, orders, student.fullName);

    // 2. Query backend directly (handles new browser / incognito window)
    if (!existing) {
      try {
        const onlineOrder = await api.getOrderByStudent(student.id);
        if (onlineOrder) existing = onlineOrder;
      } catch (e) {}
    }

    if (existing) {
      setActiveOrder(existing);
      setCurrentView('submitted');
    } else {
      setActiveOrder(null);
      setCurrentView('home');
    }
  };

  const handleAdminLogin = () => {
    localStorage.setItem('admin_token', 'admin_session_' + Date.now());
    setIsAdminLoggedIn(true);
    setCurrentView('admin');
  };

  const handleSignOut = () => {
    localStorage.removeItem('active_student_id');
    localStorage.removeItem('jusso_device_order_v6');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('app_current_view');
    localStorage.removeItem('active_cart');
    localStorage.removeItem('active_people_count');
    localStorage.removeItem('active_order_number');
    setSelectedStudent(null);
    setActiveOrder(null);
    setIsAdminLoggedIn(false);
    setCart([]);
    setIsEditingOrder(false);
    setCurrentView('login');
  };

  // Admin Actions
  const handleAdminLoginSuccess = () => {
    localStorage.setItem('admin_token', 'admin_session_' + Date.now());
    setIsAdminLoggedIn(true);
    setIsAdminLoginModalOpen(false);
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('admin_token');
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

  const handleSaveMenuItems = async (items: FoodItem[]) => {
    await saveMenuItems(items);
    setMenuItems(items);
  };

  const handleResetDeviceLock = async () => {
    await clearDeviceLock();
    setActiveOrder(null);
    setCurrentView('home');
  };

  const handleClearAllOrders = async () => {
    await deleteAllOrders();
    setOrders([]);
    setActiveOrder(null);
    setCurrentView('home');
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
            onStudentLogin={handleStudentLogin}
            onAdminLogin={handleAdminLogin}
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
            onEditOrder={handleEditOrder}
          />
        )}

        {currentView === 'admin' && isAdminLoggedIn && (
          <AdminDashboard
            orders={orders}
            students={students}
            menuItems={menuItems}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onDeleteCompletedOrders={handleDeleteCompletedOrders}
            onSaveMenuItems={handleSaveMenuItems}
            onResetDeviceLock={handleResetDeviceLock}
            onClearAllOrders={handleClearAllOrders}
            onExitAdmin={handleAdminLogout}
            onLogoutAdmin={handleAdminLogout}
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
