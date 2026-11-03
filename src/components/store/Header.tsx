import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { cn, isExternalHref } from '@/lib/utils';
import SmartImage from './SmartImage';

export function BrandMark({ className }: { className?: string }) {
  const { config } = useSite();
  const b = config.brand;
  return (
    <span className={cn('flex items-center gap-3', className)}>
      {b.logo && <SmartImage src={b.logo} alt={`${b.name} logo`} fit="contain" eager style={{ height: b.logoHeight, width: b.logoHeight * 3.2 }} className="shrink-0" repoHint={config.repo} />}
      {(!b.logo || b.showNameWithLogo) && (
        <span data-edit="brand.name" className="font-heading text-[1.55rem] uppercase leading-none tracking-[0.22em]" style={{ fontWeight: 600 }}>
          {b.name}
        </span>
      )}
    </span>
  );
}

export default function Header() {
  const { config } = useSite();
  const h = config.header;
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  const linkClass = (active: boolean) =>
    cn('relative py-1 text-[0.78rem] uppercase tracking-[0.18em] transition-opacity after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100', active ? 'after:scale-x-100' : 'opacity-80 hover:opacity-100');

  const nav = (
    <>
      {h.nav.map((n) =>
        isExternalHref(n.href) || n.href.startsWith('#') ? (
          <a key={n.id} href={n.href} className={linkClass(false)} {...(n.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {n.label}
          </a>
        ) : (
          <NavLink key={n.id} to={n.href} end={n.href === '/'} className={({ isActive }) => linkClass(isActive)}>
            {n.label}
          </NavLink>
        ),
      )}
    </>
  );

  const toggle = (
    <button
      className="inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
      onClick={() => setOpen((o) => !o)}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="mobile-menu"
    >
      {open ? <X size={22} /> : <Menu size={22} />}
    </button>
  );

  return (
    <header
      className={cn('z-40 w-full border-b border-white/10', h.sticky && 'sticky top-0')}
      style={{ background: h.background, color: h.text }}
    >
      <div className="sm-container flex items-center" style={{ height: 'var(--header-h)' }}>
        {h.logoPosition === 'center' ? (
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
            <nav className="hidden items-center gap-8 md:flex" aria-label="Main">{nav}</nav>
            <span className="md:hidden" />
            <Link to="/" aria-label={`${config.brand.name} home`} className="justify-self-center">
              <BrandMark />
            </Link>
            <div className="justify-self-end">{toggle}</div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-6">
            <Link to="/" aria-label={`${config.brand.name} home`}>
              <BrandMark />
            </Link>
            <nav className="hidden items-center gap-9 md:flex" aria-label="Main">{nav}</nav>
            {toggle}
          </div>
        )}
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="animate-fade-only border-t border-white/10 md:hidden" style={{ background: h.background }}>
          <div className="sm-container flex flex-col gap-1 py-4">
            {h.nav.map((n) =>
              isExternalHref(n.href) || n.href.startsWith('#') ? (
                <a key={n.id} href={n.href} className="block py-3 text-sm uppercase tracking-[0.2em]" {...(n.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {n.label}
                </a>
              ) : (
                <Link key={n.id} to={n.href} className="block py-3 text-sm uppercase tracking-[0.2em]">
                  {n.label}
                </Link>
              ),
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
