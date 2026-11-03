import { KEYS, lsGet, lsSet } from './storage';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp';
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export interface LocalMedia {
  path: string; // "local/<name>"
  name: string;
  folder: 'products' | 'site';
  dataUrl: string;
  size: number;
  createdAt: string;
}

/* ---------- local (no-GitHub) media store, kept in memory + localStorage ---------- */
const localMap = new Map<string, string>();
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  lsGet<LocalMedia[]>(KEYS.media, []).forEach((m) => localMap.set(m.path, m.dataUrl));
}

export function listLocalMedia(): LocalMedia[] {
  return lsGet<LocalMedia[]>(KEYS.media, []);
}

export function saveLocalMedia(item: LocalMedia): boolean {
  const list = listLocalMedia().filter((m) => m.path !== item.path);
  list.unshift(item);
  const ok = lsSet(KEYS.media, list);
  if (ok) {
    hydrate();
    localMap.set(item.path, item.dataUrl);
  }
  return ok;
}

export function removeLocalMedia(path: string) {
  lsSet(KEYS.media, listLocalMedia().filter((m) => m.path !== path));
  localMap.delete(path);
}

/* ---------- path resolution ---------- */

/** Turns a stored image path into something an <img> can load. */
export function resolveImg(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  if (path.startsWith('local/')) {
    hydrate();
    return localMap.get(path) || '';
  }
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export const isRepoAsset = (path: string) => /^assets\//.test(path);

/* ---------- client-side image preparation ---------- */

export interface PreparedImage {
  blob: Blob;
  type: string;
  ext: string;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function loadBitmap(file: Blob): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => { ctx.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); } });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be read as an image.'));
    };
    img.src = url;
  });
}

/**
 * Validates and (when needed) downsizes an image.
 * - maxDim: longest edge in px
 * - quality: JPEG/WebP quality 0..1
 * - force: always re-encode (used for local mode, to stay inside localStorage limits)
 */
export async function prepareImage(file: File, opts: { maxDim: number; quality: number; force?: boolean }): Promise<PreparedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.name}: only JPEG, PNG and WebP images are supported.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);

  const bmp = await loadBitmap(file);
  const longest = Math.max(bmp.width, bmp.height);
  const needsResize = longest > opts.maxDim;
  const tooHeavy = file.size > 2.5 * 1024 * 1024;

  if (!opts.force && !needsResize && !tooHeavy) {
    return { blob: file, type: file.type, ext: EXT[file.type] };
  }

  const scale = needsResize ? opts.maxDim / longest : 1;
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  bmp.draw(ctx, w, h);

  // PNG stays PNG only if we are not forced/too heavy; otherwise WebP keeps files small.
  const outType = file.type === 'image/png' && !opts.force && !tooHeavy ? 'image/png' : file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), outType, opts.quality),
  );
  return { blob, type: outType, ext: EXT[outType] };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(blob);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(blob);
  });
}

export function safeFileBase(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return (
    base
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'image'
  );
}
