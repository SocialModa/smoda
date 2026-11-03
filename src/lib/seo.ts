import { useEffect } from 'react';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Sets the document title and meta description for the current page. */
export function useSeo(title: string, description?: string, image?: string) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }
    if (title) setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);
  }, [title, description, image]);
}

/** Injects/updates a JSON-LD script (used for product pages). Pass null to remove. */
export function useJsonLd(id: string, data: Record<string, unknown> | null) {
  useEffect(() => {
    const existing = document.getElementById(id);
    if (!data) {
      existing?.remove();
      return;
    }
    const el = existing || Object.assign(document.createElement('script'), { id, type: 'application/ld+json' });
    el.textContent = JSON.stringify(data);
    if (!existing) document.head.appendChild(el);
    return () => el.remove();
  }, [id, data]);
}
