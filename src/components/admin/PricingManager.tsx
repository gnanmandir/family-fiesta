import React, { useState, useEffect } from 'react';
import { IndianRupee, Save, Plus, Trash2, Users } from 'lucide-react';
import { api } from '../../services/api';

export const PricingManager: React.FC = () => {
  const [tiers, setTiers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      const currentTiers = await api.getGuestTiers();
      setTiers(currentTiers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (tiers.length === 0) {
      alert("You must have at least one guest tier.");
      return;
    }
    setIsSaving(true);
    try {
      await api.setGuestTiers(tiers);
      localStorage.setItem('app_guest_tiers', JSON.stringify(tiers));
      alert("Guest tiers and pricing updated successfully!");
    } catch (e) {
      alert("Failed to update guest tiers.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTier = (index: number, val: string) => {
    const newTiers = [...tiers];
    newTiers[index] = parseInt(val, 10) || 0;
    setTiers(newTiers);
  };

  const addTier = () => {
    setTiers([...tiers, 100]);
  };

  const removeTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    setTiers(newTiers);
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
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
          <IndianRupee className="w-7 h-7 mr-3 text-indigo-600" />
          Guest & Pricing Configuration
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl">
          Define the maximum number of guests a student can bring by adding or removing tiers. 
          For each guest, specify the additional budget allocation they receive.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Current Configuration ({tiers.length} Max Guests)</span>
            </h3>
          </div>
          <button
            onClick={addTier}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Guest Tier</span>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tiers.map((amount, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-md">
                    Guest {idx + 1}
                  </div>
                  <button
                    onClick={() => removeTier(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove this guest tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                    value={amount}
                    onChange={(e) => updateTier(idx, e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {tiers.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">No guest tiers configured.</p>
              <button
                onClick={addTier}
                className="mt-3 text-indigo-600 font-semibold text-sm hover:text-indigo-700 flex items-center justify-center mx-auto space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add the first tier</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
