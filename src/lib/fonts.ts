export interface FontOption {
  name: string;
  kind: 'serif' | 'sans';
  /** Google Fonts weight spec (undefined = family has a single weight) */
  weights?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { name: 'Cormorant Garamond', kind: 'serif', weights: '400;500;600;700' },
  { name: 'Playfair Display', kind: 'serif', weights: '400;500;600;700' },
  { name: 'Bodoni Moda', kind: 'serif', weights: '400;500;600;700' },
  { name: 'Cinzel', kind: 'serif', weights: '400;500;600;700' },
  { name: 'Libre Baskerville', kind: 'serif', weights: '400;700' },
  { name: 'Lora', kind: 'serif', weights: '400;500;600;700' },
  { name: 'Marcellus', kind: 'serif' },
  { name: 'Jost', kind: 'sans', weights: '300;400;500;600' },
  { name: 'Inter', kind: 'sans', weights: '300;400;500;600' },
  { name: 'DM Sans', kind: 'sans', weights: '300;400;500;600' },
  { name: 'Montserrat', kind: 'sans', weights: '300;400;500;600' },
  { name: 'Manrope', kind: 'sans', weights: '300;400;500;600' },
];

export function fontStack(name: string): string {
  const f = FONT_OPTIONS.find((o) => o.name === name);
  const fallback = f?.kind === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, "Segoe UI", sans-serif';
  return `"${name}", ${fallback}`;
}

export function googleFontsUrl(names: string[]): string {
  const uniq = Array.from(new Set(names));
  const families = uniq
    .map((n) => {
      const f = FONT_OPTIONS.find((o) => o.name === n);
      const fam = n.replace(/ /g, '+');
      return f?.weights ? `family=${fam}:wght@${f.weights}` : `family=${fam}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
