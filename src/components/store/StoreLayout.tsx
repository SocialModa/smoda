import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSite } from '@/context/SiteContext';
import { buildThemeCss } from '@/lib/theme';
import { googleFontsUrl } from '@/lib/fonts';
import { resolveImg } from '@/lib/images';
import { FullPageSpinner } from '@/components/Spinner';
import Header from './Header';
import Footer from './Footer';

/** Keeps the Google Fonts <link> in sync with the fonts chosen in the Web Editor. */
function useFonts(heading: string, body: string) {
  useEffect(() => {
    const url = googleFontsUrl([heading, body]);
    let link = document.getElementById('sm-default-fonts') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'sm-default-fonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== url) link.setAttribute('href', url);
  }, [heading, body]);
}

function useFavicon(favicon: string) {
  useEffect(() => {
    const href = resolveImg(favicon);
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.removeAttribute('type');
    link.href = href;
  }, [favicon]);
}

export default function StoreLayout() {
  const { config, status, isPreview } = useSite();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const css = useMemo(() => buildThemeCss(config), [config]);

  useFonts(config.brand.fonts.heading, config.brand.fonts.body);
  useFavicon(config.brand.favicon);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  // Web Editor can ask the preview frame to open another page
  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; to?: string } | null;
      if (d?.type === 'sm-navigate' && typeof d.to === 'string' && d.to.startsWith('/')) navigate(d.to);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isPreview, navigate]);

  // In the editor preview, clicking any editable text or image asks the editor to open its control
  useEffect(() => {
    if (!isPreview) return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-edit]');
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: 'sm-edit', path: el.dataset.edit }, window.location.origin);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isPreview]);

  return (
    <div className="sm-store">
      <style>{css}</style>
      {isPreview && (
        <style>{`[data-edit]{cursor:pointer}[data-edit]:hover{outline:2px dashed #b45309;outline-offset:4px}`}</style>
      )}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {status === 'loading' ? (
          <FullPageSpinner label="Loading collection" />
        ) : (
          // Keyed by path so every navigation replays the fade-in
          <div key={pathname} className="animate-fade-in">
            <Outlet />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
