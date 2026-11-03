import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { useSeo, useJsonLd } from '@/lib/seo';
import { resolveImg } from '@/lib/images';
import { cn } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import ProductGrid from '@/components/store/ProductGrid';
import { PriceTag } from '@/components/store/ProductCard';
import { ButtonLink } from '@/components/store/SiteButton';
import NotFound from './NotFound';

export default function ProductPage() {
  const { slug } = useParams();
  const { config, products, allProducts } = useSite();
  const { isAuthenticated } = useAuth();
  const product = (isAuthenticated ? allProducts : products).find((p) => p.slug === slug);

  const [index, setIndex] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
    setSize('');
    setColor(product?.colors[0]?.name ?? '');
  }, [product?.id]);

  const title = product ? `${product.name} | ${config.brand.name}` : `Jacket not found | ${config.brand.name}`;
  useSeo(title, product ? product.shortDescription || product.description.slice(0, 155) : undefined, product ? resolveImg(product.images[0]) : undefined);

  const jsonLd = useMemo(() => {
    if (!product) return null;
    const onSale = !!product.salePrice && product.salePrice < product.price;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      sku: product.sku,
      description: product.shortDescription || product.description,
      image: product.images.map((i) => new URL(resolveImg(i), window.location.href).href),
      brand: { '@type': 'Brand', name: config.brand.name },
      offers: {
        '@type': 'Offer',
        priceCurrency: config.brand.currency,
        price: onSale ? product.salePrice : product.price,
        availability: 'https://schema.org/InStock',
      },
    };
  }, [product, config.brand.name, config.brand.currency]);
  useJsonLd('product-jsonld', jsonLd);

  if (!product) {
    return <NotFound message="This jacket is not available. It may have been renamed or unpublished." />;
  }

  const images = product.images.length ? product.images : [''];
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);
  const related = products.filter((p) => p.id !== product.id).slice(0, 4);
  const paragraphs = product.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const enquiry = new URLSearchParams({ product: product.slug });
  if (size) enquiry.set('size', size);
  if (color) enquiry.set('color', color);

  return (
    <>
      <section className="sm-section !pb-0" style={{ paddingTop: 'calc(var(--section-y) * 0.45)' }}>
        <div className="sm-container">
          <Link to="/shop" className="mb-8 inline-flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.18em] opacity-70 transition hover:opacity-100">
            <ArrowLeft size={15} aria-hidden="true" /> {config.pages.product.backLink}
          </Link>

          {product.status === 'draft' && (
            <p className="mb-6 border border-amber-500/50 bg-amber-100 px-4 py-2 text-sm text-amber-900" role="status">
              Draft preview: this jacket is hidden from visitors until you publish it.
            </p>
          )}

          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            {/* Gallery */}
            <div className="space-y-4">
              <div
                className="relative aspect-[4/5] overflow-hidden outline-offset-4"
                style={{ borderRadius: 'var(--radius)', background: 'rgb(var(--c-surface))' }}
                tabIndex={0}
                role="group"
                aria-roledescription="carousel"
                aria-label={`${product.name} photos`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') go(-1);
                  if (e.key === 'ArrowRight') go(1);
                }}
                onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchX.current == null) return;
                  const dx = e.changedTouches[0].clientX - touchX.current;
                  if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                  touchX.current = null;
                }}
              >
                <SmartImage
                  key={images[index]}
                  src={images[index]}
                  alt={`${product.name}, photo ${index + 1} of ${images.length}`}
                  fit="cover"
                  eager
                  repoHint={config.repo}
                  className="h-full w-full animate-fade-only"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => go(-1)}
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow transition hover:bg-white"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      onClick={() => go(1)}
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow transition hover:bg-white"
                    >
                      <ChevronRight size={22} />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white" aria-hidden="true">
                      {index + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <ul className="thin-scroll flex gap-3 overflow-x-auto pb-1" aria-label="Choose photo">
                  {images.map((img, i) => (
                    <li key={img + i} className="shrink-0">
                      <button
                        onClick={() => setIndex(i)}
                        aria-label={`Show photo ${i + 1}`}
                        aria-current={i === index}
                        className={cn('block h-24 w-[4.8rem] overflow-hidden border-2 transition sm:h-28 sm:w-[5.6rem]', i === index ? 'border-accent' : 'border-transparent opacity-65 hover:opacity-100')}
                        style={{ borderRadius: 'calc(var(--radius) * 0.6)' }}
                      >
                        <SmartImage src={img} alt="" repoHint={config.repo} className="h-full w-full" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Details */}
            <div className="space-y-8 lg:pt-4">
              <div className="space-y-4">
                <p className="text-[0.74rem] uppercase tracking-[0.3em] opacity-60">Ref. {product.sku || '—'}</p>
                <h1 className="text-[clamp(2.2rem,4.4vw,3.4rem)]">{product.name}</h1>
                <PriceTag product={product} large />
                {product.shortDescription && <p className="text-[1.02rem] leading-relaxed opacity-75">{product.shortDescription}</p>}
              </div>

              {product.colors.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className="text-[0.74rem] uppercase tracking-[0.22em] opacity-70">
                    Colour{color && <span className="ml-2 normal-case tracking-normal opacity-100">{color}</span>}
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.name)}
                        aria-label={c.name}
                        aria-pressed={color === c.name}
                        title={c.name}
                        className={cn('h-9 w-9 rounded-full border-2 p-0.5 transition', color === c.name ? 'border-accent' : 'border-ink/20 hover:border-ink/50')}
                      >
                        <span className="block h-full w-full rounded-full border border-black/10" style={{ background: c.hex }} />
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {product.sizes.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className="text-[0.74rem] uppercase tracking-[0.22em] opacity-70">Available sizes</legend>
                  <div className="flex flex-wrap gap-2.5">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(size === s ? '' : s)}
                        aria-pressed={size === s}
                        className={cn('min-w-12 border px-4 py-2.5 text-sm transition', size === s ? 'border-ink bg-ink text-canvas' : 'border-ink/25 hover:border-ink')}
                        style={{ borderRadius: 'calc(var(--radius) * 0.6)' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="space-y-3 pt-1">
                <ButtonLink href={`/contact?${enquiry.toString()}`} variant="primary" className="w-full sm:w-auto">
                  {config.pages.product.enquireButton}
                </ButtonLink>
                <p className="text-[0.82rem] opacity-60">Online ordering is not open yet. Send us your size and colour and we will reply personally.</p>
              </div>

              {paragraphs.length > 0 && (
                <div className="space-y-4 border-t border-ink/15 pt-8">
                  <h2 className="text-2xl">Description</h2>
                  <div className="space-y-4 leading-[1.8] opacity-75">
                    {paragraphs.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {product.specs.length > 0 && (
                <div className="space-y-4 border-t border-ink/15 pt-8">
                  <h2 className="text-2xl">Specifications</h2>
                  <dl className="divide-y divide-ink/10 text-[0.94rem]">
                    {product.specs.map((s, i) => (
                      <div key={s.label + i} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                        <dt className="opacity-60">{s.label}</dt>
                        <dd>{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="sm-section" aria-labelledby="related-title">
          <div className="sm-container">
            <h2 id="related-title" className="mb-10 text-[clamp(1.9rem,3.6vw,2.8rem)]">
              {config.pages.product.relatedTitle}
            </h2>
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </>
  );
}
