/**
 * SECRET ADMIN DOOR
 * -----------------
 * Typing the secret word in the Incident Feeds search box reveals a small
 * sign-in card. The local gate is a convenience door for this barangay app —
 * it is NOT the authority for shared data. When a Supabase project is
 * configured, the admin workspace still requires a real, authorized Supabase
 * administrator account before any row can be written.
 *
 * Defaults are `admin` / `admin` (as requested). Override them at build time
 * with VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD so the deployed site does not
 * keep the default pair.
 */
export const SECRET_WORD = 'admin';

const ENV_EMAIL = (import.meta.env?.VITE_ADMIN_EMAIL as string | undefined)?.trim();
const ENV_PASSWORD = (import.meta.env?.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
const EXPECTED_EMAIL = (ENV_EMAIL || 'admin').toLowerCase();
const EXPECTED_PASSWORD = ENV_PASSWORD || 'admin';

export const ADMIN_SESSION_KEY = 'hazardsync:admin-session:v1';
export const ADMIN_GATE_EVENT = 'hazardsync:admin-gate';
const SESSION_HOURS = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

interface Session { email: string; unlockedAt: number }

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || typeof parsed.unlockedAt !== 'number') return null;
    if (Date.now() - parsed.unlockedAt > SESSION_HOURS * 3600_000) {
      lockAdmin();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAdminUnlocked(): boolean {
  return readSession() !== null;
}

function attemptState(): { count: number; blockedUntil: number } {
  try {
    return JSON.parse(sessionStorage.getItem('hazardsync:admin-attempts') || '{"count":0,"blockedUntil":0}');
  } catch {
    return { count: 0, blockedUntil: 0 };
  }
}

function saveAttempts(state: { count: number; blockedUntil: number }) {
  try {
    sessionStorage.setItem('hazardsync:admin-attempts', JSON.stringify(state));
  } catch {
    /* storage blocked: the gate still works for this page */
  }
}

export interface UnlockResult { ok: boolean; message?: string }

/** Validates the secret credentials. The caller decides when to open the workspace. */
export function unlockAdmin(email: string, password: string): UnlockResult {
  const state = attemptState();
  const remaining = state.blockedUntil - Date.now();
  if (remaining > 0) {
    return { ok: false, message: `Sobrang daming maling subok. Subukan ulit pagkalipas ng ${Math.ceil(remaining / 1000)} segundo.` };
  }
  const emailOk = email.trim().toLowerCase() === EXPECTED_EMAIL;
  const passwordOk = password === EXPECTED_PASSWORD;
  if (!emailOk || !passwordOk) {
    const next = { count: state.count + 1, blockedUntil: 0 };
    if (next.count >= MAX_ATTEMPTS) {
      next.count = 0;
      next.blockedUntil = Date.now() + LOCKOUT_MS;
    }
    saveAttempts(next);
    return { ok: false, message: 'Mali ang email o password. Subukan muli.' };
  }
  saveAttempts({ count: 0, blockedUntil: 0 });
  const session: Session = { email: email.trim().toLowerCase(), unlockedAt: Date.now() };
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }
  window.dispatchEvent(new Event(ADMIN_GATE_EVENT));
  return { ok: true };
}

export function lockAdmin() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new Event(ADMIN_GATE_EVENT));
}

/** True while the typed search text is exactly the secret word. */
export function isSecretQuery(value: string): boolean {
  return value.trim().toLowerCase() === SECRET_WORD;
}

/** Can the deployed build still be opened with the default admin/admin pair? */
export function usingDefaultCredentials(): boolean {
  return !ENV_EMAIL && !ENV_PASSWORD;
}
