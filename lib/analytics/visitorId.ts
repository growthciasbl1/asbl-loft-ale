const KEY = 'asbl-visitor-id';

/**
 * Get-or-create a stable browser-scoped visitorId. Persists in localStorage.
 * Returns empty string during SSR; call from client components / effects only.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.startsWith('v-')) return existing;
    const fresh = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // localStorage blocked (private mode / strict cookies) — fall back to per-session
    return `v-ephemeral-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function clearVisitorId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
