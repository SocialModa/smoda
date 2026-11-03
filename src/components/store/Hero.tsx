import { useSite } from '@/context/SiteContext';
import { ButtonLink } from './SiteButton';
import SmartImage from './SmartImage';

export default function Hero() {
  const { config } = useSite();
  const h = config.hero;
  const justify = h.align === 'center' ? 'items-center text-center' : h.align === 'right' ? 'items-end text-right' : 'items-start text-left';

  return (
    <section className="relative isolate flex items-center overflow-hidden" style={{ minHeight: 'var(--hero-h)' }} aria-label="Introduction">
      <SmartImage src={h.image} alt="" eager repoHint={config.repo} className="absolute inset-0 -z-20 h-full w-full" />
      <div data-edit="hero.image" className="absolute inset-0 -z-10" style={{ background: h.overlayColor, opacity: h.overlayOpacity / 100 }} />
      <div className="sm-container py-24">
        <div className={`flex max-w-3xl flex-col gap-6 ${justify} ${h.align === 'center' ? 'mx-auto' : h.align === 'right' ? 'ml-auto' : ''}`}>
          {h.eyebrow && (
            <p data-edit="hero.eyebrow" className="text-[0.74rem] uppercase tracking-[0.34em]" style={{ color: h.subtitleColor }}>
              {h.eyebrow}
            </p>
          )}
          <h1 data-edit="hero.headline" style={{ color: h.headlineColor, fontSize: 'var(--hero-title)', lineHeight: 1.04 }}>
            {h.headline}
          </h1>
          {h.subtitle && (
            <p data-edit="hero.subtitle" className="max-w-xl text-[1.05rem] leading-relaxed md:text-lg" style={{ color: h.subtitleColor }}>
              {h.subtitle}
            </p>
          )}
          {h.ctaText && (
            <div className="pt-3" data-edit="hero.ctaText">
              <ButtonLink href={h.ctaHref || '/shop'} variant="accent">
                {h.ctaText}
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
