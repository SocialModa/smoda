import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, ExternalLink, Package } from 'lucide-react';
import { useAdminStore } from '@/context/AdminStoreContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatPrice } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import type { Product } from '@/types';
import { AdminEmpty, Btn, PageHeader, StatusBadge, errMsg, inputCls, savedMessage } from './ui';

type Filter = 'all' | 'published' | 'draft';

export default function Products() {
  const store = useAdminStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const cur = store.config.brand.currency;

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return store.products.filter((p) => (filter === 'all' || p.status === filter) && (!term || `${p.name} ${p.sku} ${p.slug}`.toLowerCase().includes(term)));
  }, [store.products, q, filter]);

  const remove = async (p: Product) => {
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      message: 'The product disappears from the website. Its image files stay in the Media Library. This cannot be undone.',
      confirmText: 'Delete product',
      danger: true,
    });
    if (!ok) return;
    setBusyId(p.id);
    try {
      await store.deleteProduct(p.id);
      toast.success(savedMessage(store.source, 'Deletion'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (p: Product) => {
    setBusyId(p.id);
    try {
      await store.saveProduct({ ...p, status: p.status === 'published' ? 'draft' : 'published' });
      toast.success(p.status === 'published' ? `"${p.name}" is now a draft.` : `"${p.name}" is now published.`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const priceOf = (p: Product) => (
    <span className="whitespace-nowrap">
      {p.salePrice && p.salePrice < p.price ? (
        <>
          <span className="font-medium">{formatPrice(p.salePrice, cur)}</span> <s className="text-xs text-stone-400">{formatPrice(p.price, cur)}</s>
        </>
      ) : (
        <span className="font-medium">{formatPrice(p.price, cur)}</span>
      )}
    </span>
  );

  const actions = (p: Product) => (
    <div className="flex items-center justify-end gap-1">
      <Link to={`/admin/products/${p.id}/edit`} aria-label={`Edit ${p.name}`} title="Edit" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100">
        <Pencil size={16} />
      </Link>
      <button onClick={() => void toggle(p)} disabled={busyId === p.id} aria-label={p.status === 'published' ? `Unpublish ${p.name}` : `Publish ${p.name}`} title={p.status === 'published' ? 'Unpublish' : 'Publish'} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 disabled:opacity-40">
        {p.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <Link to={`/product/${p.slug}`} aria-label={`View ${p.name} on the website`} title="View on website" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100">
        <ExternalLink size={16} />
      </Link>
      <button onClick={() => void remove(p)} disabled={busyId === p.id} aria-label={`Delete ${p.name}`} title="Delete" className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40">
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Products"
        description={`${store.products.length} ${store.products.length === 1 ? 'jacket' : 'jackets'} in your catalogue.`}
        actions={
          <Link to="/admin/products/new">
            <Btn variant="primary">
              <Plus size={16} /> Add product
            </Btn>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block sm:w-80">
          <span className="sr-only">Search products</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, SKU or URL" className={`${inputCls} pl-9`} />
        </label>
        <div className="flex gap-1 rounded-lg bg-stone-200/70 p-1" role="group" aria-label="Filter by status">
          {(['all', 'published', 'draft'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${filter === f ? 'bg-white font-medium shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <AdminEmpty
          icon={<Package size={32} />}
          title={store.products.length === 0 ? 'No products yet' : 'No products match'}
          text={store.products.length === 0 ? 'Add your first leather jacket to start building the collection.' : 'Try another search term or status filter.'}
          action={
            store.products.length === 0 ? (
              <Link to="/admin/products/new">
                <Btn variant="primary">Add product</Btn>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SmartImage src={p.images[0]} alt="" className="h-14 w-11 shrink-0 rounded-md" repoHint={store.config.repo} />
                        <div className="min-w-0">
                          <Link to={`/admin/products/${p.id}/edit`} className="block truncate font-medium text-stone-900 hover:underline">{p.name}</Link>
                          <p className="truncate text-xs text-stone-500">{p.sku || 'no SKU'} · /product/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{priceOf(p)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">{actions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {list.map((p) => (
              <li key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <SmartImage src={p.images[0]} alt="" className="h-20 w-16 shrink-0 rounded-md" repoHint={store.config.repo} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${p.id}/edit`} className="block font-medium text-stone-900">{p.name}</Link>
                    <p className="text-xs text-stone-500">{p.sku || 'no SKU'}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm">{priceOf(p)} <StatusBadge status={p.status} /></div>
                    <p className="mt-1 text-xs text-stone-500">Added {formatDate(p.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-2 border-t border-stone-100 pt-2">{actions(p)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
