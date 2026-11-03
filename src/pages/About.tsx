import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import SmartImage from '@/components/store/SmartImage';
import { ButtonLink } from '@/components/store/SiteButton';

export default function About() {
  const { config } = useSite();
  const a = config.pages.about;
  useSeo(`${a.title} | ${config.brand.name}`, a.intro);
  const paragraphs = a.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <section className="sm-section">
        <div className="sm-container grid items-center gap-12 md:grid-cols-2 md:gap-20">
          <div className="space-y-7">
            <h1 data-edit="pages.about.title" className="text-[clamp(2.6rem,5.6vw,4.6rem)]">{a.title}</h1>
            <p data-edit="pages.about.intro" className="text-[1.12rem] leading-relaxed opacity-80">{a.intro}</p>
            <div data-edit="pages.about.body" className="space-y-5 text-[1rem] leading-[1.85] opacity-75">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          <div data-edit="pages.about.image" className="aspect-[4/5] overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
            <SmartImage src={a.image} alt="Leather craftsmanship" repoHint={config.repo} className="h-full w-full" eager />
          </div>
        </div>
      </section>

      {a.highlights.length > 0 && (
        <section className="sm-section" style={{ background: 'rgb(var(--c-surface))' }} aria-label="What we stand for">
          <div data-edit="pages.about.highlights" className="sm-container grid gap-10 md:grid-cols-3">
            {a.highlights.map((h, i) => (
              <div key={h.id} className="space-y-3">
                <span className="font-heading text-5xl text-accent" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="text-2xl">{h.title}</h2>
                <p className="leading-relaxed opacity-70">{h.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="sm-section">
        <div className="sm-container flex flex-col items-center gap-6 text-center">
          <h2 data-edit="pages.about.ctaTitle" className="text-[clamp(2rem,4vw,3rem)]">{a.ctaTitle}</h2>
          <ButtonLink href="/shop" variant="primary">
            {a.ctaButton}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
