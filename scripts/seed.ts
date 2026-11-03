/**
 * Regenerates the starter content: public/data/*.json and the illustrated product images.
 * Run with:  npm run seed
 *
 * The product pictures are generated illustrations so the demo looks complete out of the box.
 * Replace them with real photography in the admin Media Library / Product editor.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';

type Style = 'Biker' | 'Bomber' | 'Trucker' | 'Shearling' | 'Racer';

interface Seed {
  slug: string;
  name: string;
  style: Style;
  color: string;
  accent: string;
  price: number;
  sale?: number;
  sku: string;
  short: string;
  long: string;
  fit: string;
  leather: string;
  lining: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  status: 'published' | 'draft';
  created: string;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SEEDS: Seed[] = [
  {
    slug: 'classic-black-leather-jacket', name: 'Classic Black Leather Jacket', style: 'Biker', color: '#1b1816', accent: '#b4b4b4',
    price: 420, sale: 380, sku: 'SM-BKR-001',
    short: 'The icon. Asymmetric zip, belted waist, buttery lambskin.',
    long: 'The jacket that started it all. Cut from soft full-grain lambskin with an asymmetric front zip, a snap-down collar and a belted hem, it carries the proportions of the original motorcycle jacket without the stiffness.\n\nThe leather is tanned slowly so it stays supple from day one and develops a quiet sheen with wear. A fully lined body and zip cuffs keep the silhouette clean.',
    fit: 'Slim', leather: 'Full-grain lambskin', lining: 'Cotton twill', sizes: SIZES,
    colors: [{ name: 'Black', hex: '#1b1816' }], status: 'published', created: '2025-01-12T09:00:00.000Z',
  },
  {
    slug: 'cognac-cafe-racer-jacket', name: 'Cognac Café Racer Jacket', style: 'Racer', color: '#9a5a2c', accent: '#d2ab66',
    price: 465, sku: 'SM-RCR-002',
    short: 'Minimal lines, mandarin collar, warm cognac tone.',
    long: 'A clean, collarless-leaning racer with a mandarin collar and a straight centre zip. The cognac hide is dyed through, so scuffs read as character instead of damage.\n\nSlim sleeves and a short body make it easy to wear over a shirt or a knit.',
    fit: 'Slim', leather: 'Full-grain cowhide', lining: 'Viscose', sizes: SIZES,
    colors: [{ name: 'Cognac', hex: '#9a5a2c' }, { name: 'Black', hex: '#1b1816' }], status: 'published', created: '2025-01-20T09:00:00.000Z',
  },
  {
    slug: 'oxblood-biker-jacket', name: 'Oxblood Biker Jacket', style: 'Biker', color: '#4f171b', accent: '#c0ad92',
    price: 520, sale: 468, sku: 'SM-BKR-003',
    short: 'Deep burgundy lambskin with antique silver hardware.',
    long: 'The classic biker in a deep, saturated oxblood. Antique silver hardware sits against the dark red leather, and the colour deepens as the hide breaks in.\n\nIt is built with the same belted hem, snap collar and zip cuffs as our black version.',
    fit: 'Slim', leather: 'Full-grain lambskin', lining: 'Cotton twill', sizes: SIZES,
    colors: [{ name: 'Oxblood', hex: '#4f171b' }], status: 'published', created: '2025-02-02T09:00:00.000Z',
  },
  {
    slug: 'olive-field-trucker-jacket', name: 'Olive Field Trucker Jacket', style: 'Trucker', color: '#3b4331', accent: '#c2b98f',
    price: 395, sku: 'SM-TRK-004',
    short: 'Workwear heritage in a washed olive leather.',
    long: 'A workwear classic reworked in a soft, washed olive leather. Two chest pockets with flaps, a point collar and a button front give it an easy, relaxed shape.\n\nA brushed cotton lining adds warmth without bulk.',
    fit: 'Regular', leather: 'Washed cowhide', lining: 'Brushed cotton', sizes: SIZES,
    colors: [{ name: 'Olive', hex: '#3b4331' }], status: 'published', created: '2025-02-14T09:00:00.000Z',
  },
  {
    slug: 'chocolate-flight-bomber-jacket', name: 'Chocolate Flight Bomber Jacket', style: 'Bomber', color: '#3a2418', accent: '#b8955d',
    price: 445, sku: 'SM-BMB-005',
    short: 'Ribbed cuffs, brass zip, roomy flight-jacket fit.',
    long: 'Inspired by mid-century flight jackets, with ribbed cuffs, collar and hem and a heavy brass front zip. The chocolate lambskin is soft enough to layer over a hoodie without losing its shape.\n\nA satin lining makes it easy to slip on and off.',
    fit: 'Relaxed', leather: 'Full-grain lambskin', lining: 'Satin', sizes: SIZES,
    colors: [{ name: 'Chocolate', hex: '#3a2418' }, { name: 'Black', hex: '#1b1816' }], status: 'published', created: '2025-03-01T09:00:00.000Z',
  },
  {
    slug: 'slate-minimalist-racer-jacket', name: 'Slate Minimalist Racer Jacket', style: 'Racer', color: '#2e3239', accent: '#a3abb9',
    price: 410, sale: 370, sku: 'SM-RCR-006',
    short: 'Cool slate grey, sleek cut, zip cuffs.',
    long: 'A slate grey racer with a razor-straight cut and zip cuffs. The matte finish keeps the look quiet and modern, and it works as easily with tailoring as with denim.\n\nThe hardware is a dark gunmetal to keep everything understated.',
    fit: 'Slim', leather: 'Full-grain lambskin', lining: 'Viscose', sizes: SIZES,
    colors: [{ name: 'Slate', hex: '#2e3239' }], status: 'published', created: '2025-03-18T09:00:00.000Z',
  },
  {
    slug: 'sand-nubuck-trucker-jacket', name: 'Sand Nubuck Trucker Jacket', style: 'Trucker', color: '#b08f66', accent: '#ecd9b0',
    price: 430, sku: 'SM-TRK-007',
    short: 'Soft nubuck finish in a warm sand tone.',
    long: 'A soft, velvety nubuck trucker in warm sand, with contrast stitching and a relaxed fit. Nubuck is sanded on the grain side for its characteristic texture; a light protective finish helps it resist everyday marks.\n\nBest in dry weather and ideal for spring.',
    fit: 'Regular', leather: 'Nubuck cowhide', lining: 'Cotton', sizes: SIZES.slice(0, 5),
    colors: [{ name: 'Sand', hex: '#b08f66' }], status: 'published', created: '2025-04-05T09:00:00.000Z',
  },
  {
    slug: 'shearling-aviator-jacket', name: 'Shearling Aviator Jacket', style: 'Shearling', color: '#5b3a21', accent: '#efe3cf',
    price: 780, sku: 'SM-SHR-008',
    short: 'Real shearling collar and lining for the coldest days.',
    long: 'Our warmest jacket: a full shearling collar, wool-blend lining and a heavy front zip. Draft product: publish it from the admin dashboard when the photography is ready.\n\nThe outer hide is a rich brown that will soften and darken with wear.',
    fit: 'Regular', leather: 'Full-grain cowhide', lining: 'Shearling', sizes: SIZES.slice(1),
    colors: [{ name: 'Brown', hex: '#5b3a21' }], status: 'draft', created: '2025-04-22T09:00:00.000Z',
  },
];

/* ------------------------------------------------------------------ */
/* Illustration generator                                              */
/* ------------------------------------------------------------------ */

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, v + amt));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

