import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isEnvManaged } from '@/lib/auth';
import { Btn, Field, inputCls } from './ui';

export default function Login() {
  const { isAuthenticated, mode, login, setup, refreshMode } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/admin';

  const [user, setUser] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={from.startsWith('/admin') ? from : '/admin'} replace />;

  const isSetup = mode === 'setup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user.trim()) return setError('Enter a username.');
    if (isSetup) {
      if (password.length < 8) return setError('Choose a password with at least 8 characters.');
      if (password !== confirm) return setError('The two passwords do not match.');
    } else if (!password) {
      return setError('Enter your password.');
    }
    setBusy(true);
    try {
      if (isSetup) {
        await setup(user, password);
        refreshMode();
      }
      const r = await login(user, password, remember);
      if (!r.ok) setError(r.error || 'Could not sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-root flex min-h-screen items-center justify-center bg-stone-950 p-4">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-lg font-semibold tracking-[0.3em] text-white">SOCIALMODA</p>
        <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl bg-white p-7 shadow-2xl" aria-label={isSetup ? 'Create admin account' : 'Admin login'}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white">
              <Lock size={18} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-stone-900">{isSetup ? 'Create your admin account' : 'Admin sign in'}</h1>
              <p className="text-sm text-stone-500">{isSetup ? 'First time here. Pick the credentials for this browser.' : 'Enter your credentials to manage the store.'}</p>
            </div>
          </div>

          <Field label="Username">{(id) => <input id={id} className={inputCls} value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus />}</Field>
          <Field label="Password">
            {(id) => <input id={id} type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSetup ? 'new-password' : 'current-password'} />}
          </Field>
          {isSetup && (
            <Field label="Confirm password">
              {(id) => <input id={id} type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />}
            </Field>
          )}
          {!isSetup && (
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-stone-300" />
              Keep me signed in on this device (8 hours)
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Btn type="submit" variant="primary" className="w-full" loading={busy}>
            {isSetup ? 'Create account and sign in' : 'Sign in'}
          </Btn>

          <div className="flex gap-2.5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              <strong>Demo authentication.</strong> This login is a gate in your browser, not production-grade security. Your GitHub token is what actually protects the repository.
              {isEnvManaged() ? ' Credentials are set at build time.' : ' Credentials are stored as a hash in this browser only.'} See the README, "Authentication".
            </p>
          </div>
        </form>
        <p className="mt-5 text-center text-sm text-stone-400">
          <Link to="/" className="hover:text-white">
            Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
