import type { Product, ProductsFile, SiteConfig } from '@/types';
import { DEFAULT_CONFIG, SEED_DATE } from '@/data/defaultConfig';
import { KEYS, lsGet, lsSet } from './storage';
import { deepMerge, slugify, uid } from './utils';

export const PATH_PRODUCTS = 'public/data/products.json';
export const PATH_CONFIG = 'public/data/site-config.json';

/* ---------------- normalisation (never trust JSON from outside) ---------------- */

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

export function normalizeProduct(raw: unknown): Product {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const name = str(r.name, 'Untitled jacket');
  const specs = Array.isArray(r.specs) ? r.specs : [];
  const colors = Array.isArray(r.colors) ? r.colors : [];
  const created = str(r.createdAt, SEED_DATE);
  return {
    id: str(r.id) || uid('p'),
    slug: str(r.slug) || slugify(name) || uid('jacket'),
    name,
    sku: str(r.sku),
    price: num(r.price),
    salePrice: typeof r.salePrice === 'number' && r.salePrice > 0 ? r.salePrice : null,
    shortDescription: str(r.shortDescription),
    description: str(r.description),
    specs: specs
      .map((s) => ({ label: str((s as Record<string, unknown>)?.label), value: str((s as Record<string, unknown>)?.value) }))
      .filter((s) => s.label || s.value),
    sizes: Array.isArray(r.sizes) ? r.sizes.filter((s): s is string => typeof s === 'string') : [],
    colors: colors
      .map((c) => ({ name: str((c as Record<string, unknown>)?.name), hex: str((c as Record<string, unknown>)?.hex, '#000000') }))
      .filter((c) => c.name),
    images: Array.isArray(r.images) ? r.images.filter((s): s is string => typeof s === 'string' && !!s) : [],
    status: r.status === 'draft' ? 'draft' : 'published',
    createdAt: created,
    updatedAt: str(r.updatedAt, created),
  };
}

export function normalizeProducts(raw: unknown): ProductsFile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    updatedAt: str(r.updatedAt, SEED_DATE),
    products: Array.isArray(r.products) ? r.products.map(normalizeProduct) : [],
  };
}

export function normalizeConfig(raw: unknown): SiteConfig {
  const merged = deepMerge(DEFAULT_CONFIG, raw);
  // Arrays are replaced wholesale by deepMerge: make sure they stay arrays
  if (!Array.isArray(merged.header.nav)) merged.header.nav = DEFAULT_CONFIG.header.nav;
  if (!Array.isArray(merged.footer.social)) merged.footer.social = [];
  if (!Array.isArray(merged.pages.about.highlights)) merged.pages.about.highlights = [];
  // Older saved configs stored these as single numbers: expand them to per-device values
  const L = merged.layout as unknown as Record<string, unknown>;
  const fix = (v: unknown, fallback: { desktop: number; tablet: number; mobile: number }) => {
    if (typeof v === 'number' && isFinite(v)) return { desktop: v, tablet: Math.min(v, fallback.tablet), mobile: Math.min(v, fallback.mobile) };
    return v;
  };
  L.pagePadding = fix(L.pagePadding, DEFAULT_CONFIG.layout.pagePadding);
  L.sectionSpacing = fix(L.sectionSpacing, DEFAULT_CONFIG.layout.sectionSpacing);
  return merged;
}

/* ---------------- local overrides (localStorage fallback / instant preview) ---------------- */

type Kind = 'products' | 'config';
const overrideKey = (k: Kind) => (k === 'products' ? KEYS.overrideProducts : KEYS.overrideConfig);

export function readOverride<T extends { updatedAt: string }>(k: Kind): T | null {
  return lsGet<T | null>(overrideKey(k), null);
}
export function writeOverride(k: Kind, data: ProductsFile | SiteConfig): boolean {
  return lsSet(overrideKey(k), data);
}

/** Use the local override only when it is newer than what the server delivered. */
function newest<T extends { updatedAt: string }>(remote: T, override: T | null): T {
  return override && override.updatedAt > remote.updatedAt ? override : remote;
}

/* ---------------- public loader ---------------- */

async function fetchJson(file: string): Promise<unknown> {
  // Cache-bust per minute so edits show up soon after the Pages deploy finishes
  const url = `${import.meta.env.BASE_URL}data/${file}?v=${Math.floor(Date.now() / 60000)}`;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
  return res.json();
}

export async function fetchSiteData(): Promise<{ products: ProductsFile; config: SiteConfig; error: string | null }> {
  let error: string | null = null;
  let products: ProductsFile = { updatedAt: SEED_DATE, products: [] };
  let config: SiteConfig = DEFAULT_CONFIG;

  const [p, c] = await Promise.allSettled([fetchJson('products.json'), fetchJson('site-config.json')]);
  if (p.status === 'fulfilled') products = normalizeProducts(p.value);
  else error = p.reason instanceof Error ? p.reason.message : 'Could not load products.';
  if (c.status === 'fulfilled') config = normalizeConfig(c.value);

  const po = readOverride<ProductsFile>('products');
  const co = readOverride<SiteConfig>('config');
  const pf = newest(products, po ? normalizeProducts(po) : null);
  const cf = newest(config, co ? normalizeConfig(co) : null);
  // A newer local copy means the site still works even if the static file failed to load
  return { products: pf, config: cf, error: pf !== products ? null : error };
}

/* ---------------- editor draft (never visible to visitors) ---------------- */

export function loadDraft(): SiteConfig | null {
  const raw = lsGet<unknown>(KEYS.draftConfig, null);
  return raw ? normalizeConfig(raw) : null;
}
export function saveDraft(c: SiteConfig): boolean {
  return lsSet(KEYS.draftConfig, c);
}
export function clearDraft() {
  lsSet(KEYS.draftConfig, null);
}