const BODY = 'M62 40 L82 26 L118 26 L138 40 L182 72 L172 172 L150 170 L150 208 L50 208 L50 170 L28 172 L18 72 Z';

function details(style: Style, base: string, acc: string): string {
  const dark = shade(base, -30), light = shade(base, 26);
  const stitch = `stroke="${shade(base, 38)}" stroke-width=".7" stroke-dasharray="2.2 1.6" fill="none" opacity=".75"`;
  const seams = `<path d="M62 42 L50 168 M138 42 L150 168" ${stitch}/>`;
  switch (style) {
    case 'Biker':
      return `${seams}
        <path d="M82 26 L100 31 L96 86 L56 66 Z" fill="${dark}"/><path d="M118 26 L100 31 L112 90 L148 68 Z" fill="${light}" opacity=".85"/>
        <path d="M82 26 L100 31 L96 86 L56 66" ${stitch}/><path d="M118 26 L100 31 L112 90 L148 68" ${stitch}/>
        <path d="M104 34 L84 208" stroke="${acc}" stroke-width="2.6"/><path d="M104 34 L84 208" stroke="${dark}" stroke-width=".8" stroke-dasharray="1 1.4" opacity=".7"/>
        <path d="M50 150 H150" stroke="${dark}" stroke-width="7"/><rect x="95" y="144" width="11" height="12" rx="2" fill="${acc}"/>
        <path d="M60 104 H86" stroke="${acc}" stroke-width="2.4" stroke-linecap="round"/><circle cx="74" cy="124" r="2.6" fill="${acc}"/>
        <path d="M28 172 H50 M150 170 H172" stroke="${acc}" stroke-width="2.2"/>`;
    case 'Bomber':
      return `${seams}
        <rect x="80" y="20" width="40" height="17" rx="7" fill="${dark}"/><rect x="50" y="196" width="100" height="14" rx="3" fill="${dark}"/>
        <rect x="13" y="164" width="22" height="16" rx="3" fill="${dark}"/><rect x="165" y="164" width="22" height="16" rx="3" fill="${dark}"/>
        <path d="M80 24 H120 M50 200 H150 M50 204 H150" ${stitch}/>
        <path d="M100 36 V196" stroke="${acc}" stroke-width="3"/><rect x="96" y="40" width="8" height="10" rx="2" fill="${acc}"/>
        <rect x="110" y="88" width="24" height="5" rx="2" fill="${acc}" opacity=".85"/><path d="M110 88 h24" ${stitch}/>`;
    case 'Trucker':
      return `${seams}
        <path d="M80 26 L100 42 L120 26 L132 46 L100 58 L68 46 Z" fill="${dark}"/><path d="M80 26 L100 42 L120 26 L132 46 L100 58 L68 46 Z" ${stitch}/>
        <path d="M100 42 V208" stroke="${acc}" stroke-width="1.6"/>
        <rect x="63" y="86" width="29" height="27" rx="3" fill="none" stroke="${acc}" stroke-width="1.6"/><rect x="108" y="86" width="29" height="27" rx="3" fill="none" stroke="${acc}" stroke-width="1.6"/>
        <path d="M63 86 h29 v8 l-14.5 5 l-14.5 -5 z" fill="${dark}" opacity=".7"/><path d="M108 86 h29 v8 l-14.5 5 l-14.5 -5 z" fill="${dark}" opacity=".7"/>
        <circle cx="77.5" cy="98" r="2.4" fill="${acc}"/><circle cx="122.5" cy="98" r="2.4" fill="${acc}"/>
        <circle cx="100" cy="74" r="2.6" fill="${acc}"/><circle cx="100" cy="124" r="2.6" fill="${acc}"/><circle cx="100" cy="166" r="2.6" fill="${acc}"/>`;
    case 'Shearling': {
      let puffs = '';
      for (let i = 0; i < 11; i++) puffs += `<circle cx="${60 + i * 8}" cy="${31 + (i % 2) * 5}" r="9.5" fill="${acc}"/>`;
      for (let i = 0; i < 6; i++) puffs += `<circle cx="${80 + i * 8}" cy="${47 + (i % 2) * 3}" r="8.5" fill="${shade(acc, -10)}"/>`;
      return `${seams}
        <path d="M100 48 V208" stroke="${dark}" stroke-width="3"/><rect x="50" y="197" width="100" height="11" fill="${acc}"/>
        <rect x="17" y="167" width="16" height="9" fill="${acc}"/><rect x="167" y="167" width="16" height="9" fill="${acc}"/>${puffs}`;
    }
    default: // Racer
      return `${seams}
        <rect x="85" y="20" width="30" height="17" rx="6" fill="${dark}"/><path d="M85 24 h30" ${stitch}/>
        <path d="M100 36 V208" stroke="${acc}" stroke-width="3"/><rect x="96" y="40" width="8" height="10" rx="2" fill="${acc}"/>
        <path d="M50 120 H150" stroke="${dark}" stroke-width="1.6" opacity=".8"/><path d="M60 62 H84 M116 62 H140" stroke="${dark}" stroke-width="3"/>
        <path d="M54 177 h18 M128 177 h18" stroke="${acc}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
}

function jacketArt(s: Seed, variant: 'front' | 'detail' | 'angle'): string {
  const base = s.color, acc = s.accent;
  const lum = luminance(base);
  const bg =
    variant === 'front'
      ? ['#efe8dd', '#cdbfae']
      : variant === 'angle'
        ? ['#d9cab4', '#a99879']
        : lum < 0.3 ? ['#c5b8a6', '#8e7f6c'] : ['#2b2521', '#13100e'];
  const tf =
    variant === 'front'
      ? 'translate(80 170) scale(5.2)'
      : variant === 'angle'
        ? 'translate(600 790) rotate(-5) scale(4.9) translate(-100 -112)'
        : 'translate(-560 20) scale(11.2)';
  const id = `${s.slug}-${variant}`.replace(/[^a-z0-9-]/g, '');
  const spot = variant === 'detail' ? 0.18 : 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" width="1200" height="1500">
<defs>
  <linearGradient id="bg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
  <radialGradient id="sp-${id}" cx=".5" cy=".32" r=".7"><stop offset="0" stop-color="#fff" stop-opacity="${spot}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="body-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(base, 16)}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -22)}"/></linearGradient>
  <linearGradient id="gl-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
  <filter id="grain-${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${s.sku.length * 7}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.05"/></filter>
  <filter id="blur-${id}"><feGaussianBlur stdDeviation="${variant === 'detail' ? 2 : 4}"/></filter>
  <clipPath id="clip-${id}"><path d="${BODY}"/></clipPath>
</defs>
<rect width="1200" height="1500" fill="url(#bg-${id})"/>
<rect width="1200" height="1500" fill="url(#sp-${id})"/>
<g transform="${tf}">
  ${variant === 'detail' ? '' : `<ellipse cx="100" cy="212" rx="82" ry="7" fill="#000" opacity=".28" filter="url(#blur-${id})"/>`}
  <path d="${BODY}" fill="url(#body-${id})"/>
  <path d="M18 72 L62 40 L50 170 L28 172 Z" fill="#000" opacity=".14"/>
  <path d="M182 72 L138 40 L150 170 L172 172 Z" fill="#fff" opacity=".07"/>
  <g clip-path="url(#clip-${id})"><rect x="0" y="0" width="200" height="224" filter="url(#grain-${id})" opacity=".32"/><rect x="0" y="0" width="200" height="224" fill="url(#gl-${id})"/></g>
  ${details(s.style, base, acc)}
  <path d="${BODY}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".8"/>
</g>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Hero / About background art (rendered to JPG by a separate step)    */
/* ------------------------------------------------------------------ */

function textureArt(w: number, h: number, hue: 'dark' | 'warm'): string {
  // Relief comes from lighting a noise map; a tinted overlay then sets the colour and mood.
  const [tint, tintOpacity, light] = hue === 'dark' ? ['#1a0f08', 0.72, '#d9a875'] : ['#4a2a14', 0.5, '#f0c595'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
  <radialGradient id="v" cx=".5" cy=".5" r=".8"><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
  <radialGradient id="s" cx=".76" cy=".25" r=".55"><stop offset="0" stop-color="#ffd9a8" stop-opacity=".38"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/></radialGradient>
  <filter id="leather" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".045 .06" numOctaves="5" seed="11" result="n"/>
    <feDiffuseLighting in="n" lighting-color="${light}" surfaceScale="5" diffuseConstant="1.1"><feDistantLight azimuth="235" elevation="48"/></feDiffuseLighting>
  </filter>
  <filter id="pores" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.2"/>
  </filter>
</defs>
<rect width="${w}" height="${h}" filter="url(#leather)"/>
<rect width="${w}" height="${h}" filter="url(#pores)" opacity=".22"/>
<rect width="${w}" height="${h}" fill="${tint}" opacity="${tintOpacity}"/>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<rect width="${w}" height="${h}" fill="url(#v)"/>
</svg>
`;
}

/* ------------------------------------------------------------------ */

mkdirSync('public/assets/products', { recursive: true });
mkdirSync('public/assets/site', { recursive: true });
mkdirSync('public/data', { recursive: true });
mkdirSync('scripts/art', { recursive: true });

const products = SEEDS.map((s, i) => {
  const imgs: string[] = [];
  (['front', 'detail', 'angle'] as const).forEach((v, n) => {
    const file = `${s.slug}-${n + 1}.svg`;
    writeFileSync(`public/assets/products/${file}`, jacketArt(s, v));
    imgs.push(`assets/products/${file}`);
  });
  return {
    id: `p_${String(i + 1).padStart(3, '0')}`,
    slug: s.slug,
    name: s.name,
    sku: s.sku,
    price: s.price,
    salePrice: s.sale ?? null,
    shortDescription: s.short,
    description: s.long,
    specs: [
      { label: 'Style', value: s.style === 'Racer' ? 'Café racer' : s.style },
      { label: 'Leather', value: s.leather },
      { label: 'Lining', value: s.lining },
      { label: 'Fit', value: s.fit },
      { label: 'Hardware', value: 'Solid metal zip and snaps' },
      { label: 'Care', value: 'Professional leather cleaning only' },
    ],
    sizes: s.sizes,
    colors: s.colors,
    images: imgs,
    status: s.status,
    createdAt: s.created,
    updatedAt: s.created,
  };
});

writeFileSync('public/data/products.json', JSON.stringify({ updatedAt: '2025-01-01T00:00:00.000Z', products }, null, 2) + '\n');
writeFileSync('public/data/site-config.json', JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
writeFileSync('scripts/art/hero.svg', textureArt(1920, 1080, 'dark'));
writeFileSync('scripts/art/about.svg', textureArt(1600, 900, 'warm'));

console.log(`seed: ${products.length} products, ${products.length * 3} images, site-config.json, scripts/art/*.svg`);
