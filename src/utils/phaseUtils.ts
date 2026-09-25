import { IntakePhase } from '../types';

export type ActivePhase = 'parent' | 'student' | 'staff';

/**
 * Parses an intakePhase string (e.g. 'parent,student,staff' or legacy 'parent')
 * into an array of distinct ActivePhase items.
 */
export function parseActivePhases(raw?: string | null): ActivePhase[] {
  if (!raw || raw === 'closed') return [];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase());
  const valid: ActivePhase[] = [];

  for (const p of parts) {
    if (p === 'parent' || p === 'student') {
      if (!valid.includes(p)) valid.push(p);
    } else if (p === 'staff' || p === 'guest') {
      if (!valid.includes('staff')) valid.push('staff');
    }
  }

  return valid;
}

/**
 * Checks whether a specific role ('parent', 'student', or 'staff'/'guest')
 * is currently permitted based on active phases.
 */
export function isPhaseActive(activePhases: ActivePhase[] | string | undefined | null, role: string): boolean {
  if (!activePhases) return false;
  const list = Array.isArray(activePhases) ? activePhases : parseActivePhases(activePhases);
  const normalizedRole = role === 'guest' ? 'staff' : (role || '').toLowerCase();
  return list.includes(normalizedRole as ActivePhase);
}

/**
 * Serializes an array of active phases into an IntakePhase string for storage.
 * Empty array returns 'closed'.
 */
export function serializeActivePhases(phases: ActivePhase[]): IntakePhase {
  if (!phases || phases.length === 0) return 'closed';
  return phases.join(',') as IntakePhase;
}

/**
 * Returns a human-friendly display label for the currently active phases.
 */
export function formatActivePhasesLabel(raw?: string | null): string {
  const phases = parseActivePhases(raw);
  if (phases.length === 0) return 'Closed (No Intake)';
  if (phases.length === 3) return 'All Phases Active';

  const names = phases.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return `${names.join(' & ')} Active`;
}
