import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileEdit, FolderOpen, Package, Paintbrush, PlusCircle, Upload, Eye, Github } from 'lucide-react';
import { useAdminStore } from '@/context/AdminStoreContext';
import { useToast } from '@/context/ToastContext';
import { loadDraft } from '@/lib/data';
import { formatDate } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import { Badge, Btn, Card, PageHeader, StatusBadge, errMsg } from './ui';

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <div>
        <p className="text-3xl font-semibold leading-none text-stone-900">{value}</p>
        <p className="mt-1.5 text-sm text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function StatusRow({ ok, title, text, action }: { ok: boolean | 'warn'; title: string; text: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-3">
      {ok === true ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${ok === 'warn' ? 'text-amber-600' : 'text-red-500'}`} />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900">{title}</p>
        <p className="text-sm text-stone-500">{text}</p>
      </div>
      {action}
    </li>
  );
}

export default function Overview() {
  const store = useAdminStore();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const published = store.products.filter((p) => p.status === 'published').length;
  const drafts = store.products.length - published;
  const recent = [...store.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const hasDraft = !!loadDraft();
  const localAhead = store.localNewer.products || store.localNewer.config;
  const missing = store.repoMissing.products || store.repoMissing.config;

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Dashboard" description="Everything about your store at a glance." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total products" value={store.products.length} icon={<Package size={22} />} tone="bg-stone-900 text-white" />
        <Stat label="Published" value={published} icon={<Eye size={22} />} tone="bg-emerald-100 text-emerald-700" />
        <Stat label="Drafts" value={drafts} icon={<FileEdit size={22} />} tone="bg-amber-100 text-amber-700" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Recently added" actions={<Link to="/admin/products" className="text-sm text-amber-800 hover:underline">All products</Link>}>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">No products yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <SmartImage src={p.images[0]} alt="" className="h-14 w-12 shrink-0 rounded-lg" repoHint={store.config.repo} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium text-stone-900 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-stone-500">Added {formatDate(p.createdAt)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Quick actions">
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/admin/products/new', label: 'Add product', icon: PlusCircle },
                { to: '/admin/editor', label: 'Edit website', icon: Paintbrush },
                { to: '/admin/media', label: 'Upload media', icon: Upload },
                { to: '/admin/github', label: 'GitHub', icon: Github },
              ].map((a) => (
                <Link key={a.to} to={a.to} className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 px-3 py-4 text-center text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50">
                  <a.icon size={20} className="text-amber-700" />
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Website configuration status">
            <ul className="divide-y divide-stone-100">
              <StatusRow
                ok={store.source === 'github' ? true : 'warn'}
                title={store.source === 'github' ? `Connected to ${store.repoLabel}` : 'Local mode'}
                text={store.source === 'github' ? 'Saves are committed to your repository and published by GitHub Pages.' : 'Saves stay in this browser. Connect GitHub to publish for visitors.'}
                action={store.source !== 'github' ? <Link to="/admin/github"><Btn size="sm">Connect</Btn></Link> : undefined}
              />
              {store.ghError && <StatusRow ok={false} title="GitHub problem" text={store.ghError} />}
              {store.source === 'github' && missing && (
                <StatusRow
                  ok="warn"
                  title="Data files not in the repository yet"
                  text="products.json or site-config.json is missing from public/data."
                  action={<Btn size="sm" loading={busy === 'init'} onClick={() => run('init', store.initRepository, 'Repository data created.')}>Create</Btn>}
                />
              )}
              {store.source === 'github' && localAhead && (
                <StatusRow
                  ok="warn"
                  title="Local changes not on GitHub"
                  text="This browser holds newer changes than the repository."
                  action={<Btn size="sm" variant="accent" loading={busy === 'push'} onClick={() => run('push', store.pushLocalToGitHub, 'Local changes pushed to GitHub.')}>Push</Btn>}
                />
              )}
              <StatusRow
                ok={hasDraft ? 'warn' : true}
                title={hasDraft ? 'Unpublished design draft' : 'No pending design draft'}
                text={hasDraft ? 'You saved a Web Editor draft that is not live yet.' : 'The live design matches the last published version.'}
                action={hasDraft ? <Link to="/admin/editor"><Btn size="sm">Open editor</Btn></Link> : undefined}
              />
            </ul>
            <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
              <FolderOpen size={14} /> Media files: <Badge>{store.media.length}</Badge>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
