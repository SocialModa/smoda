import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product, SiteConfig } from '@/types';
import { PREVIEW_FRAME_NAME } from '@/context/SiteContext';

export type Device = 'desktop' | 'tablet' | 'mobile';
/** Virtual viewport widths: they sit on either side of the storefront's 1024px / 640px breakpoints. */
export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 };

interface Props {
  config: SiteConfig;
  products: Product[];
  device: Device;
  path: string;
  onEdit?: (path: string) => void;
}

/**
 * Live preview: the real storefront runs inside a same-origin iframe, so media queries, fonts and
 * components behave exactly as they will for visitors. The editor streams the unsaved config to it.
 */
export default function PreviewFrame({ config, products, device, path, onEdit }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const src = useMemo(() => new URL(import.meta.env.BASE_URL, window.location.origin).href, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; path?: string } | null;
      if (d?.type === 'sm-preview-ready') setReady(true);
      if (d?.type === 'sm-edit' && typeof d.path === 'string') onEdit?.(d.path);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onEdit]);

  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => frame.current?.contentWindow?.postMessage({ type: 'sm-config', config, products }, window.location.origin));
    return () => cancelAnimationFrame(id);
  }, [ready, config, products]);

  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: 'sm-navigate', to: path }, window.location.origin);
  }, [ready, path]);

  const vw = DEVICE_WIDTH[device];
  const availW = Math.max(200, size.w - 32);
  const availH = Math.max(200, size.h - 32);
  const scale = Math.min(1, availW / vw);

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden">
      <div className="absolute left-1/2 top-4 -translate-x-1/2 overflow-hidden bg-white shadow-2xl ring-1 ring-black/10" style={{ width: vw * scale, height: availH, borderRadius: device === 'desktop' ? 8 : 22 }}>
        <iframe
          ref={frame}
          name={PREVIEW_FRAME_NAME}
          src={src}
          title={`Live preview (${device})`}
          className="block border-0 bg-white"
          style={{ width: vw, height: availH / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      </div>
      {!ready && <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-stone-500">Loading preview…</p>}
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        {device} · {vw}px{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ''}
      </span>
    </div>
  );
}
