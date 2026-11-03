import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import ProductGrid from '@/components/store/ProductGrid';
import EmptyState from '@/components/store/EmptyState';

type Sort = 'featured' | 'newest' | 'price-asc' | 'price-desc';
const effective = (p: { price: number; salePrice?: number | null }) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);

export default function Shop() {
  const { config, products } = useSite();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('featured');
  useSeo(`Shop | ${config.brand.name}`, `Browse the full ${config.brand.name} collection of premium leather jackets.`);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = products.filter((p) => !term || `${p.name} ${p.shortDescription} ${p.sku} ${p.specs.map((s) => s.value).join(' ')}`.toLowerCase().includes(term));
    if (sort === 'newest') out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === 'price-asc') out = [...out].sort((a, b) => effective(a) - effective(b));
    if (sort === 'price-desc') out = [...out].sort((a, b) => effective(b) - effective(a));
    return out;
  }, [products, q, sort]);

  return (
    <section className="sm-section" aria-labelledby="shop-title">
      <div className="sm-container">
        <div className="mb-10 max-w-2xl">
          <h1 id="shop-title" data-edit="pages.shop.title" className="text-[clamp(2.4rem,5vw,4rem)]">
            {config.pages.shop.title}
          </h1>
          {config.pages.shop.intro && <p data-edit="pages.shop.intro" className="mt-4 opacity-70">{config.pages.shop.intro}</p>}
        </div>

        <div className="mb-10 flex flex-col gap-4 border-y border-ink/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block sm:w-80">
            <span className="sr-only">Search jackets</span>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jackets"
              className="w-full border border-ink/20 bg-transparent py-2.5 pl-10 pr-3 text-sm placeholder:opacity-50"
              style={{ borderRadius: 'var(--radius)' }}
            />
          </label>
          <div className="flex items-center gap-4 text-sm">
            <span className="opacity-60" aria-live="polite">
              {list.length} {list.length === 1 ? 'jacket' : 'jackets'}
            </span>
            <label className="flex items-center gap-2">
              <span className="opacity-60">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="border border-ink/20 bg-transparent px-3 py-2"
                style={{ borderRadius: 'var(--radius)' }}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
        </div>

        {list.length > 0 ? (
          <ProductGrid products={list} />
        ) : (
          <EmptyState
            title={q ? 'No jackets match your search' : 'No jackets yet'}
            text={q ? 'Try a different word, or clear the search.' : 'Published products will appear here.'}
            action={q ? <button className="text-sm underline" onClick={() => setQ('')}>Clear search</button> : undefined}
          />
        )}
      </div>
    </section>
  );
}
