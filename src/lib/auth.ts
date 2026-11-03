/**
 * DEMO AUTHENTICATION: a gate in the browser, NOT production-grade security.
 *
 * Anything that runs in the visitor's browser can be inspected or bypassed. This login only keeps
 * casual visitors out of the admin screens. What actually protects your repository is the GitHub
 * token: without a valid token nobody can publish anything.
 *
 * Credential sources (first match wins):
 *   1. Build-time:  VITE_ADMIN_USER + VITE_ADMIN_PASSWORD_SHA256   ("configured" mode, same on every device)
 *   2. First-run setup in the browser (stored as a hash in localStorage, this browser only)
 *
 * To replace this with real authentication, implement the same AuthProvider shape against a
 * backend / OAuth proxy (see README: "Production authentication").
 */
import { KEYS, lsGet, lsSet, lsRemove, ssGet, ssSet, ssRemove } from './storage';

const SALT = 'socialmoda:';
const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 60 * 1000;

export type AuthMode = 'configured' | 'local' | 'setup';

interface Session { user: string; exp: number }
interface LocalCreds { user: string; hash: string }

const ENV_USER = (import.meta.env.VITE_ADMIN_USER as string | undefined)?.trim();
const ENV_HASH = (import.meta.env.VITE_ADMIN_PASSWORD_SHA256 as string | undefined)?.trim().toLowerCase();

/* ---------------- SHA-256 (Web Crypto when available, tiny fallback for plain-http hosts) ---------------- */

function sha256Fallback(message: string): string {
  const bytes = Array.from(new TextEncoder().encode(message));
  const primes: number[] = [];
  for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n);
  const frac = (x: number) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
  const K = primes.map((p) => frac(Math.cbrt(p)));
  const H = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 4294967296);
  const lo = bitLen >>> 0;
  for (const v of [hi, lo]) for (let s = 24; s >= 0; s -= 8) bytes.push((v >>> s) & 255);

  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Array<number>(64);
    for (let t = 0; t < 16; t++) w[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(text);
}
export const _sha256Fallback = sha256Fallback; // exported for tests

export const hashPassword = (pw: string) => sha256Hex(SALT + pw);

/* ---------------- credentials ---------------- */

export function authMode(): AuthMode {
  if (ENV_USER && ENV_HASH) return 'configured';
  return lsGet<LocalCreds | null>(KEYS.authLocal, null) ? 'local' : 'setup';
}

export const isEnvManaged = () => !!(ENV_USER && ENV_HASH);

export async function setupLocalCredentials(user: string, password: string): Promise<void> {
  lsSet(KEYS.authLocal, { user: user.trim(), hash: await hashPassword(password) } satisfies LocalCreds);
}

export async function changeLocalPassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  if (isEnvManaged()) return { ok: false, error: 'The admin password is set at build time (repository variables).' };
  const creds = lsGet<LocalCreds | null>(KEYS.authLocal, null);
  if (!creds) return { ok: false, error: 'No local password is set.' };
  if ((await hashPassword(current)) !== creds.hash) return { ok: false, error: 'Current password is incorrect.' };
  lsSet(KEYS.authLocal, { user: creds.user, hash: await hashPassword(next) });
  return { ok: true };
}

/* ---------------- throttling ---------------- */

interface Fails { count: number; lockedUntil: number }
const getFails = () => lsGet<Fails>(KEYS.authFails, { count: 0, lockedUntil: 0 });

export function lockRemainingMs(): number {
  return Math.max(0, getFails().lockedUntil - Date.now());
}

/* ---------------- login / session ---------------- */

export async function login(user: string, password: string, remember: boolean): Promise<{ ok: boolean; error?: string }> {
  const wait = lockRemainingMs();
  if (wait > 0) return { ok: false, error: `Too many attempts. Try again in ${Math.ceil(wait / 1000)} seconds.` };

  const mode = authMode();
  let expectedUser = '';
  let expectedHash = '';
  if (mode === 'configured') {
    expectedUser = ENV_USER!;
    expectedHash = ENV_HASH!;
  } else if (mode === 'local') {
    const c = lsGet<LocalCreds>(KEYS.authLocal, { user: '', hash: '' });
    expectedUser = c.user;
    expectedHash = c.hash;
  } else {
    return { ok: false, error: 'Admin access has not been set up yet.' };
  }

  const hash = await hashPassword(password);
  if (user.trim().toLowerCase() === expectedUser.toLowerCase() && hash === expectedHash) {
    lsRemove(KEYS.authFails);
    const session: Session = { user: expectedUser, exp: Date.now() + SESSION_MS };
    if (remember) lsSet(KEYS.session, session);
    else ssSet(KEYS.session, session);
    return { ok: true };
  }

  const f = getFails();
  const count = f.count + 1;
  lsSet(KEYS.authFails, { count: count >= MAX_FAILS ? 0 : count, lockedUntil: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
  return { ok: false, error: count >= MAX_FAILS ? 'Too many attempts. Locked for 60 seconds.' : 'Incorrect username or password.' };
}

export function readSession(): Session | null {
  const s = ssGet<Session | null>(KEYS.session, null) || lsGet<Session | null>(KEYS.session, null);
  if (!s || typeof s.exp !== 'number' || s.exp < Date.now()) {
    if (s) logout();
    return null;
  }
  return s;
}

export function logout() {
  ssRemove(KEYS.session);
  lsRemove(KEYS.session);
}
