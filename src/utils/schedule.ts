import { OrderSchedule } from '../types';

export const DEFAULT_SCHEDULE: OrderSchedule = {
  enabled: false,
  startTime: '',
  endTime: '',
};

/**
 * Checks if the current moment falls within, before, or after a schedule window.
 */
export function isScheduleWithinWindow(
  schedule: OrderSchedule | null | undefined,
  now: Date = new Date()
): {
  isWithin: boolean;
  isBefore: boolean;
  isAfter: boolean;
  hasStart: boolean;
  hasEnd: boolean;
} {
  if (!schedule || !schedule.enabled) {
    return {
      isWithin: false,
      isBefore: false,
      isAfter: false,
      hasStart: false,
      hasEnd: false,
    };
  }

  const currentMs = now.getTime();
  const startMs = schedule.startTime ? new Date(schedule.startTime).getTime() : NaN;
  const endMs = schedule.endTime ? new Date(schedule.endTime).getTime() : NaN;

  const hasStart = !isNaN(startMs);
  const hasEnd = !isNaN(endMs);

  const isBefore = hasStart && currentMs < startMs;
  const isAfter = hasEnd && currentMs > endMs;
  const isWithin = (!hasStart || currentMs >= startMs) && (!hasEnd || currentMs <= endMs);

  return { isWithin, isBefore, isAfter, hasStart, hasEnd };
}

/**
 * Computes whether the food portal is effectively open given manual toggle + schedule.
 */
export function evaluateSchedule(
  schedule: OrderSchedule | null | undefined,
  manualOpen: boolean,
  now: Date = new Date()
): {
  isOpen: boolean;
  scheduleActive: boolean;
  isBeforeStart: boolean;
  isAfterEnd: boolean;
  isWithinWindow: boolean;
  headline: string;
  subtext: string;
} {
  if (!schedule || !schedule.enabled) {
    return {
      isOpen: manualOpen,
      scheduleActive: false,
      isBeforeStart: false,
      isAfterEnd: false,
      isWithinWindow: false,
      headline: manualOpen ? 'Active & Taking Orders' : 'Ordering Halted / Concluded',
      subtext: manualOpen
        ? 'Manual intake is active. Students can place and edit orders.'
        : 'Ordering is currently halted. Students can only view or download receipts.',
    };
  }

  const { isWithin, isBefore, isAfter } = isScheduleWithinWindow(schedule, now);

  if (isBefore) {
    return {
      isOpen: false,
      scheduleActive: true,
      isBeforeStart: true,
      isAfterEnd: false,
      isWithinWindow: false,
      headline: 'Scheduled (Waiting to Start)',
      subtext: `Automated schedule will open intake on ${formatScheduleDisplay(schedule.startTime)}.`,
    };
  }

  if (isAfter) {
    return {
      isOpen: false,
      scheduleActive: true,
      isBeforeStart: false,
      isAfterEnd: true,
      isWithinWindow: false,
      headline: 'Concluded (Schedule Ended)',
      subtext: `Automated schedule concluded on ${formatScheduleDisplay(schedule.endTime)}.`,
    };
  }

  // Inside schedule window
  const effectiveOpen = isWithin && manualOpen;
  return {
    isOpen: effectiveOpen,
    scheduleActive: true,
    isBeforeStart: false,
    isAfterEnd: false,
    isWithinWindow: true,
    headline: effectiveOpen ? 'Active (Schedule Window)' : 'Halted (Manual Override)',
    subtext: effectiveOpen
      ? `Automated schedule is taking orders until ${schedule.endTime ? formatScheduleDisplay(schedule.endTime) : 'concluded'}.`
      : 'Intake is temporarily halted by manual override despite schedule window.',
  };
}

/**
 * Formats an ISO or datetime-local string to readable human text: e.g. "Fri, 18 Sep, 09:00 AM"
 */
export function formatScheduleDisplay(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return dateTimeStr;

  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a Date or string into `YYYY-MM-DDTHH:mm` for HTML datetime-local input.
 */
export function toDateTimeLocalString(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
