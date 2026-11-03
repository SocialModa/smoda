import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { useSite } from '@/context/SiteContext';
import { cn, formatPrice } from '@/lib/utils';
import SmartImage from './SmartImage';

export function PriceTag({ product, large }: { product: Product; large?: boolean }) {
  const { config } = useSite();
  const cur = config.brand.currency;
  const onSale = !!product.salePrice && product.salePrice < product.price;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5" style={{ fontFamily: 'var(--price-font)' }}>
      <span style={{ fontSize: large ? 'calc(var(--price-size) * 1.45)' : 'var(--price-size)', fontWeight: 'var(--price-weight)' as unknown as number }}>
        {formatPrice(onSale ? product.salePrice! : product.price, cur)}
      </span>
      {onSale && (
        <span className="text-[0.85em] line-through opacity-50" style={{ fontSize: large ? '1.05rem' : '0.9rem' }}>
          {formatPrice(product.price, cur)}
        </span>
      )}
    </span>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { config } = useSite();
  const P = config.products;
  const onSale = !!product.salePrice && product.salePrice < product.price;
  const pct = onSale ? Math.round((1 - product.salePrice! / product.price) * 100) : 0;

  const styleCls = {
    floating: 'bg-card',
    flat: 'bg-card',
    outlined: 'border border-ink/15 bg-card',
    minimal: 'bg-transparent',
  }[P.cardStyle];

  const hoverCls = cn(
    (P.hover === 'lift' || P.hover === 'lift-zoom') && 'hover:-translate-y-2 hover:[box-shadow:var(--shadow-hover)]',
  );
  const zoom = P.hover === 'zoom' || P.hover === 'lift-zoom';

  return (
    <Link
      to={`/product/${product.slug}`}
      aria-label={`${product.name}, ${formatPrice(onSale ? product.salePrice! : product.price, config.brand.currency)}. View product`}
      className={cn('group flex h-full flex-col overflow-hidden transition-all duration-500 ease-out', styleCls, hoverCls)}
      style={{
        borderRadius: 'var(--card-radius)',
        boxShadow: P.cardStyle === 'floating' ? 'var(--shadow)' : undefined,
      }}
    >
      <div className="relative" style={{ aspectRatio: P.aspectRatio, padding: P.imagePadding || 0 }}>
        <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: P.imagePadding || P.cardStyle === 'minimal' ? 'var(--card-radius)' : undefined }}>
        <SmartImage
          src={product.images[0]}
          alt={product.name}
          fit={P.imageFit}
          repoHint={config.repo}
          className={cn('h-full w-full', zoom && 'transition-transform duration-700 ease-out group-hover:scale-[1.06]')}
        />
        {product.images[1] && (
          <SmartImage
            src={product.images[1]}
            alt=""
            fit={P.imageFit}
            repoHint={config.repo}
            className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-sm:hidden"
          />
        )}
        </div>
        {onSale && (
          <span className="absolute left-3 top-3 bg-accent px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-white">
            −{pct}%
          </span>
        )}
      </div>
      <div className={cn('flex flex-1 flex-col gap-2', P.cardStyle === 'minimal' ? 'px-0 pb-1 pt-4' : 'p-4 sm:p-5')}>
        <h3 className="text-[1.3rem] leading-tight sm:text-[1.42rem]">{product.name}</h3>
        {P.showDescription && product.shortDescription && (
          <p className="line-clamp-2 text-[0.86rem] leading-relaxed opacity-65">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceTag product={product} />
          <span className="hidden text-[0.7rem] uppercase tracking-[0.18em] opacity-60 transition-opacity group-hover:opacity-100 sm:inline">View →</span>
        </div>
      </div>
    </Link>
  );
}
