// Post-build step for GitHub Pages:
// 1. dist/404.html: redirects unknown deep links to the app (single-page-app trick).
// 2. Per-page HTML (dist/product/<slug>/index.html, shop, about, contact):
//    copies of index.html with the correct <title>, description and Open Graph
//    tags, so Google and link previews (WhatsApp, Instagram, iMessage...) see
//    real product information instead of the generic home page.
//    The React app still takes over in the browser as usual.
// Optional: set SITE_URL (e.g. https://socialmoda.com) so share images and
// canonical links are absolute. The GitHub workflow sets it automatically.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.VITE_BASE || '/';
const segmentsToKeep = base.split('/').filter(Boolean).length;
const siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '');

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

/* ---------- 404 redirect ---------- */
const html404 = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SocialModa</title>
    <script>
      var pathSegmentsToKeep = ${segmentsToKeep};
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body></body>
</html>
`;
writeFileSync('dist/404.html', html404);
writeFileSync('dist/.nojekyll', '');

/* ---------- per-page SEO HTML ---------- */
const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};
const config = readJson('public/data/site-config.json', {});
const products = (readJson('public/data/products.json', { products: [] }).products || []).filter((p) => p.status === 'published');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const clip = (s, n = 160) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
};
const brand = config.brand?.name || 'SocialModa';
const baseNoSlash = base.endsWith('/') ? base : base + '/';
const absolute = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('local/')) return '';
  const clean = path.replace(/^\/+/, '');
  return siteUrl ? `${siteUrl}${baseNoSlash}${clean}` : '';
};

const template = readFileSync('dist/index.html', 'utf8');

function render({ route, title, description, image, type = 'website' }) {
  let out = template;
  const url = siteUrl ? `${siteUrl}${baseNoSlash}${route}` : '';
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = out.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`);
  const tags = [
    `<meta property="og:site_name" content="${esc(brand)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    url ? `<meta property="og:url" content="${esc(url)}" />` : '',
    url ? `<link rel="canonical" href="${esc(url)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
  ]
    .filter(Boolean)
    .join('\n    ');
  out = out.replace('</head>', `    ${tags}\n  </head>`);
  const dir = join('dist', route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), out);
}

const homeDesc = config.brand?.metaDescription || '';
const homeImage = absolute(config.hero?.image);
const pages = config.pages || {};
let count = 0;

// Home: patch the root index.html itself so the shared link preview is correct
{
  let out = template;
  const title = config.brand?.pageTitle || `${brand} | Premium Leather Jackets`;
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = out.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(homeDesc)}" />`);
  const tags = [
    `<meta property="og:site_name" content="${esc(brand)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(homeDesc)}" />`,
    homeImage ? `<meta property="og:image" content="${esc(homeImage)}" />` : '',
    siteUrl ? `<meta property="og:url" content="${esc(siteUrl + baseNoSlash)}" />` : '',
    siteUrl ? `<link rel="canonical" href="${esc(siteUrl + baseNoSlash)}" />` : '',
    `<meta name="twitter:card" content="${homeImage ? 'summary_large_image' : 'summary'}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');
  out = out.replace('</head>', `    ${tags}\n  </head>`);
  writeFileSync('dist/index.html', out);
}

for (const [route, key, fallback] of [
  ['shop', 'shop', 'Shop'],
  ['about', 'about', 'About'],
  ['contact', 'contact', 'Contact'],
]) {
  const pg = pages[key] || {};
  render({
    route,
    title: `${pg.title || fallback} | ${brand}`,
    description: clip(pg.intro || homeDesc),
    image: homeImage,
  });
  count++;
}

for (const p of products) {
  const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
  const cur = config.brand?.currency || '$';
  render({
    route: `product/${p.slug}`,
    title: `${p.name} | ${brand}`,
    description: clip(p.shortDescription || p.description || `${p.name}, ${cur}${price}`),
    image: absolute(p.images?.[0]) || homeImage,
    type: 'product',
  });
  count++;
}

// Admin pages must not be indexed
for (const route of ['admin', 'admin/login']) {
  let out = template.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>');
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(brand)} Admin</title>`);
  mkdirSync(join('dist', route), { recursive: true });
  writeFileSync(join('dist', route, 'index.html'), out);
  count++;
}

writeFileSync(
  'dist/robots.txt',
  `User-agent: *\nDisallow: ${baseNoSlash}admin\n${siteUrl ? `Sitemap: ${siteUrl}${baseNoSlash}sitemap.xml\n` : ''}`,
);
if (siteUrl) {
  const urls = ['', 'shop', 'about', 'contact', ...products.map((p) => `product/${p.slug}`)];
  writeFileSync(
    'dist/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${esc(siteUrl + baseNoSlash + u)}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
  );
}

console.log(`postbuild: 404.html, ${count} prerendered page(s), robots.txt${siteUrl ? ', sitemap.xml' : ' (set SITE_URL for sitemap and absolute share images)'}`);
