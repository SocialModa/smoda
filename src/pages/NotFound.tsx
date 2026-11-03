import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { ButtonLink } from '@/components/store/SiteButton';

export default function NotFound({ message }: { message?: string }) {
  const { config } = useSite();
  useSeo(`Page not found | ${config.brand.name}`);
  return (
    <section className="sm-section">
      <div className="sm-container flex flex-col items-center gap-6 text-center">
        <p className="text-[0.74rem] uppercase tracking-[0.34em] opacity-60">Error 404</p>
        <h1 className="text-[clamp(3rem,9vw,6.5rem)]">Page not found</h1>
        <p className="max-w-md opacity-70">{message || 'The page you are looking for has moved, been unpublished or never existed.'}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <ButtonLink href="/" variant="primary">
            Back to home
          </ButtonLink>
          <ButtonLink href="/shop" variant="accent">
            Browse jackets
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
