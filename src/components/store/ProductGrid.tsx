import type { Product } from '@/types';
import ProductCard from './ProductCard';

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid list-none p-0" style={{ gridTemplateColumns: 'repeat(var(--cols), minmax(0, 1fr))', gap: 'var(--gap)' }}>
      {products.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
