import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Clock } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { BrandMark } from './Header';
import { NavLinkItem } from './SiteButton';
import SocialIcon, { socialLabel } from './SocialIcon';

export default function Footer() {
  const { config } = useSite();
  const f = config.footer;
  const c = config.contact;
  const copyright = f.copyright.replace('{year}', String(new Date().getFullYear()));

  return (
    <footer style={{ background: f.background, color: f.text }} className="mt-auto">
      <div className="sm-container grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div className="space-y-5">
          <Link to="/" aria-label={`${config.brand.name} home`} className="inline-block text-white/95">
            <BrandMark />
          </Link>
          <p data-edit="footer.about" className="max-w-sm text-[0.94rem] leading-relaxed opacity-80">{f.about}</p>
          {f.social.length > 0 && (
            <ul className="flex flex-wrap gap-2.5 pt-1" aria-label="Social media">
              {f.social.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLabel(s.platform)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-current/30 opacity-80 transition hover:-translate-y-0.5 hover:opacity-100"
                  >
                    <SocialIcon platform={s.platform} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Footer" className="space-y-4">
          <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.3em] text-white/90" style={{ fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500 }}>Explore</h2>
          <ul className="space-y-2.5 text-[0.94rem]">
            {config.header.nav.map((n) => (
              <li key={n.id}>
                <NavLinkItem href={n.href} className="opacity-80 transition hover:opacity-100">
                  {n.label}
                </NavLinkItem>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.3em] text-white/90" style={{ fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500 }}>Contact</h2>
          <ul className="space-y-3 text-[0.94rem]">
            {c.email && (
              <li className="flex items-start gap-3">
                <Mail size={17} className="mt-1 shrink-0 opacity-70" />
                <a href={`mailto:${c.email}`} className="break-all opacity-80 transition hover:opacity-100">{c.email}</a>
              </li>
            )}
            {c.phone && (
              <li className="flex items-start gap-3">
                <Phone size={17} className="mt-1 shrink-0 opacity-70" />
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="opacity-80 transition hover:opacity-100">{c.phone}</a>
              </li>
            )}
            {c.address && (
              <li className="flex items-start gap-3">
                <MapPin size={17} className="mt-1 shrink-0 opacity-70" />
                <span className="whitespace-pre-line opacity-80">{c.address}</span>
              </li>
            )}
            {c.hours && (
              <li className="flex items-start gap-3">
                <Clock size={17} className="mt-1 shrink-0 opacity-70" />
                <span className="opacity-80">{c.hours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="sm-container py-6 text-[0.8rem] opacity-70">{copyright}</div>
      </div>
    </footer>
  );
}
