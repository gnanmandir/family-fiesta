/**
 * Security & Anti-Abuse Service for Family Fiesta
 * - Anti-Brute Force Rate Limiting with countdown lockouts
 * - Strict Admin Session Expiration & Idle Timeout
 * - Cloudflare Turnstile bot protection helper
 */

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
}

const RL_PREFIX = 'ff_sec_rl_';
const SESSION_EXPIRY_KEY = 'admin_session_expires_at';
const SESSION_LAST_ACTIVE_KEY = 'admin_last_activity';
const MAX_IDLE_MS = 60 * 60 * 1000; // 1 hour idle timeout
const MAX_SESSION_MS = 4 * 60 * 60 * 1000; // 4 hours maximum session duration

// ============================================================================
// 1. RATE LIMITING & BRUTE FORCE SHIELD
// ============================================================================

interface RateLimitRecord {
  attempts: number;
  windowStart: number;
  lockedUntil: number;
}

function getRateLimitRecord(key: string): RateLimitRecord {
  try {
    const raw = localStorage.getItem(RL_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.attempts === 'number') {
        return parsed;
      }
    }
  } catch (e) {}
  return { attempts: 0, windowStart: Date.now(), lockedUntil: 0 };
}

function saveRateLimitRecord(key: string, record: RateLimitRecord): void {
  try {
    localStorage.setItem(RL_PREFIX + key, JSON.stringify(record));
  } catch (e) {}
}

export function checkLockout(actionKey: string, maxAttempts = 5, windowMs = 5 * 60 * 1000): LockoutStatus {
  const record = getRateLimitRecord(actionKey);
  const now = Date.now();

  // If locked, check if lockout duration has passed
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      attemptsLeft: 0,
    };
  }

  // If previous window expired, reset attempts
  if (now - record.windowStart > windowMs) {
    record.attempts = 0;
    record.windowStart = now;
    record.lockedUntil = 0;
    saveRateLimitRecord(actionKey, record);
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, maxAttempts - record.attempts),
  };
}

export function recordFailedAttempt(
  actionKey: string,
  maxAttempts = 5,
  lockoutDurationMs = 10 * 60 * 1000,
  windowMs = 5 * 60 * 1000
): LockoutStatus {
  const record = getRateLimitRecord(actionKey);
  const now = Date.now();

  // If window expired, start a new window
  if (now - record.windowStart > windowMs && record.lockedUntil <= now) {
    record.attempts = 0;
    record.windowStart = now;
    record.lockedUntil = 0;
  }

  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutDurationMs;
    saveRateLimitRecord(actionKey, record);
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(lockoutDurationMs / 1000),
      attemptsLeft: 0,
    };
  }

  saveRateLimitRecord(actionKey, record);
  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, maxAttempts - record.attempts),
  };
}

export function resetAttempts(actionKey: string): void {
  try {
    localStorage.removeItem(RL_PREFIX + actionKey);
  } catch (e) {}
}

// ============================================================================
// 2. STRICT ADMIN SESSION EXPIRATION & INACTIVITY TIMEOUT
// ============================================================================

export function setAdminSession(token: string, role: string, username = 'admin', durationMs = MAX_SESSION_MS): void {
  const now = Date.now();
  try {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_role', role);
    localStorage.setItem('admin_username', username);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(now + durationMs));
    localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(now));
  } catch (e) {}
}

export function validateAdminSession(): { isValid: boolean; reason?: 'expired' | 'inactive' | 'none' } {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      return { isValid: false, reason: 'none' };
    }

    const now = Date.now();
    const expiryRaw = localStorage.getItem(SESSION_EXPIRY_KEY);
    const lastActiveRaw = localStorage.getItem(SESSION_LAST_ACTIVE_KEY);

    // If expiry timestamp is set and passed
    if (expiryRaw) {
      const expiresAt = parseInt(expiryRaw, 10);
      if (!isNaN(expiresAt) && now > expiresAt) {
        clearAdminSession();
        return { isValid: false, reason: 'expired' };
      }
    }

    // If last active timestamp is set and idle duration exceeded
    if (lastActiveRaw) {
      const lastActive = parseInt(lastActiveRaw, 10);
      if (!isNaN(lastActive) && now - lastActive > MAX_IDLE_MS) {
        clearAdminSession();
        return { isValid: false, reason: 'inactive' };
      }
    }

    // Still valid -> touch activity
    touchAdminActivity();
    return { isValid: true };
  } catch (e) {
    return { isValid: true };
  }
}

export function touchAdminActivity(): void {
  try {
    if (localStorage.getItem('admin_token')) {
      localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    }
  } catch (e) {}
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_username');
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
  } catch (e) {}
}

// ============================================================================
// 3. CLOUDFLARE TURNSTILE BOT PROTECTION (OPTIONAL)
// ============================================================================

export function getTurnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
}

export function isTurnstileEnabled(): boolean {
  return Boolean(getTurnstileSiteKey());
}
