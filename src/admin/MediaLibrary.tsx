import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Copy, ImageIcon, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { useAdminStore, type Folder } from '@/context/AdminStoreContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { ACCEPT_ATTR } from '@/lib/images';
import { cn, formatBytes } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import type { MediaItem } from '@/types';
import { AdminEmpty, Badge, Btn, Card, PageHeader, errMsg, inputCls } from './ui';

type Filter = 'all' | Folder;

export default function MediaLibrary() {
  const store = useAdminStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [target, setTarget] = useState<Folder>('products');
  const [uploading, setUploading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    const bump = (p?: string) => p && m.set(p, (m.get(p) || 0) + 1);
    store.products.forEach((p) => p.images.forEach(bump));
    const c = store.config;
    [c.hero.image, c.brand.logo, c.brand.favicon, c.pages.about.image].forEach(bump);
    return m;
  }, [store.products, store.config]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return store.media.filter((m) => (filter === 'all' || m.folder === filter) && (!term || m.name.toLowerCase().includes(term)));
  }, [store.media, q, filter]);

  const upload = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    const { paths, errors } = await store.uploadImages(Array.from(files), target);
    setUploading(false);
    errors.forEach((e) => toast.error(e));
    if (paths.length) {
      toast.success(
        store.source === 'github'
          ? `${paths.length} image${paths.length > 1 ? 's' : ''} uploaded to GitHub. They appear on the live site after the next deploy (1 to 2 minutes).`
          : `${paths.length} image${paths.length > 1 ? 's' : ''} stored in this browser (local mode).`,
      );
    }
    if (input.current) input.current.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    void upload(e.dataTransfer.files);
  };

  const remove = async (m: MediaItem) => {
    const n = usage.get(m.path) || 0;
    const ok = await confirm({
      title: `Delete ${m.name}?`,
      message: n > 0 ? `This image is used in ${n} place${n > 1 ? 's' : ''} (products or page settings). Those spots will show an empty placeholder.` : 'This cannot be undone.',
      confirmText: 'Delete image',
      danger: true,
    });
    if (!ok) return;
    setBusy(m.path);
    try {
      await store.deleteMedia(m);
      toast.success('Image deleted.');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const copy = async (m: MediaItem) => {
    try {
      await navigator.clipboard.writeText(m.path);
      toast.success('Image path copied.');
    } catch {
      toast.info(m.path);
    }
  };

  return (
    <>
      <PageHeader
        title="Media Library"
        description={store.source === 'github' ? 'Images are stored in your repository under public/assets and deployed with the site.' : 'Local mode: images are kept in this browser. Connect GitHub to store them in your repository.'}
        actions={
          <Btn onClick={() => void store.refreshMedia()} loading={store.mediaLoading}>
            <RefreshCw size={15} /> Refresh
          </Btn>
        }
      />

      <Card className="mb-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
          className={cn('flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition', dropping ? 'border-amber-700 bg-amber-50' : 'border-stone-300')}
        >
          <Upload size={28} className="text-stone-400" />
          <p className="text-sm text-stone-600">Drag and drop images here (JPEG, PNG or WebP)</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <input ref={input} id="media-upload" type="file" accept={ACCEPT_ATTR} multiple className="sr-only" onChange={(e) => void upload(e.target.files)} />
            <label htmlFor="media-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
              {uploading ? 'Uploading…' : 'Choose files'}
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              Save to
              <select value={target} onChange={(e) => setTarget(e.target.value as Folder)} className={`${inputCls} !w-auto`}>
                <option value="products">Products</option>
                <option value="site">Site (hero, logo, pages)</option>
              </select>
            </label>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block sm:w-72">
          <span className="sr-only">Search images</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by filename" className={`${inputCls} pl-9`} />
        </label>
        <div className="flex gap-1 rounded-lg bg-stone-200/70 p-1" role="group" aria-label="Filter by folder">
          {(['all', 'products', 'site'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn('rounded-md px-3 py-1.5 text-sm capitalize transition', filter === f ? 'bg-white font-medium shadow-sm' : 'text-stone-600 hover:text-stone-900')}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-sm text-stone-500 sm:ml-auto">{list.length} image{list.length === 1 ? '' : 's'}</span>
      </div>

      {store.mediaLoading && store.media.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-500">Loading media…</p>
      ) : list.length === 0 ? (
        <AdminEmpty icon={<ImageIcon size={32} />} title="No images found" text="Upload your first image above." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {list.map((m) => {
            const n = usage.get(m.path) || 0;
            return (
              <li key={m.path} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <SmartImage src={m.path} alt={m.name} className="aspect-square w-full" repoHint={store.config.repo} />
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium text-stone-900" title={m.name}>{m.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={m.origin === 'github' ? 'green' : m.origin === 'local' ? 'amber' : 'stone'}>{m.origin === 'github' ? 'GitHub' : m.origin === 'local' ? 'Local' : 'Bundled'}</Badge>
                    {m.size ? <span className="text-xs text-stone-500">{formatBytes(m.size)}</span> : null}
                    {n > 0 && <Badge tone="blue">Used ×{n}</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    <Btn size="sm" className="flex-1" onClick={() => void copy(m)}>
                      <Copy size={13} /> Path
                    </Btn>
                    <Btn size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" loading={busy === m.path} onClick={() => void remove(m)} aria-label={`Delete ${m.name}`}>
                      <Trash2 size={14} />
                    </Btn>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
