import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, FolderOpen, Github, LayoutDashboard, LogOut, Menu, Paintbrush, PlusCircle, Package, Settings, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminStoreProvider, useAdminStore } from '@/context/AdminStoreContext';
import { FullPageSpinner } from '@/components/Spinner';
import { cn } from '@/lib/utils';
import { Btn } from './ui';

interface NavItem { to: string; label: string; icon: LucideIcon; match: (p: string) => boolean }

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard Overview', icon: LayoutDashboard, match: (p) => p === '/admin' || p === '/admin/' },
  { to: '/admin/products', label: 'Products', icon: Package, match: (p) => p.startsWith('/admin/products') && !p.endsWith('/new') },
  { to: '/admin/products/new', label: 'Add New Product', icon: PlusCircle, match: (p) => p.endsWith('/products/new') },
  { to: '/admin/editor', label: 'Website Editor', icon: Paintbrush, match: (p) => p.startsWith('/admin/editor') },
  { to: '/admin/media', label: 'Media Library', icon: FolderOpen, match: (p) => p.startsWith('/admin/media') },
  { to: '/admin/settings', label: 'Website Settings', icon: Settings, match: (p) => p.startsWith('/admin/settings') },
  { to: '/admin/github', label: 'GitHub Integration', icon: Github, match: (p) => p.startsWith('/admin/github') },
];

function Shell() {
  const { user, logout } = useAuth();
  const store = useAdminStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isEditor = pathname.startsWith('/admin/editor');

  useEffect(() => setOpen(false), [pathname]);

  // The dashboard must never be indexed by search engines
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    document.title = 'Admin | SocialModa';
    return () => m.remove();
  }, []);

  const doLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-stone-950 text-stone-300">
      <div className="flex h-14 items-center justify-between px-5">
        <Link to="/admin" className="font-semibold tracking-[0.2em] text-white">
          SOCIALMODA
        </Link>
        <button className="rounded p-1.5 text-stone-400 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>
      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <Link
              key={n.to}
              to={n.to}
              aria-current={active ? 'page' : undefined}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', active ? 'bg-amber-700/90 text-white' : 'hover:bg-white/10 hover:text-white')}
            >
              <n.icon size={18} aria-hidden="true" />
              {n.label}
            </Link>
          );
        })}
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/10 hover:text-white">
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-stone-500">Signed in as {user}</div>
    </div>
  );

  return (
    <div className="admin-root flex min-h-screen bg-stone-100 text-stone-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-only bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-slide-in-left">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Link
            to="/admin/github"
            className={cn('inline-flex max-w-[60vw] items-center gap-2 truncate rounded-full px-3 py-1 text-xs font-medium', store.source === 'github' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}
            title={store.source === 'github' ? 'Changes are committed to your GitHub repository' : 'Changes are stored in this browser only. Click to connect GitHub.'}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', store.source === 'github' ? 'bg-emerald-500' : 'bg-amber-500')} />
            <span className="truncate">{store.source === 'github' ? `GitHub: ${store.repoLabel}` : 'Local mode (not published)'}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
              <ExternalLink size={15} /> <span className="hidden sm:inline">View site</span>
            </Link>
          </div>
        </header>

        <main className={cn('min-w-0 flex-1', !isEditor && 'p-4 sm:p-8')}>
          {store.status === 'loading' && store.products.length === 0 ? (
            <FullPageSpinner label="Loading data" />
          ) : store.status === 'error' ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center">
              <h1 className="text-lg font-semibold">Could not load the site data</h1>
              <p className="mt-2 text-sm text-stone-600">{store.error}</p>
              <Btn variant="primary" className="mt-5" onClick={() => void store.refresh()}>
                Try again
              </Btn>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

/** Protected admin area: unauthenticated visitors are redirected to the login page. */
export default function AdminLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  return (
    <AdminStoreProvider>
      <Shell />
    </AdminStoreProvider>
  );
}
