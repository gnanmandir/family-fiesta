import React, { useState, useRef, useEffect } from 'react';
import { Student, GuestCredential } from '../types';
import { INITIAL_STAFF } from '../data/staff';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';
import { AlertCircle, User, Eye, EyeOff, Info } from 'lucide-react';
import { api } from '../services/api';

interface StaffLoginPageProps {
  onStaffLogin: (staffMember: Student, role: import('../types').IntakePhase) => void;
  onAdminLogin: (role?: import('../types').AdminRole) => void;
  ordersOpen?: boolean;
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({
  onStaffLogin,
  onAdminLogin,
  ordersOpen = true,
}) => {
  const [staffName, setStaffName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [guests, setGuests] = useState<GuestCredential[]>(INITIAL_STAFF);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Load staff/guests from database
  useEffect(() => {
    let mounted = true;
    const loadStaff = async () => {
      try {
        const list = await api.getGuests();
        if (mounted && list && list.length > 0) setGuests(list);
      } catch (e) {
        console.warn('Failed to fetch staff credentials:', e);
      }
    };
    loadStaff();
    return () => {
      mounted = false;
    };
  }, []);

  const normalize = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Filter staff suggestions based on name
  const matchingStaff = staffName.trim().length >= 1
    ? guests.filter((g) => {
        const q = staffName.toLowerCase().trim();
        const qNorm = normalize(staffName);
        const gName = g.guestName || (g as any).staffName || '';
        return gName.toLowerCase().includes(q) || normalize(gName).includes(qNorm);
      }).slice(0, 6)
    : [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuggestions(false);
    const cleanName = staffName.trim().toLowerCase();
    const cleanNorm = normalize(staffName);
    const cleanPwd = password.trim();

    if (!cleanName) {
      setError('Please enter name.');
      return;
    }
    if (!cleanPwd) {
      setError('Please enter password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if Admin Login was entered here
      const authResult = await api.verifyAdminLogin(cleanName, cleanPwd);
      if (authResult.success && authResult.role) {
        localStorage.setItem('admin_token', 'session_' + Date.now());
        localStorage.setItem('admin_role', authResult.role);
        setIsLoading(false);
        onAdminLogin(authResult.role);
        return;
      }
    } catch (e) {}

    // 2. Fetch fresh staff list from server if empty
    let currentGuests = guests;
    if (currentGuests.length === 0) {
      try {
        currentGuests = await api.getGuests();
        setGuests(currentGuests);
      } catch (e) {}
    }

    // 3. Match against Staff Credentials
    const matchedGuest = currentGuests.find((g) => {
      const gName = (g.guestName || (g as any).staffName || '').trim();
      return (
        gName.toLowerCase() === cleanName ||
        normalize(gName) === cleanNorm ||
        g.id.toLowerCase() === cleanName
      );
    });

    if (!matchedGuest) {
      setIsLoading(false);
      setError('Staff Name not recognized. Please check with the coordinator or admin.');
      return;
    }

    const pwdMatches = (stored: string, input: string) => {
      const s = (stored || '').trim();
      const inp = (input || '').trim();
      if (s === inp) return true;
      const numS = parseInt(s, 10);
      const numInp = parseInt(inp, 10);
      if (!isNaN(numS) && !isNaN(numInp) && numS === numInp) return true;
      return false;
    };

    if (!pwdMatches(matchedGuest.password, cleanPwd)) {
      setIsLoading(false);
      setError('Incorrect password for this staff member.');
      return;
    }

    // Successfully verified!
    const name = matchedGuest.guestName || (matchedGuest as any).staffName || 'Staff';
    const parts = name.split(' ');
    const staffStudent: Student = {
      id: matchedGuest.id,
      fullName: name,
      firstName: parts[0] || name,
      lastName: parts.slice(1).join(' '),
      parentName: 'Gurukul Staff',
      gmNo: 0,
      grade: 'Staff',
    };

    localStorage.setItem('active_student_id', staffStudent.id);
    localStorage.setItem('active_login_role', 'staff');
    setIsLoading(false);
    onStaffLogin(staffStudent, 'staff');
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[400px] bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Hero Image Logo */}
        <img
          src={familyFiestaLogo}
          alt="Family Fiesta 2026"
          className="w-48 sm:w-56 max-h-[190px] sm:max-h-[200px] object-contain mx-auto mb-3 sm:mb-4"
        />

        {/* Orders Closed / On Halt Notice Banner */}
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
          
          {/* Staff Name Field */}
          <div className="relative space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-slate-700">
              Enter Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={staffName}
                onChange={(e) => {
                  setStaffName(e.target.value);
                  setShowSuggestions(true);
                  if (error) setError(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Enter name"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                autoFocus
                autoComplete="off"
                required
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && matchingStaff.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Registered Staff ({matchingStaff.length})
                </div>
                {matchingStaff.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onMouseDown={() => {
                      setStaffName(g.guestName);
                      setShowSuggestions(false);
                      if (error) setError(null);
                      passwordInputRef.current?.focus();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/60 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-indigo-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-700">
                        {g.guestName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-slate-700">
              Enter Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Sign In as Staff</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
