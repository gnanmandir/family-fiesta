import React, { useState, useEffect } from 'react';
import { IndianRupee, Save, Plus, Trash2, Users, ShieldAlert, X, Eye, EyeOff, Lock, CheckCircle2, GraduationCap, UserCheck } from 'lucide-react';
import { api } from '../../services/api';

interface PricingManagerProps {
  adminRole?: import('../../types').AdminRole;
  allowEdit?: boolean;
}

type IntakeGroup = 'parent' | 'student' | 'guest';

export const PricingManager: React.FC<PricingManagerProps> = ({ adminRole = 'admin', allowEdit = true }) => {
  const isBoss = adminRole === 'boss';
  const isReadOnly = (!isBoss && adminRole !== 'super') || (!isBoss && !allowEdit);
  const [activeGroup, setActiveGroup] = useState<IntakeGroup>(() => {
    try {
      const saved = localStorage.getItem('pricing_manager_active_group');
      if (saved === 'parent' || saved === 'student' || saved === 'guest') return saved;
    } catch (e) {}
    return 'parent';
  });

  useEffect(() => {
    try {
      localStorage.setItem('pricing_manager_active_group', activeGroup);
    } catch (e) {}
  }, [activeGroup]);

  const [tiersByGroup, setTiersByGroup] = useState<Record<IntakeGroup, (number | '')[]>>({
    parent: [230, 230, 140, 80],
    student: [230],
    guest: [230],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // System Authorization Password Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  useEffect(() => {
    loadAllTiers();
  }, []);

  const loadAllTiers = async () => {
    setIsLoading(true);
    try {
      const [parentTiers, studentTiers, guestTiers] = await Promise.all([
        api.getRoleTiers('parent'),
        api.getRoleTiers('student'),
        api.getRoleTiers('guest'),
      ]);
      setTiersByGroup({
        parent: parentTiers && parentTiers.length > 0 ? parentTiers : [230, 230, 140, 80],
        student: studentTiers && studentTiers.length > 0 ? studentTiers : [230],
        guest: guestTiers && guestTiers.length > 0 ? guestTiers : [230],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTiers = tiersByGroup[activeGroup] || [];

  const handleInitiateSave = () => {
    if (currentTiers.length === 0) {
      alert("You must have at least one member tier.");
      return;
    }
    const hasEmpty = currentTiers.some((t) => t === '' || t === null || t === undefined || isNaN(Number(t)));
    if (hasEmpty) {
      alert("All budget fields must have a valid amount. Empty fields cannot be saved.");
      return;
    }
    setAuthPassword('');
    setAuthError('');
    setShowAuthPassword(false);
    setIsAuthModalOpen(true);
  };

  const handleAuthorizeAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = authPassword.trim();
    if (!entered) {
      setAuthError('Please enter System Authorization Password.');
      return;
    }

    let validPass = 'niruma0212';
    try {
      validPass = await api.getSystemPassword();
    } catch (err) {}

    const isAuthorized =
      entered === validPass ||
      (validPass === 'niruma0212' && entered === 'niurma0212');

    if (!isAuthorized) {
      setAuthError('Incorrect system authorization password. Access denied.');
      return;
    }

    setIsSaving(true);
    try {
      const numericTiers = currentTiers.map((t) => Number(t));
      await api.setRoleTiers(activeGroup, numericTiers);
      localStorage.setItem(`app_${activeGroup}_tiers`, JSON.stringify(numericTiers));
      if (activeGroup === 'parent') {
        localStorage.setItem('app_guest_tiers', JSON.stringify(numericTiers));
      }
      setIsAuthModalOpen(false);
      setAuthPassword('');
      setAuthError('');
      setSaveSuccessMessage(`${activeGroup.toUpperCase()} tier configuration updated successfully!`);
      setTimeout(() => setSaveSuccessMessage(''), 5000);
    } catch (err: any) {
      setAuthError(`Failed to save configuration: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTier = (index: number, val: string) => {
    const updated = [...currentTiers];
    if (val.trim() === '') {
      updated[index] = '';
    } else {
      const parsed = parseInt(val, 10);
      updated[index] = isNaN(parsed) ? '' : parsed;
    }
    setTiersByGroup((prev) => ({
      ...prev,
      [activeGroup]: updated,
    }));
  };

  const addTier = () => {
    setTiersByGroup((prev) => ({
      ...prev,
      [activeGroup]: [...(prev[activeGroup] || []), ''],
    }));
  };

  const removeTier = (index: number) => {
    setTiersByGroup((prev) => ({
      ...prev,
      [activeGroup]: (prev[activeGroup] || []).filter((_, i) => i !== index),
    }));
  };

  const getGroupLabel = (group: IntakeGroup) => {
    switch (group) {
      case 'parent':
        return 'Parents';
      case 'student':
        return 'Students';
      case 'guest':
        return 'Staff';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Loading configuration...
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
          <IndianRupee className="w-7 h-7 mr-3 text-indigo-600" />
          Allowance & Member Configuration
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl">
          Configure attendee allowances independently for each group. Manage how many members Parents, Students, and Staff can select, along with their authorized food budget.
        </p>
      </div>

      {/* Role Group Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-md mb-6 border border-slate-200/80">
        {(['parent', 'student', 'guest'] as const).map((group) => {
          const isActive = activeGroup === group;
          const count = (tiersByGroup[group] || []).length;
          return (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {group === 'parent' && <Users className="w-3.5 h-3.5" />}
              {group === 'student' && <GraduationCap className="w-3.5 h-3.5" />}
              {group === 'guest' && <UserCheck className="w-3.5 h-3.5" />}
              <span className="capitalize">{getGroupLabel(group)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'}`}>
                {count} {count === 1 ? 'mem' : 'mems'}
              </span>
            </button>
          );
        })}
      </div>

      {saveSuccessMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{saveSuccessMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>
                {getGroupLabel(activeGroup)} Configuration ({currentTiers.length} Max {currentTiers.length === 1 ? 'Member' : 'Members'})
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeGroup === 'student' && 'Students typically have 1 member allocated.'}
              {activeGroup === 'parent' && 'Parents can attend with family members (up to the tier limit).'}
              {activeGroup === 'guest' && 'Staff can be assigned custom single or multi-member allowances.'}
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={addTier}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member Tier</span>
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentTiers.map((amount, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-md">
                    Member {idx + 1}
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => removeTier(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove this member tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Budget Allocation (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={amount === '' ? '' : amount}
                    onChange={(e) => !isReadOnly && updateTier(idx, e.target.value)}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    placeholder="Enter amount..."
                    className={`block w-full pl-9 pr-3 py-2 border rounded-lg text-slate-900 font-semibold transition-all ${
                      isReadOnly
                        ? 'bg-slate-50/70 border-slate-200 cursor-default text-slate-700'
                        : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>

          {currentTiers.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">No tiers configured for {getGroupLabel(activeGroup)}.</p>
              {!isReadOnly && (
                <button
                  onClick={addTier}
                  className="mt-3 text-indigo-600 font-semibold text-sm hover:text-indigo-700 flex items-center justify-center mx-auto space-x-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add the first tier</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!isReadOnly && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleInitiateSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save {getGroupLabel(activeGroup)} Tiers</span>
            </button>
          </div>
        )}
      </div>

      {/* System Authorization Password Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">System Authorization Required</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Authorize {getGroupLabel(activeGroup)} Tier Changes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800 mb-1">⚠️ Restricted Configuration Action</p>
              Modifying tier budgets for <strong>{getGroupLabel(activeGroup)}</strong> updates allowed food allowances across ordering portals in real time. Please enter the <strong>System Authorization Password</strong> to apply these changes.
            </div>

            <form onSubmit={handleAuthorizeAndSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  System Authorization Password
                </label>
                <div className="relative">
                  <input
                    type={showAuthPassword ? 'text' : 'password'}
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="Enter system password..."
                    autoFocus
                    required
                    className={`w-full pl-3 pr-10 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      authError
                        ? 'border-red-300 focus:ring-red-200 text-red-900'
                        : 'border-slate-300 focus:ring-indigo-200 focus:border-indigo-600 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="text-xs font-semibold text-red-600 mt-1.5">{authError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Authorize & Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
