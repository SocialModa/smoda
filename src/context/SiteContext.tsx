import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Product, SiteConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/data/defaultConfig';
import { fetchSiteData, normalizeConfig, normalizeProducts } from '@/lib/data';

export interface SiteValue {
  config: SiteConfig;
  /** Every product, including drafts (admin only should look at this) */
  allProducts: Product[];
  /** Products visitors may see */
  products: Product[];
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  reload: () => Promise<void>;
  /** True inside the Web Editor's live-preview iframe */
  isPreview: boolean;
}

export const SiteContext = createContext<SiteValue | null>(null);

/** The Web Editor loads the storefront in an iframe named "sm-preview" and streams its draft config to it. */
export const PREVIEW_FRAME_NAME = 'sm-preview';
const isPreviewFrame = () => typeof window !== 'undefined' && window.name === PREVIEW_FRAME_NAME && window.parent !== window;

/** Public provider: loads data/*.json from the deployed site (plus the local override if it is newer). */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [all, setAll] = useState<Product[]>([]);
  const [status, setStatus] = useState<SiteValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const previewLocked = useRef(false);
  const isPreview = useMemo(isPreviewFrame, []);

  const reload = useCallback(async () => {
    try {
      const d = await fetchSiteData();
      if (previewLocked.current) return; // the editor is driving this frame
      setConfig(d.config);
      setAll(d.products.products);
      setError(d.error);
      setStatus(d.error ? 'error' : 'ready');
    } catch (e) {
      if (previewLocked.current) return;
      setError(e instanceof Error ? e.message : 'Could not load the site data.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Live preview: receive the editor's unsaved config over postMessage (same origin only)
  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; config?: unknown; products?: unknown } | null;
      if (d?.type !== 'sm-config' || !d.config) return;
      previewLocked.current = true;
      setConfig(normalizeConfig(d.config));
      if (d.products) setAll(normalizeProducts({ products: d.products }).products);
      setError(null);
      setStatus('ready');
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'sm-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [isPreview]);

  const value = useMemo<SiteValue>(
    () => ({ config, allProducts: all, products: all.filter((p) => p.status === 'published'), status, error, reload, isPreview }),
    [config, all, status, error, reload, isPreview],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteValue {
  const c = useContext(SiteContext);
  if (!c) throw new Error('useSite must be used inside a site provider');
  return c;
}
