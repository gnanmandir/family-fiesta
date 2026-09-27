import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, Order } from '../types';
import { INITIAL_STUDENTS } from '../data/students';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';
import campusBg from '../assets/images/gnanmandir_campus.jpg';
import { formatNameDisplay } from '../utils/nameFormatter';
import { parseActivePhases, isPhaseActive } from '../utils/phaseUtils';
import { AlertCircle, User, Info, Calendar, ShieldAlert, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { checkLockout, recordFailedAttempt, resetAttempts } from '../services/security';

interface LoginPageProps {
  students: Student[];
  orders?: Order[];
  onStudentLogin: (student: Student, role: import('../types').IntakePhase) => void;
  onAdminLogin: (role?: import('../types').AdminRole) => void;
  ordersOpen?: boolean;
  intakePhase: import('../types').IntakePhase;
  guests?: import('../types').GuestCredential[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  students,
  orders = [],
  guests = [],
  onStudentLogin,
  onAdminLogin,
  ordersOpen = true,
  intakePhase = 'parent',
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [lockoutSec, setLockoutSec] = useState(0);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Check initial rate limit status on mount
  useEffect(() => {
    const lock = checkLockout('user_login');
    if (lock.isLocked) {
      setLockoutSec(lock.remainingSeconds);
      setError(`Security Lockout: Too many failed login attempts. Please wait ${lock.remainingSeconds}s before trying again.`);
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSec <= 0) return;
    const timer = setInterval(() => {
      setLockoutSec((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSec]);

  const toIsoDate = (val: string) => {
    const parts = (val || '').split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
  };

  // Helper to normalize names for resilient comparison
  const normalize = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Master student list combining INITIAL_STUDENTS with any dynamic students from props
  const allStudents = useMemo(() => {
    const map = new Map<string, Student>();
    
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

    // Seed with authoritative list (has all 124 students with exact birth dates)
    INITIAL_STUDENTS.forEach((s) => {
      map.set(normalize(s.fullName), { ...s });
    });

    // Merge any students passed via props
    if (Array.isArray(students) && students.length > 0) {
      students.forEach((s) => {
        const key = normalize(s.fullName);
        const existing = map.get(key);
        if (existing) {
          const gmNo = resolveGm(s, existing);
          map.set(key, {
            ...s,
            id: existing.id,
            birthDate: s.birthDate || existing.birthDate,
            gmNo,
            fullName: existing.fullName,
            grade: s.grade || existing.grade,
            parentName: s.parentName || existing.parentName,
            firstName: s.firstName || existing.firstName,
          });
        } else {
          const gmNo = resolveGm(s);
          map.set(key, {
            ...s,
            id: s.id && s.id.match(/-(\d+)$/) ? s.id : `${s.fullName}-${gmNo || 0}`,
            birthDate: s.birthDate || '',
            gmNo,
            fullName: s.fullName,
            grade: s.grade || 'Gurukul Roster',
          });
        }
      });
    }
    return Array.from(map.values());
  }, [students]);

  // Prevent browser password manager from dumping saved admin credentials into student login
  useEffect(() => {
    const purgeAutofilledAdmin = () => {
      setIdentifier((prev) => (prev.toLowerCase() === 'dada' || prev.toLowerCase() === 'admin' ? '' : prev));
      setPassword((prev) => (prev === 'dada58' ? '' : prev));
    };

    purgeAutofilledAdmin();
    const t1 = setTimeout(purgeAutofilledAdmin, 60);
    const t2 = setTimeout(purgeAutofilledAdmin, 250);
    const t3 = setTimeout(purgeAutofilledAdmin, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Filter student name suggestions (NEVER discloses GM No. or Birthdate)
  const matchingStudents = identifier.trim().length >= 1
    ? allStudents.filter((s) => {
        const q = identifier.toLowerCase().trim();
        const qNorm = normalize(identifier);
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.firstName.toLowerCase().includes(q) ||
          normalize(s.fullName).includes(qNorm)
        );
      }).slice(0, 8)
    : [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowNameSuggestions(false);

    // Pre-check rate limit lockout
    const lock = checkLockout('user_login');
    if (lock.isLocked) {
      setLockoutSec(lock.remainingSeconds);
      setError(`Security Lockout: Too many failed login attempts. Please wait ${lock.remainingSeconds}s before trying again.`);
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanIdNorm = normalize(identifier);
    const cleanPwd = password.trim();

    if (!cleanId) {
      setError('Please enter your name.');
      return;
    }

    setIsLoading(true);

    // 1. Check if Admin or Super Admin Login
    try {
      const { api } = await import('../services/api');
      const authResult = await api.verifyAdminLogin(cleanId, cleanPwd);
      if (authResult.success && authResult.role) {
        resetAttempts('user_login');
        localStorage.setItem('admin_token', 'session_' + Date.now());
        localStorage.setItem('admin_role', authResult.role);
        setIsLoading(false);
        onAdminLogin(authResult.role);
        return;
      }
    } catch (e) {}

    // 2. Check Student Login
    const matchedStudent = allStudents.find((s) => {
      const sId = s.id.toLowerCase();
      const sFull = s.fullName.toLowerCase();
      const sFirst = s.firstName.toLowerCase();
      const sNorm = normalize(s.fullName);
      const sGm = String(s.gmNo || '');

      return (
        sId === cleanId ||
        sFull === cleanId ||
        sNorm === cleanIdNorm ||
        sFirst === cleanId ||
        (sGm && (
          sGm === cleanId ||
          `gm ${sGm}` === cleanId ||
          `gm-${sGm}` === cleanId ||
          `gm${sGm}` === cleanId ||
          `#${sGm}` === cleanId
        ))
      );
    }) || allStudents.find((s) => {
      const sNorm = normalize(s.fullName);
      return sNorm.includes(cleanIdNorm) || cleanIdNorm.includes(sNorm);
    });

    if (matchedStudent) {
      // Find backup in INITIAL_STUDENTS
      const initBackup = INITIAL_STUDENTS.find(
        (i) => normalize(i.fullName) === normalize(matchedStudent.fullName)
      );

      const effectiveBirthDate = (matchedStudent.birthDate || initBackup?.birthDate || '').trim();
      let effectiveGmNo = matchedStudent.gmNo || initBackup?.gmNo || 0;
      if (!effectiveGmNo) {
        const match = (matchedStudent.id || '').match(/-(\d+)$/);
        if (match) effectiveGmNo = parseInt(match[1], 10);
      }
      if (!effectiveGmNo) {
        try {
          const regRaw = localStorage.getItem('student_gm_registry');
          if (regRaw) {
            const reg = JSON.parse(regRaw);
            effectiveGmNo = reg[matchedStudent.fullName.toLowerCase()] || (matchedStudent.id ? reg[matchedStudent.id.toLowerCase()] : 0) || 0;
          }
        } catch (e) {}
      }
      if (!effectiveGmNo && matchedStudent.fullName.toLowerCase() === 'bhavyaop') {
        effectiveGmNo = 999;
      }

      // 1. Role Detection (Traffic Cop)
      const inputClean = cleanPwd.replace(/\s+/g, '');
      let isPasswordCorrect = false;
      let role: import('../types').IntakePhase = 'parent';

      // Check Parent (Birth Date with Slashes, Dashes or Dots)
      const dateDelimInput = inputClean.replace(/[-.]/g, '/');
      const dateDelimExpected = effectiveBirthDate.replace(/[-.]/g, '/');
      if (dateDelimInput.includes('/') && dateDelimExpected) {
        if (dateDelimInput.toLowerCase() === dateDelimExpected.toLowerCase()) {
          isPasswordCorrect = true;
          role = 'parent';
        } else {
          const parts = dateDelimExpected.split('/');
          const inputParts = dateDelimInput.split('/');
          if (parts.length === 3 && inputParts.length === 3) {
            const expD = parseInt(parts[0], 10);
            const expM = parseInt(parts[1], 10);
            const expY = parseInt(parts[2], 10);

            const inD = parseInt(inputParts[0], 10);
            const inM = parseInt(inputParts[1], 10);
            const inY = parseInt(inputParts[2], 10);

            if (expD === inD && expM === inM && expY === inY) {
              isPasswordCorrect = true;
              role = 'parent';
            }
          }
        }
      }

      // Check Student (GM Number - accepts e.g. 64, 999 or GM-64)
      const cleanGmInput = cleanPwd.replace(/^gm[- ]*/i, '');
      if (!isPasswordCorrect && effectiveGmNo && String(effectiveGmNo) === cleanGmInput) {
        isPasswordCorrect = true;
        role = 'student';
      }

      if (!isPasswordCorrect) {
        const fail = recordFailedAttempt('user_login');
        setIsLoading(false);
        if (fail.isLocked) {
          setLockoutSec(fail.remainingSeconds);
          setError(`Security Alert: 5 consecutive failed attempts. Sign-in temporarily locked for ${Math.ceil(fail.remainingSeconds / 60)} minutes.`);
        } else {
          setError(`Incorrect password. (${fail.attemptsLeft} attempt${fail.attemptsLeft === 1 ? '' : 's'} remaining)`);
        }
        return;
      }

      // 2. Check if this student/parent has an existing order for THIS SPECIFIC ROLE
      const normName = normalize(matchedStudent.fullName);
      let existingOrder = (orders || []).find((o) => {
        if ((o.orderType || 'parent') !== role) return false;
        if (o.studentId && matchedStudent.id && o.studentId.toLowerCase() === matchedStudent.id.toLowerCase()) return true;
        if (o.fullName && normalize(o.fullName) === normName) return true;
        if (o.studentName && normalize(o.studentName) === normName) return true;
        return false;
      });

      if (!existingOrder) {
        try {
          const { api } = await import('../services/api');
          const onlineOrder = await api.getOrderByStudent(matchedStudent.id, role);
          if (onlineOrder && (onlineOrder.orderType || 'parent') === role) {
            existingOrder = onlineOrder;
          }
        } catch (e) {}
      }

      // If they already placed an order, ALWAYS allow them to sign in
      // so they can view their order summary and download their receipt!
      if (!existingOrder) {
        const activePhases = parseActivePhases(intakePhase);

        // Overall Orders Closed Check
        if (!ordersOpen || activePhases.length === 0) {
          setIsLoading(false);
          setError('Online ordering is closed. No prior order was found for this student.');
          return;
        }

        // Check if user's role (parent or student) is allowed right now
        if (!isPhaseActive(activePhases, role)) {
          setIsLoading(false);
          if (role === 'student') {
            setError('Student ordering is currently not active.');
          } else if (role === 'parent') {
            setError('Parent ordering is currently not active.');
          } else {
            setError('Ordering is currently not active for your role.');
          }
          return;
        }
      }

      // Successfully authenticated!
      resetAttempts('user_login');
      const finalStudent: Student = {
        ...matchedStudent,
        birthDate: effectiveBirthDate,
        gmNo: effectiveGmNo,
        fullName: initBackup?.fullName || matchedStudent.fullName,
      };

      localStorage.setItem('active_student_id', finalStudent.id);
      setIsLoading(false);
      onStudentLogin(finalStudent, role);
    } else {
      const fail = recordFailedAttempt('user_login');
      setIsLoading(false);
      if (fail.isLocked) {
        setLockoutSec(fail.remainingSeconds);
        setError(`Security Alert: 5 consecutive failed attempts. Sign-in temporarily locked for ${Math.ceil(fail.remainingSeconds / 60)} minutes.`);
      } else {
        setError(`Name not found. Please search and select your name from suggestions. (${fail.attemptsLeft} attempt${fail.attemptsLeft === 1 ? '' : 's'} remaining)`);
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-start bg-slate-50 lg:bg-white overflow-hidden selection:bg-blue-500/20">
      
      {/* Right-Side Campus Photo Background (Desktop & Tablets) */}
      <div className="hidden lg:block absolute inset-y-0 right-0 w-[56%] xl:w-[62%] h-full overflow-hidden pointer-events-none z-0">
        <img
          src={campusBg}
          alt="Gnan Mandir Gurukul Campus"
          className="w-full h-full object-cover object-center filter brightness-[1.03] contrast-[1.04]"
        />
        {/* Butter-smooth feathered gradient transition into white on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-36 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/60 to-transparent" />
      </div>

      {/* Ambient Campus Photo Background for Mobile */}
      <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src={campusBg}
          alt="Gnan Mandir Gurukul Campus"
          className="w-full h-full object-cover object-center opacity-15 blur-[1.5px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white/95" />
      </div>

      {/* Main Content Layout Container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-10 lg:pl-16 xl:pl-28 max-w-xl lg:max-w-2xl">
        
        {/* Top spacer */}
        <div className="hidden sm:block pt-2" />

        {/* Floating Login Card */}
        <div className="my-auto w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-100/90 text-center animate-in fade-in zoom-in-95 duration-200">
          
          {/* Logo & Secure Badge */}
          <div className="flex flex-col items-center">
            <img
              src={familyFiestaLogo}
              alt="Family Fiesta"
              className="w-24 sm:w-28 h-auto object-contain mx-auto mb-2.5 filter drop-shadow-xs"
            />
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50/90 text-blue-700 border border-blue-200/60 text-[11px] font-bold tracking-wider uppercase mb-2 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>SECURE ACCESS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              “Family Fiesta” Food Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1 mb-5">
              Gurukul RSVP & Food Coupon System
            </p>
          </div>

          {/* Orders Closed Notice Banner */}
          {!ordersOpen && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50/95 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5 font-medium animate-in fade-in shadow-xs text-left">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <span className="font-bold text-amber-950 block text-[12px] leading-snug">
                  🎪 Online Ordering Has Concluded
                </span>
                <span className="block text-amber-800 leading-relaxed text-[11px]">
                  If you have already placed your order, sign in below to view your summary and download your coupons receipt.
                </span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} autoComplete="off" className="w-full space-y-4">
            
            {/* Decoy hidden inputs to prevent unwanted browser autofill */}
            <input type="text" name="decoy_username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="decoy_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

            {/* Field 1: Student Name */}
            <div className="relative space-y-1.5 text-left">
              <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                USERNAME / STUDENT NAME
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="student_search_filter_query"
                  id="student_search_filter_query"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setShowNameSuggestions(true);
                    if (error) setError(null);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowNameSuggestions(false), 200);
                  }}
                  placeholder="Enter Student Name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  autoFocus
                  autoComplete="off"
                  data-lpignore="true"
                  required
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showNameSuggestions && matchingStudents.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Matching Students ({matchingStudents.length})
                  </div>
                  {matchingStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setIdentifier(s.fullName);
                        setShowNameSuggestions(false);
                        if (error) setError(null);
                        passwordInputRef.current?.focus();
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                          {formatNameDisplay(s.fullName)}
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">
                        {s.grade}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Field 2: Password */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  name="student_birth_date"
                  id="student_birth_date"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter GM No. or DD/MM/YYYY"
                  className="w-full pl-4 pr-20 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  autoComplete="off"
                  data-lpignore="true"
                  required
                />
                
                {/* Right controls: Calendar picker + Eye toggle */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        if (datePickerRef.current) {
                          if (typeof datePickerRef.current.showPicker === 'function') {
                            datePickerRef.current.showPicker();
                          } else {
                            datePickerRef.current.click();
                          }
                        }
                      } catch (e) {
                        datePickerRef.current?.click();
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Select birth date from calendar"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Hidden native datepicker */}
                <input
                  ref={datePickerRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={toIsoDate(password)}
                  className="sr-only absolute pointer-events-none opacity-0"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const [y, m, d] = val.split('-');
                      if (y && m && d) {
                        setPassword(`${d}/${m}/${y}`);
                        if (error) setError(null);
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center space-x-2 font-medium animate-in fade-in text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || lockoutSec > 0}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center ${
                  lockoutSec > 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed opacity-90'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer disabled:opacity-60'
                }`}
              >
                {lockoutSec > 0 ? (
                  <span className="flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Security Lockout ({lockoutSec}s)</span>
                  </span>
                ) : isLoading ? (
                  'Signing In...'
                ) : (
                  'Sign in to Portal'
                )}
              </button>
            </div>

            {/* Security Subtext */}
            <div className="flex items-center justify-center space-x-1.5 text-[11.5px] text-slate-400 font-medium pt-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Authorized Gurukul attendees & personnel only</span>
            </div>
          </form>
        </div>

        {/* Footer & Administrative Link */}
        <div className="pt-6 pb-2 text-center lg:text-left text-[11px] sm:text-xs text-slate-400 space-y-1">
          <div>
            © 2026 “Family Fiesta” Food Portal • Gnan Mandir • All Rights Reserved.
          </div>
          <div className="flex items-center justify-center lg:justify-start space-x-2 text-[11px]">
            <button
              type="button"
              onClick={() => onAdminLogin()}
              className="text-slate-400 hover:text-blue-600 transition-colors underline underline-offset-2 cursor-pointer"
            >
              Admin Access
            </button>
            <span>•</span>
            <span className="text-slate-400">Gnan Mandir Gurukul</span>
          </div>
        </div>

      </div>
    </div>
  );
};
