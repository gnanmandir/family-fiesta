// Tiered budget configuration for Family Fiesta 2026
// Tier 1 (1st person): ₹220
// Tier 2 (2nd person): ₹220 (Cumulative: ₹440)
// Tier 3 (3rd person): ₹160 (Cumulative: ₹600)
// Tier 4 (4th person): ₹70  (Cumulative: ₹670)

export const TIERED_BUDGET_MAP: Record<number, number> = {
  1: 220,
  2: 440,
  3: 600,
  4: 670,
};

export const TIER_INCREMENTS: Record<number, number> = {
  1: 220,
  2: 220,
  3: 160,
  4: 70,
};

export const calculateAllowedBudget = (peopleCount: number): number => {
  const count = Math.max(1, Math.min(4, Number(peopleCount) || 1));
  return TIERED_BUDGET_MAP[count] ?? 220;
};

export const getBudgetFormulaDisplay = (peopleCount: number): string => {
  const count = Math.max(1, Math.min(4, Number(peopleCount) || 1));
  const parts: string[] = [];
  for (let i = 1; i <= count; i++) {
    parts.push(`₹${TIER_INCREMENTS[i]}`);
  }
  return parts.join(' + ');
};
