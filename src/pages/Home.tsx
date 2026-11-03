import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import Hero from '@/components/store/Hero';
import ProductGrid from '@/components/store/ProductGrid';
import EmptyState from '@/components/store/EmptyState';
import SmartImage from '@/components/store/SmartImage';
import { ButtonLink } from '@/components/store/SiteButton';

export default function Home() {
  const { config, products } = useSite();
  const P = config.products;
  const about = config.pages.about;
  useSeo(config.brand.pageTitle, config.brand.metaDescription);

  const shown = products.slice(0, Math.max(1, P.limit));

  return (
    <>
      <Hero />

      <section id="collection" className="sm-section" aria-labelledby="collection-title">
        <div className="sm-container">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 id="collection-title" data-edit="products.title" className="text-[clamp(2.2rem,4.6vw,3.6rem)]">
                {P.title}
              </h2>
              {P.subtitle && <p data-edit="products.subtitle" className="mt-4 text-[1.02rem] leading-relaxed opacity-70">{P.subtitle}</p>}
            </div>
            {products.length > 0 && (
              <ButtonLink href="/shop" variant="primary">
                {P.viewAllText || 'View all'}
              </ButtonLink>
            )}
          </div>

          {shown.length > 0 ? (
            <ProductGrid products={shown} />
          ) : (
            <EmptyState
              title="The collection is being prepared"
              text="New jackets are on their way. Please check back soon."
            />
          )}
        </div>
      </section>

      <section className="sm-section" style={{ background: 'rgb(var(--c-surface))' }} aria-labelledby="story-title">
        <div className="sm-container grid items-center gap-12 md:grid-cols-2 md:gap-20">
          <div data-edit="pages.about.image" className="aspect-[4/5] overflow-hidden md:order-2" style={{ borderRadius: 'var(--radius)' }}>
            <SmartImage src={about.image} alt="Leather craftsmanship" repoHint={config.repo} className="h-full w-full" />
          </div>
          <div className="space-y-7">
            <h2 id="story-title" data-edit="pages.about.title" className="text-[clamp(2rem,4vw,3.2rem)]">
              {about.title}
            </h2>
            <p data-edit="pages.about.intro" className="text-[1.05rem] leading-relaxed opacity-75">{about.intro}</p>
            <ul className="space-y-5" data-edit="pages.about.highlights">
              {about.highlights.slice(0, 3).map((h) => (
                <li key={h.id} className="border-l-2 border-accent pl-5">
                  <h3 className="text-xl">{h.title}</h3>
                  <p className="mt-1 text-[0.92rem] leading-relaxed opacity-70">{h.text}</p>
                </li>
              ))}
            </ul>
            <ButtonLink href="/about" variant="accent">
              {config.pages.home.storyButton}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
