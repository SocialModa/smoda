import { Link } from 'react-router-dom';
import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';
import { useSite } from '@/context/SiteContext';
import { cn, isExternalHref } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'light';

interface Common {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

/** Builds the class + inline style for a storefront button from the global button settings. */
export function useButtonStyle(variant: Variant = 'primary') {
  const { config } = useSite();
  const b = config.layout.button;
  const radius = b.shape === 'pill' ? '999px' : b.shape === 'rounded' ? 'var(--radius)' : '0px';
  const solid = b.style === 'solid';
  const base = variant === 'light' ? '#f6efe6' : variant === 'accent' ? 'rgb(var(--c-secondary))' : 'rgb(var(--c-primary))';
  const onBase = variant === 'light' ? '#14110f' : '#ffffff';
  const style: CSSProperties = {
    borderRadius: radius,
    background: solid ? base : 'transparent',
    color: solid ? onBase : variant === 'light' ? '#f6efe6' : base,
    borderColor: base,
    textTransform: b.uppercase ? 'uppercase' : 'none',
    letterSpacing: b.uppercase ? '0.14em' : '0.02em',
  };
  const cls = cn(
    'inline-flex items-center justify-center gap-2 border px-7 py-3.5 text-[0.8rem] font-medium transition duration-300',
    'hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50',
  );
  return { cls, style };
}

/** Link-style button. Internal paths use the router, external URLs / mailto use a normal anchor. */
export function ButtonLink({ href, variant, className, children }: Common & { href: string }) {
  const { cls, style } = useButtonStyle(variant);
  const c = cn(cls, className);
  if (isExternalHref(href)) {
    return (
      <a href={href} className={c} style={style} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} className={c} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={c} style={style}>
      {children}
    </Link>
  );
}

export function Button({ variant, className, children, ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { cls, style } = useButtonStyle(variant);
  return (
    <button className={cn(cls, className)} style={style} {...rest}>
      {children}
    </button>
  );
}

/** Generic navigation link used by header / footer. */
export function NavLinkItem({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} onClick={onClick} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
