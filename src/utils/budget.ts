// Tiered budget configuration for Family Fiesta
export const getDynamicTiers = (): number[] => {
  try {
    const raw = localStorage.getItem('app_guest_tiers');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [230, 230, 140, 80]; // Default fallback
};

export const calculateAllowedBudget = (peopleCount: number): number => {
  const tiers = getDynamicTiers();
  const maxGuests = tiers.length;
  const count = Math.max(1, Math.min(maxGuests, Number(peopleCount) || 1));
  
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += tiers[i];
  }
  return total;
};

export const getBudgetFormulaDisplay = (peopleCount: number): string => {
  const tiers = getDynamicTiers();
  const maxGuests = tiers.length;
  const count = Math.max(1, Math.min(maxGuests, Number(peopleCount) || 1));
  
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`₹${tiers[i]}`);
  }
  return parts.join(' + ');
};
