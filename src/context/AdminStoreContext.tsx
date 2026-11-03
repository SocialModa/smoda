/**
 * Admin data layer. One place that knows how to read and persist products, site config and images:
 *
 *   GitHub mode  – reads/writes public/data/*.json and public/assets/** in your repository through
 *                  the GitHub API. The commit triggers the Pages workflow, which redeploys the site.
 *   Local mode   – (no token configured) everything is stored in this browser's localStorage so you
 *                  can build and preview the whole site offline. Visitors on other devices do not see it.
 *
 * In both modes a local "override" copy is also written so the storefront in THIS browser reflects
 * changes immediately (GitHub Pages needs a minute or two to redeploy).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MediaItem, Product, ProductsFile, SiteConfig } from '@/types';
import { useSite } from './SiteContext';
import {
  PATH_CONFIG,
  PATH_PRODUCTS,
  fetchSiteData,
  normalizeConfig,
  normalizeProducts,
  readOverride,
  writeOverride,
} from '@/lib/data';
import { GitHubError, deleteFile, getFile, getGhConfig, listDir, putFile, subscribeGh, utf8ToBase64, type GhConfig } from '@/lib/github';
import { blobToBase64, blobToDataUrl, listLocalMedia, prepareImage, removeLocalMedia, safeFileBase, saveLocalMedia } from '@/lib/images';
import { KEYS, lsRemove } from '@/lib/storage';
import { nowIso } from '@/lib/utils';

export type Folder = 'products' | 'site';
const IMAGE_EXT = /\.(jpe?g|png|webp|svg|gif)$/i;
const STORAGE_FULL = 'Your browser storage is full. Connect GitHub (GitHub Integration) to store images in your repository, or delete unused local images.';

export interface AdminStore {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  source: 'github' | 'local';
  ghConfigured: boolean;
  ghError: string | null;
  repoLabel: string;
  /** Repository is reachable but the data file does not exist yet */
  repoMissing: { products: boolean; config: boolean };
  /** A local copy is newer than what is in the repository */
  localNewer: { products: boolean; config: boolean };
  products: Product[];
  config: SiteConfig;
  media: MediaItem[];
  mediaLoading: boolean;
  refresh: () => Promise<void>;
  saveProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  publishConfig: (c: SiteConfig) => Promise<SiteConfig>;
  replaceAll: (products: ProductsFile, config: SiteConfig) => Promise<void>;
  refreshMedia: () => Promise<void>;
  uploadImages: (files: File[], folder: Folder) => Promise<{ paths: string[]; errors: string[] }>;
  deleteMedia: (item: MediaItem) => Promise<void>;
  pushLocalToGitHub: () => Promise<void>;
  initRepository: () => Promise<void>;
  discardLocal: () => Promise<void>;
}

const Ctx = createContext<AdminStore | null>(null);

