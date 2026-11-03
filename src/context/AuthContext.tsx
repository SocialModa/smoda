import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as auth from '@/lib/auth';

interface AuthApi {
  isAuthenticated: boolean;
  user: string | null;
  mode: auth.AuthMode;
  login: (user: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
  setup: (user: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMode: () => void;
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => auth.readSession());
  const [mode, setMode] = useState<auth.AuthMode>(() => auth.authMode());

  // Re-check the session when the tab regains focus (expiry) and across tabs
  useEffect(() => {
    const check = () => setSession(auth.readSession());
    window.addEventListener('focus', check);
    window.addEventListener('storage', check);
    const t = setInterval(check, 60_000);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('storage', check);
      clearInterval(t);
    };
  }, []);

  const login = useCallback(async (user: string, password: string, remember: boolean) => {
    const r = await auth.login(user, password, remember);
    if (r.ok) setSession(auth.readSession());
    return r;
  }, []);

  const setup = useCallback(async (user: string, password: string) => {
    await auth.setupLocalCredentials(user, password);
    setMode(auth.authMode());
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setSession(null);
  }, []);

  const value = useMemo<AuthApi>(
    () => ({ isAuthenticated: !!session, user: session?.user ?? null, mode, login, setup, logout, refreshMode: () => setMode(auth.authMode()) }),
    [session, mode, login, setup, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
