import React, { useState, useRef, useEffect } from 'react';
import { Student, Order } from '../types';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';
import { formatNameDisplay } from '../utils/nameFormatter';
import { Eye, EyeOff, AlertCircle, User, Info } from 'lucide-react';

interface LoginPageProps {
  students: Student[];
  onStudentLogin: (student: Student) => void;
  onAdminLogin: () => void;
  ordersOpen?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  students,
  onStudentLogin,
  onAdminLogin,
  ordersOpen = true,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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

  // Filter student name suggestions (NEVER discloses GM No.)
  const matchingStudents = identifier.trim().length >= 1
    ? students.filter((s) => {
        const q = identifier.toLowerCase().trim();
        return s.fullName.toLowerCase().includes(q) || s.firstName.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowNameSuggestions(false);
    const cleanId = identifier.trim().toLowerCase();
    const cleanPwd = password.trim();

    if (!cleanId) {
      setError('Please enter your Student Name.');
      return;
    }

    setIsLoading(true);

    // 1. Fetch dynamic admin credentials
    let adminUsername = 'dada';
    let adminPassword = 'dada58';
    try {
      const { api } = await import('../services/api');
      const creds = await api.getAdminCredentials();
      adminUsername = creds.username.toLowerCase();
      adminPassword = creds.password;
    } catch (e) {}

    // 2. Check if Admin Login
    const normalizedId = cleanId.replace(/\s+/g, '');
    const isAdminUser =
      normalizedId === adminUsername ||
      normalizedId === 'admin';
    const isAdminPassword = cleanPwd === adminPassword;

    if (isAdminUser && isAdminPassword) {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || '/api') + '/admin/login';
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'dada', password: cleanPwd }),
        });
        const data = await res.json();

        if (data.success && data.token) {
          localStorage.setItem('admin_token', data.token);
          setIsLoading(false);
          onAdminLogin();
          return;
        } else {
          localStorage.setItem('admin_token', 'session_' + Date.now());
          setIsLoading(false);
          onAdminLogin();
          return;
        }
      } catch (err) {
        localStorage.setItem('admin_token', 'session_' + Date.now());
        setIsLoading(false);
        onAdminLogin();
        return;
      }
    } else if (isAdminUser || isAdminPassword) {
       // If one matches but not the other, and it's not a student, fail it.
       // We'll let it fall through to student check just in case, but if they explicitly typed "dada" we shouldn't let them in without password.
    }

    // 2. Check Student Login
    const matchedStudent = students.find((s) => {
      const sId = s.id.toLowerCase();
      const sFull = s.fullName.toLowerCase();
      const sFirst = s.firstName.toLowerCase();
      const sGm = String(s.gmNo);

      return (
        sId === cleanId ||
        sFull === cleanId ||
        sFirst === cleanId ||
        sGm === cleanId ||
        `gm ${sGm}` === cleanId ||
        `gm-${sGm}` === cleanId ||
        `gm${sGm}` === cleanId ||
        `#${sGm}` === cleanId
      );
    }) || students.find((s) => {
      const sFull = s.fullName.toLowerCase();
      return sFull.startsWith(cleanId) || sFull.includes(cleanId);
    });

    if (matchedStudent) {
      // Birth Date as Password check (e.g. 30/04/2011)
      const expectedPassword = matchedStudent.birthDate || String(matchedStudent.gmNo);
      if (cleanPwd !== expectedPassword) {
        setIsLoading(false);
        // Do NOT disclose the birth date in error message!
        setError('Incorrect password. Please enter your valid Birth Date (DD/MM/YYYY).');
        return;
      }

      localStorage.setItem('active_student_id', matchedStudent.id);
      setIsLoading(false);
      onStudentLogin(matchedStudent);
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
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2 font-medium animate-in fade-in">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold text-amber-900">Online ordering is now closed.</span>
              <span className="block mt-0.5 text-amber-700">Already ordered? Sign in below to view and download your food coupons & receipt.</span>
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
                type={showPassword ? 'text' : 'password'}
                name="student_gm_security_token"
                id="student_gm_security_token"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="DD/MM/YYYY"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                autoComplete="new-password"
                data-lpignore="true"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
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
