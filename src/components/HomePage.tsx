import React, { useEffect } from 'react';
import { Student } from '../types';
import { Check, Users, User, ArrowRight, ShieldCheck, Lock, GraduationCap, UserCheck } from 'lucide-react';
import { formatNameDisplay } from '../utils/nameFormatter';

import { 
  calculateAllowedBudget, 
  getDynamicTiers
} from '../utils/budget';

interface HomePageProps {
  students?: Student[];
  selectedStudent: Student | null;
  onSelectStudent?: (student: Student | null) => void;
  peopleCount: number;
  onChangePeopleCount: (count: number) => void;
  onStartOrdering: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
  ordersOpen?: boolean;
  role?: import('../types').IntakePhase;
  roleTiers?: number[];
}

export const HomePage: React.FC<HomePageProps> = ({
  selectedStudent,
  peopleCount,
  onChangePeopleCount,
  onStartOrdering,
  ordersOpen = true,
  role,
  roleTiers,
}) => {
  const effectiveRole = role || (typeof window !== 'undefined' ? (localStorage.getItem('active_login_role') as any) : null) || 'parent';
  const dynamicTiers = getDynamicTiers(effectiveRole, roleTiers);
  const allowedBudget = calculateAllowedBudget(peopleCount, dynamicTiers, effectiveRole);

  useEffect(() => {
    if (peopleCount > dynamicTiers.length || peopleCount < 1) {
      onChangePeopleCount(1);
    }
  }, [dynamicTiers.length, peopleCount, onChangePeopleCount]);

  const getTierIncrementText = (num: number) => {
    if (num === 1) return 'BASE TIER';
    return `+₹${dynamicTiers[num - 1]} ADDED`;
  };

  const getMemberLabel = (count: number) => {
    if (effectiveRole === 'student') {
      return count === 1 ? 'Student' : 'Students';
    }
    if (effectiveRole === 'staff' || effectiveRole === 'guest') {
      return count === 1 ? 'Staff Member' : 'Staff Members';
    }
    return count === 1 ? 'Guest' : 'Guests';
  };

  // If ordering is closed, show a notice instead of the normal page
  if (!ordersOpen) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20 animate-in fade-in duration-500">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 sm:p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Ordering is Closed</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            No prior order was found for your account. Online ordering for Family Fiesta has concluded.
          </p>
          <p className="text-xs text-slate-400">
            If you believe this is a mistake, please contact an organizer.
          </p>
        </div>
      </div>
    );
  }

  const isSingleTier = dynamicTiers.length === 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 animate-in fade-in duration-500">
      
      {/* Student/User Pill */}
      {selectedStudent && (
        <div className="flex mb-4">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            {effectiveRole === 'student' ? (
              <GraduationCap className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
            ) : (effectiveRole === 'guest' || effectiveRole === 'staff') ? (
              <UserCheck className="w-4 h-4 text-amber-600 stroke-[2.5]" />
            ) : (
              <User className="w-4 h-4 text-orange-500 stroke-[2.5]" />
            )}
            <span className="text-sm font-medium text-slate-400 capitalize">
              {(effectiveRole === 'guest' || effectiveRole === 'staff') ? 'Staff' : effectiveRole}:
            </span>
            <span className="text-sm font-bold text-slate-700">{formatNameDisplay(selectedStudent.fullName)}</span>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 sm:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isSingleTier ? 'Authorized Meal Allowance' : 'Select Number of Attendees'}
            </h2>
          </div>
          <div className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full self-start sm:self-auto">
            {isSingleTier ? `1 ${getMemberLabel(1)} Tier` : `Max ${dynamicTiers.length} ${getMemberLabel(dynamicTiers.length)}`}
          </div>
        </div>

        {/* Cards Grid */}
        <div className={
          isSingleTier
            ? "max-w-sm mb-5"
            : `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(4, dynamicTiers.length)} gap-3 sm:gap-4 mb-5`
        }>
          {dynamicTiers.map((_, index) => {
            const num = index + 1;
            const isSelected = peopleCount === num;
            const budget = calculateAllowedBudget(num, dynamicTiers, effectiveRole);

            return (
              <button
                key={num}
                type="button"
                onClick={() => onChangePeopleCount(num)}
                className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all duration-300 group ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30 border-0 scale-[1.02]'
                    : 'bg-white border-2 border-slate-100 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                {/* Top Row: Icon & Radio */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500 border border-slate-100'}`}>
                    {num === 1 ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-white bg-white' : 'border-slate-200'}`}>
                    {isSelected && <Check className="w-3 h-3 text-blue-600 stroke-[3]" />}
                  </div>
                </div>
                
                {/* Middle: Title & Tier */}
                <div className="mb-6">
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-3xl font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {num}
                    </span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                      {getMemberLabel(num)}
                    </span>
                  </div>
                  <div className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {getTierIncrementText(num)}
                  </div>
                </div>
                
                {/* Bottom: Allowance & Price */}
                <div className="flex items-end justify-between">
                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    Allowance
                  </span>
                  <span className={`text-xl font-mono font-black ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                    ₹{budget}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                Total Authorized Meal Allowance
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-mono font-black text-slate-900">
                  ₹{allowedBudget}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedStudent}
            onClick={onStartOrdering}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          >
            <span>Browse Menu & Order</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
