// Safe wrappers: localStorage/sessionStorage can throw (private mode, quota, blocked).

function read(store: Storage | undefined, key: string): string | null {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}
function write(store: Storage | undefined, key: string, value: string): boolean {
  try {
    store?.setItem(key, value);
    return !!store;
  } catch {
    return false;
  }
}
function drop(store: Storage | undefined, key: string) {
  try {
    store?.removeItem(key);
  } catch {
    /* ignore */
  }
}

const ls = typeof window !== 'undefined' ? window.localStorage : undefined;
const ss = typeof window !== 'undefined' ? window.sessionStorage : undefined;

function parse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const lsGet = <T,>(key: string, fallback: T): T => parse(read(ls, key), fallback);
export const lsSet = (key: string, value: unknown): boolean => write(ls, key, JSON.stringify(value));
export const lsRemove = (key: string) => drop(ls, key);

export const ssGet = <T,>(key: string, fallback: T): T => parse(read(ss, key), fallback);
export const ssSet = (key: string, value: unknown): boolean => write(ss, key, JSON.stringify(value));
export const ssRemove = (key: string) => drop(ss, key);

export const KEYS = {
  overrideProducts: 'sm:override:products',
  overrideConfig: 'sm:override:config',
  draftConfig: 'sm:draft:config',
  media: 'sm:media',
  session: 'sm:session',
  authLocal: 'sm:auth:local',
  authFails: 'sm:auth:fails',
  ghSettings: 'sm:gh:settings',
  ghToken: 'sm:gh:token',
} as const;

/** Remove everything this app stores locally (except the GitHub connection). */
export function clearLocalData() {
  [KEYS.overrideProducts, KEYS.overrideConfig, KEYS.draftConfig, KEYS.media].forEach(lsRemove);
}
