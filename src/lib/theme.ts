import type { SiteConfig } from '@/types';
import { hexToRgbTriplet } from './utils';
import { fontStack } from './fonts';

/** Shadow for the "floating" cards. intensity 0..100 */
export function cardShadow(intensity: number, hover = false): string {
  const i = Math.max(0, Math.min(100, intensity)) * (hover ? 1.6 : 1);
  if (i <= 0) return 'none';
  const y = 4 + i * 0.28;
  const blur = 14 + i * 0.7;
  const alpha = Math.min(0.5, i / 260);
  return `0 ${y.toFixed(1)}px ${blur.toFixed(1)}px rgba(26, 18, 10, ${alpha.toFixed(3)})`;
}

/** Turns the site config into CSS variables + responsive media queries. */
export function buildThemeCss(c: SiteConfig): string {
  const { colors, fonts, typography } = c.brand;
  const L = c.layout;
  const P = c.products;
  const H = c.hero;
  const pad = L.pagePadding;
  const sec = L.sectionSpacing;
  const hs = H.headlineSize;

  const gap = (cols: number) => (cols >= 4 ? 28 : cols === 3 ? 24 : 16);

  return `
:root{
  --c-primary:${hexToRgbTriplet(colors.primary)};
  --c-secondary:${hexToRgbTriplet(colors.secondary)};
  --c-bg:${hexToRgbTriplet(colors.background)};
  --c-surface:${hexToRgbTriplet(colors.surface)};
  --c-text:${hexToRgbTriplet(colors.text)};
  --c-card:${hexToRgbTriplet(P.cardBackground)};
  --font-heading:${fontStack(fonts.heading)};
  --font-body:${fontStack(fonts.body)};
  --heading-weight:${typography.headingWeight};
  --heading-tracking:${(typography.headingTracking / 100).toFixed(3)}em;
  --heading-transform:${typography.uppercaseHeadings ? 'uppercase' : 'none'};
  --maxw:${L.maxWidth}px;
  --radius:${L.radius}px;
  --card-radius:${P.radius}px;
  --header-h:${c.header.height}px;
  --pad:${pad.desktop}px;
  --section-y:${sec.desktop}px;
  --hero-title:${hs.desktop}px;
  --cols:${P.columns.desktop};
  --gap:${gap(P.columns.desktop)}px;
  --hero-h:${H.height.desktop}vh;
  --shadow:${cardShadow(P.shadow)};
  --shadow-hover:${cardShadow(P.shadow, true)};
  --price-size:${P.priceSize}px;
  --price-weight:${P.priceWeight};
  --price-font:${P.priceFont === 'heading' ? 'var(--font-heading)' : 'var(--font-body)'};
}
html{font-size:${L.baseFontSize}px}
@media (max-width:1023px){
  :root{
    --cols:${P.columns.tablet};
    --gap:${gap(P.columns.tablet)}px;
    --hero-h:${H.height.tablet}vh;
    --pad:${pad.tablet}px;
    --section-y:${sec.tablet}px;
    --hero-title:${hs.tablet}px;
  }
}
@media (max-width:639px){
  :root{
    --cols:${P.columns.mobile};
    --gap:${gap(P.columns.mobile)}px;
    --hero-h:${H.height.mobile}vh;
    --pad:${pad.mobile}px;
    --section-y:${sec.mobile}px;
    --hero-title:${hs.mobile}px;
    --header-h:${Math.min(c.header.height, 68)}px;
  }
}
`.trim();
}
