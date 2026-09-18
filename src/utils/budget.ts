// Tiered budget configuration for Family Fiesta
export const getDynamicTiers = (role?: string, customTiers?: number[]): number[] => {
  if (Array.isArray(customTiers) && customTiers.length > 0) {
    return customTiers;
  }
  const effectiveRole = role || (typeof window !== 'undefined' ? localStorage.getItem('active_login_role') : null) || 'parent';
  try {
    const roleKey = `app_${effectiveRole}_tiers`;
    const raw = localStorage.getItem(roleKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Fallback for staff to check legacy app_guest_tiers
    if (effectiveRole === 'staff' || effectiveRole === 'guest') {
      const staffRaw = localStorage.getItem('app_staff_tiers') || localStorage.getItem('app_guest_tiers');
      if (staffRaw) {
        const parsed = JSON.parse(staffRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    // Fallback for parent to check legacy app_guest_tiers
    if (effectiveRole === 'parent') {
      const legacyRaw = localStorage.getItem('app_parent_tiers') || localStorage.getItem('app_guest_tiers');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {}

  if (effectiveRole === 'student') return [230];
  if (effectiveRole === 'guest' || effectiveRole === 'staff') return [230];
  return [230, 230, 140, 80]; // Default fallback for parent
};

export const calculateAllowedBudget = (peopleCount: number, customTiers?: number[], role?: string): number => {
  const tiers = getDynamicTiers(role, customTiers);
  const maxGuests = tiers.length;
  const count = Math.max(1, Math.min(maxGuests, Number(peopleCount) || 1));
  
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += tiers[i];
  }
  return total;
};

export const getBudgetFormulaDisplay = (peopleCount: number, customTiers?: number[], role?: string): string => {
  const tiers = getDynamicTiers(role, customTiers);
  const maxGuests = tiers.length;
  const count = Math.max(1, Math.min(maxGuests, Number(peopleCount) || 1));
  
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`₹${tiers[i]}`);
  }
  return parts.join(' + ');
};