const pretty = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const site = useSite();
  const [status, setStatus] = useState<AdminStore['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'github' | 'local'>('local');
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghTick, setGhTick] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<SiteConfig>(() => normalizeConfig({}));
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [repoMissing, setRepoMissing] = useState({ products: false, config: false });
  const [localNewer, setLocalNewer] = useState({ products: false, config: false });

  const productsRef = useRef(products);
  const configRef = useRef(config);
  const sourceRef = useRef(source);
  productsRef.current = products;
  configRef.current = config;
  sourceRef.current = source;

  const gh = (): GhConfig | null => (sourceRef.current === 'github' ? getGhConfig() : null);

  /* ------------------------- load ------------------------- */
  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const siteData = await fetchSiteData();
      let nextProducts = siteData.products.products;
      let nextConfig = siteData.config;
      let nextSource: 'github' | 'local' = 'local';
      let nextGhError: string | null = null;
      let missing = { products: false, config: false };
      let newer = { products: false, config: false };

      const cfg = getGhConfig();
      if (cfg) {
        try {
          const [pf, cf] = await Promise.all([getFile(cfg, PATH_PRODUCTS), getFile(cfg, PATH_CONFIG)]);
          const remoteP = pf ? normalizeProducts(JSON.parse(pf.text)) : null;
          const remoteC = cf ? normalizeConfig(JSON.parse(cf.text)) : null;
          if (remoteP) nextProducts = remoteP.products;
          if (remoteC) nextConfig = remoteC;
          missing = { products: !pf, config: !cf };
          const po = readOverride<ProductsFile>('products');
          const co = readOverride<SiteConfig>('config');
          newer = {
            products: !!po && (!remoteP || po.updatedAt > remoteP.updatedAt),
            config: !!co && (!remoteC || co.updatedAt > remoteC.updatedAt),
          };
          nextSource = 'github';
        } catch (e) {
          nextGhError = msg(e);
        }
      }
      setProducts(nextProducts);
      setConfig(nextConfig);
      setSource(nextSource);
      sourceRef.current = nextSource;
      setGhError(nextGhError);
      setRepoMissing(missing);
      setLocalNewer(newer);
      setStatus('ready');
    } catch (e) {
      setError(msg(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, ghTick]);

  useEffect(() => subscribeGh(() => setGhTick((n) => n + 1)), []);

  /* ------------------------- products ------------------------- */
  const mutateProducts = useCallback(
    async (fn: (list: Product[]) => Product[], message: string) => {
      const cfg = gh();
      const now = nowIso();
      if (cfg) {
        // Apply the change on top of the *current* repo file so we never overwrite someone else's edit
        const cur = await getFile(cfg, PATH_PRODUCTS);
        const base = cur ? normalizeProducts(JSON.parse(cur.text)).products : productsRef.current;
        const next = fn(base);
        const file: ProductsFile = { updatedAt: now, products: next };
        await putFile(cfg, PATH_PRODUCTS, utf8ToBase64(pretty(file)), message, cur?.sha);
        writeOverride('products', file);
        setProducts(next);
      } else {
        const next = fn(productsRef.current);
        const file: ProductsFile = { updatedAt: now, products: next };
        if (!writeOverride('products', file)) throw new Error(STORAGE_FULL);
        setProducts(next);
      }
      await site.reload();
    },
    [site],
  );

  const saveProduct = useCallback(
    (p: Product) =>
      mutateProducts((list) => {
        const exists = list.some((x) => x.id === p.id);
        const saved = { ...p, updatedAt: nowIso() };
        return exists ? list.map((x) => (x.id === p.id ? saved : x)) : [saved, ...list];
      }, `Save product "${p.name}" via SocialModa admin`),
    [mutateProducts],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      const name = productsRef.current.find((p) => p.id === id)?.name || id;
      return mutateProducts((list) => list.filter((p) => p.id !== id), `Delete product "${name}" via SocialModa admin`);
    },
    [mutateProducts],
  );

  /* ------------------------- config ------------------------- */
  const publishConfig = useCallback(
    async (c: SiteConfig) => {
      const cfg = gh();
      const next: SiteConfig = {
        ...c,
        updatedAt: nowIso(),
        repo: cfg ? { owner: cfg.owner, name: cfg.repo, branch: cfg.branch } : c.repo,
      };
      if (cfg) {
        const cur = await getFile(cfg, PATH_CONFIG);
        await putFile(cfg, PATH_CONFIG, utf8ToBase64(pretty(next)), 'Update website configuration via SocialModa admin', cur?.sha);
        writeOverride('config', next);
      } else if (!writeOverride('config', next)) {
        throw new Error(STORAGE_FULL);
      }
      setConfig(next);
      await site.reload();
      return next;
    },
    [site],
  );

  const replaceAll = useCallback(
    async (pf: ProductsFile, cf: SiteConfig) => {
      const cleanP = normalizeProducts(pf).products;
      await mutateProducts(() => cleanP, 'Import products via SocialModa admin');
      await publishConfig(normalizeConfig(cf));
    },
    [mutateProducts, publishConfig],
  );

  /* ------------------------- media ------------------------- */
  const refreshMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const items: MediaItem[] = [];
      const seen = new Set<string>();
      const add = (m: MediaItem) => {
        if (!seen.has(m.path)) {
          seen.add(m.path);
          items.push(m);
        }
      };
      const cfg = gh();
      if (cfg) {
        for (const folder of ['products', 'site'] as Folder[]) {
          const files = await listDir(cfg, `public/assets/${folder}`);
          files
            .filter((f) => IMAGE_EXT.test(f.name))
            .forEach((f) => add({ path: `assets/${folder}/${f.name}`, name: f.name, folder, size: f.size, sha: f.sha, origin: 'github' }));
        }
      }
      listLocalMedia().forEach((m) => add({ path: m.path, name: m.name, folder: m.folder, size: m.size, origin: 'local' }));
      if (!cfg) {
        // Without GitHub we cannot list the repo folder, so show images the content already points at
        const refs = new Set<string>();
        productsRef.current.forEach((p) => p.images.forEach((i) => refs.add(i)));
        const c = configRef.current;
        [c.hero.image, c.brand.logo, c.brand.favicon, c.pages.about.image].forEach((i) => i && refs.add(i));
        refs.forEach((path) => {
          if (/^assets\//.test(path)) {
            const parts = path.split('/');
            add({ path, name: parts[parts.length - 1], folder: parts[1] === 'site' ? 'site' : 'products', origin: 'referenced' });
          }
        });
      }
      setMedia(items);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'ready') void refreshMedia().catch(() => undefined);
  }, [status, source, refreshMedia]);

  const uploadImages = useCallback(
    async (files: File[], folder: Folder) => {
      const cfg = gh();
      const paths: string[] = [];
      const errors: string[] = [];
      for (const f of files) {
        try {
          const prepared = await prepareImage(f, cfg ? { maxDim: 2400, quality: 0.86 } : { maxDim: 1400, quality: 0.8, force: true });
          const name = `${safeFileBase(f.name)}-${Date.now().toString(36)}.${prepared.ext}`;
          if (cfg) {
            await putFile(cfg, `public/assets/${folder}/${name}`, await blobToBase64(prepared.blob), `Upload ${folder} image ${name} via SocialModa admin`);
            paths.push(`assets/${folder}/${name}`);
          } else {
            const ok = saveLocalMedia({ path: `local/${name}`, name, folder, dataUrl: await blobToDataUrl(prepared.blob), size: prepared.blob.size, createdAt: nowIso() });
            if (!ok) throw new Error(STORAGE_FULL);
            paths.push(`local/${name}`);
          }
        } catch (e) {
          errors.push(e instanceof GitHubError || e instanceof Error ? e.message : String(e));
        }
      }
      await refreshMedia().catch(() => undefined);
      return { paths, errors };
    },
    [refreshMedia],
  );

  const deleteMedia = useCallback(
    async (item: MediaItem) => {
      if (item.origin === 'github') {
        const cfg = gh();
        if (!cfg || !item.sha) throw new Error('Connect GitHub to delete repository images.');
        await deleteFile(cfg, `public/${item.path}`, item.sha, `Delete image ${item.name} via SocialModa admin`);
      } else if (item.origin === 'local') {
        removeLocalMedia(item.path);
      } else {
        throw new Error('This image lives in the repository. Connect GitHub to delete it.');
      }
      await refreshMedia();
    },
    [refreshMedia],
  );

  /* ------------------------- GitHub sync helpers ------------------------- */
  const writeRepoFile = async (cfg: GhConfig, path: string, data: ProductsFile | SiteConfig, message: string) => {
    const cur = await getFile(cfg, path);
    await putFile(cfg, path, utf8ToBase64(pretty(data)), message, cur?.sha);
  };

  const pushLocalToGitHub = useCallback(async () => {
    const cfg = gh();
    if (!cfg) throw new Error('Connect GitHub first.');
    const po = readOverride<ProductsFile>('products');
    const co = readOverride<SiteConfig>('config');
    if (po) await writeRepoFile(cfg, PATH_PRODUCTS, po, 'Push local product changes via SocialModa admin');
    if (co) await writeRepoFile(cfg, PATH_CONFIG, { ...co, repo: { owner: cfg.owner, name: cfg.repo, branch: cfg.branch } }, 'Push local website configuration via SocialModa admin');
    await refresh();
  }, [refresh]);

  /** Creates products.json / site-config.json in the repository from what is currently loaded. */
  const initRepository = useCallback(async () => {
    const cfg = gh();
    if (!cfg) throw new Error('Connect GitHub first.');
    const now = nowIso();
    if (repoMissing.products) await writeRepoFile(cfg, PATH_PRODUCTS, { updatedAt: now, products: productsRef.current }, 'Initialise products.json via SocialModa admin');
    if (repoMissing.config) await writeRepoFile(cfg, PATH_CONFIG, { ...configRef.current, updatedAt: now, repo: { owner: cfg.owner, name: cfg.repo, branch: cfg.branch } }, 'Initialise site-config.json via SocialModa admin');
    await refresh();
  }, [refresh, repoMissing]);

  const discardLocal = useCallback(async () => {
    lsRemove(KEYS.overrideProducts);
    lsRemove(KEYS.overrideConfig);
    await site.reload();
    await refresh();
  }, [site, refresh]);

  const ghCfg = getGhConfig();
  const value = useMemo<AdminStore>(
    () => ({
      status,
      error,
      source,
      ghConfigured: !!ghCfg,
      ghError,
      repoLabel: ghCfg ? `${ghCfg.owner}/${ghCfg.repo}@${ghCfg.branch}` : '',
      repoMissing,
      localNewer,
      products,
      config,
      media,
      mediaLoading,
      refresh,
      saveProduct,
      deleteProduct,
      publishConfig,
      replaceAll,
      refreshMedia,
      uploadImages,
      deleteMedia,
      pushLocalToGitHub,
      initRepository,
      discardLocal,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, error, source, ghError, ghTick, repoMissing, localNewer, products, config, media, mediaLoading, refresh, saveProduct, deleteProduct, publishConfig, replaceAll, refreshMedia, uploadImages, deleteMedia, pushLocalToGitHub, initRepository, discardLocal],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminStore(): AdminStore {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdminStore must be used inside <AdminStoreProvider>');
  return c;
}
