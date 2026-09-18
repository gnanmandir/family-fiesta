import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, Order } from '../types';
import { INITIAL_STUDENTS } from '../data/students';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';
import { formatNameDisplay } from '../utils/nameFormatter';
import { AlertCircle, User, Info, Calendar } from 'lucide-react';

interface LoginPageProps {
  students: Student[];
  onStudentLogin: (student: Student, role: import('../types').IntakePhase) => void;
  onAdminLogin: (role?: 'super' | 'admin') => void;
  ordersOpen?: boolean;
  intakePhase: import('../types').IntakePhase;
  guests?: import('../types').GuestCredential[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  students,
  guests = [],
  onStudentLogin,
  onAdminLogin,
  ordersOpen = true,
  intakePhase = 'parent',
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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

    // Merge staff/guests as pseudo-students
    if (Array.isArray(guests) && guests.length > 0) {
      guests.forEach((g) => {
        const name = (g as any).staffName || g.guestName;
        const pseudoStudent: Student = {
          id: g.id,
          fullName: name,
          firstName: name,
          lastName: '',
          parentName: 'Staff',
          gmNo: 0,
          grade: 'Staff',
          birthDate: g.password, // We store the staff password here to simplify matching
        };
        map.set(normalize(name), pseudoStudent);
      });
    }

    return Array.from(map.values());
  }, [students, guests]);

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
    const cleanId = identifier.trim().toLowerCase();
    const cleanIdNorm = normalize(identifier);
    const cleanPwd = password.trim();

    if (!cleanId) {
      setError('Please enter your Student Name.');
      return;
    }

    setIsLoading(true);

    // 1. Check if Admin or Super Admin Login
    try {
      const { api } = await import('../services/api');
      const authResult = await api.verifyAdminLogin(cleanId, cleanPwd);
      if (authResult.success && authResult.role) {
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

      // Check Staff / Guest
      if (matchedStudent.grade === 'Staff' || matchedStudent.grade === 'Guest') {
        if (cleanPwd === effectiveBirthDate) {
          isPasswordCorrect = true;
          role = 'staff';
        }
      } else {
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
      }

      if (!isPasswordCorrect) {
        setIsLoading(false);
        setError('Incorrect password. For Parents: enter Birth Date (DD/MM/YYYY). For Students: enter GM No.');
        return;
      }

      // 2. Phase Blocking Rules
      const isStaffRole = role === 'staff' || role === 'guest';
      const isStaffPhase = intakePhase === 'staff' || intakePhase === 'guest';

      if (intakePhase === 'parent' && role === 'student') {
        setIsLoading(false);
        setError('Student ordering is not yet open. Currently open for Parents only.');
        return;
      }
      if (intakePhase === 'student' && role === 'parent') {
        if (ordersOpen) {
          setIsLoading(false);
          setError('Currently open for Student ordering only. Please enter your GM No. to log in as Student.');
          return;
        }
      }
      if (intakePhase === 'parent' && isStaffRole) {
        setIsLoading(false);
        setError('Staff ordering is not yet open.');
        return;
      }
      if (intakePhase === 'student' && isStaffRole) {
        setIsLoading(false);
        setError('Staff ordering is not yet open.');
        return;
      }
      if (isStaffPhase && (role === 'parent' || role === 'student')) {
        setIsLoading(false);
        setError('Parent/Student ordering is now closed. Currently open for Staff.');
        return;
      }

      // Successfully authenticated!
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
      setIsLoading(false);
      setError('Student not found. Please search and select your name from the suggestions.');
    }
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[390px] bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xl">
        
        {/* Hero Image Logo */}
        <img
          src={familyFiestaLogo}
          alt="Family Fiesta 2026"
          className="w-48 sm:w-56 max-h-[190px] sm:max-h-[200px] object-contain mx-auto mb-3 sm:mb-4"
        />

        {/* Orders Closed Notice Banner */}
        {!ordersOpen && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5 font-medium animate-in fade-in shadow-xs text-left">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950 block text-[12.5px] leading-snug">
                🎪 Online Ordering Has Concluded for Family Fiesta 2026!
              </span>
              <span className="block text-amber-800 leading-relaxed text-[11.5px]">
                Thank you for the wonderful response! If you have already placed your order, please sign in below to download your official receipt. See you at the fiesta! ✨
              </span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} autoComplete="off" className="w-full space-y-3">
          
          {/* Decoy hidden inputs */}
          <input type="text" name="decoy_username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
          <input type="password" name="decoy_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

          {/* Student Name */}
          <div className="relative space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-slate-600">
              Student Name
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
                placeholder="Enter student name..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                autoFocus
                autoComplete="off"
                data-lpignore="true"
                required
              />
            </div>

            {/* Autocomplete Dropdown */}
            {showNameSuggestions && matchingStudents.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Suggestions ({matchingStudents.length})
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
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-indigo-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">
                        {formatNameDisplay(s.fullName)}
                      </span>
                    </div>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium">
                      {s.grade}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-slate-600">
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type="text"
                name="student_birth_date"
                id="student_birth_date"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="DD/MM/YYYY"
                className="w-full pl-3.5 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors font-medium"
                autoComplete="off"
                data-lpignore="true"
                required
              />
              {/* Calendar picker button */}
              <div
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center group"
                title="Select birth date from calendar"
              >
                <Calendar className="w-4 h-4 pointer-events-none group-hover:text-indigo-600" />
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Select birth date from calendar"
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-');
                      if (y && m && d) {
                        setPassword(`${d}/${m}/${y}`);
                        if (error) setError(null);
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center space-x-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Button */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
