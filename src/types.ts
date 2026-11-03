export type ProductStatus = 'published' | 'draft';

export interface ProductSpec { label: string; value: string }
export interface ProductColor { name: string; hex: string }

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  shortDescription: string;
  description: string;
  specs: ProductSpec[];
  sizes: string[];
  colors: ProductColor[];
  /** Image paths. Relative ("assets/products/x.jpg"), absolute (https://...) or "local/..." (local-mode uploads). */
  images: string[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsFile { updatedAt: string; products: Product[] }

export interface NavItem { id: string; label: string; href: string }
export interface SocialLink { id: string; platform: string; url: string }
export interface Highlight { id: string; title: string; text: string }
export interface Responsive<T = number> { desktop: T; tablet: T; mobile: T }

export type CardStyle = 'floating' | 'flat' | 'outlined' | 'minimal';
export type HoverEffect = 'lift' | 'zoom' | 'lift-zoom' | 'none';
export type AspectRatio = '3/4' | '4/5' | '1/1' | '2/3';

export interface SiteConfig {
  schemaVersion: 1;
  updatedAt: string;
  /** Non-secret hint so the storefront can fall back to raw.githubusercontent.com before a deploy finishes. */
  repo?: { owner: string; name: string; branch: string };
  brand: {
    name: string;
    logo: string;
    logoHeight: number;
    showNameWithLogo: boolean;
    pageTitle: string;
    metaDescription: string;
    favicon: string;
    currency: string;
    colors: { primary: string; secondary: string; background: string; surface: string; text: string };
    fonts: { heading: string; body: string };
    typography: { headingWeight: number; headingTracking: number; uppercaseHeadings: boolean };
  };
  header: {
    logoPosition: 'left' | 'center';
    nav: NavItem[];
    background: string;
    text: string;
    height: number;
    sticky: boolean;
  };
  hero: {
    image: string;
    eyebrow: string;
    headline: string;
    subtitle: string;
    ctaText: string;
    ctaHref: string;
    align: 'left' | 'center' | 'right';
    height: Responsive;
    headlineSize: Responsive;
    overlayColor: string;
    overlayOpacity: number;
    headlineColor: string;
    subtitleColor: string;
  };
  products: {
    title: string;
    subtitle: string;
    viewAllText: string;
    limit: number;
    columns: Responsive;
    cardStyle: CardStyle;
    cardBackground: string;
    radius: number;
    shadow: number;
    aspectRatio: AspectRatio;
    imageFit: 'cover' | 'contain';
    /** Space (px) between the card edge and the picture; 0 = picture fills the frame */
    imagePadding: number;
    hover: HoverEffect;
    showDescription: boolean;
    priceSize: number;
    priceWeight: number;
    priceFont: 'heading' | 'body';
  };
  footer: {
    about: string;
    background: string;
    text: string;
    copyright: string;
    social: SocialLink[];
  };
  contact: { email: string; phone: string; address: string; hours: string; formEndpoint: string };
  pages: {
    home: { storyButton: string };
    shop: { title: string; intro: string };
    about: { title: string; intro: string; body: string; image: string; highlights: Highlight[]; ctaTitle: string; ctaButton: string };
    contact: { title: string; intro: string };
    product: { enquireButton: string; backLink: string; relatedTitle: string };
  };
  layout: {
    maxWidth: number;
    pagePadding: Responsive;
    sectionSpacing: Responsive;
    radius: number;
    baseFontSize: number;
    button: { style: 'solid' | 'outline'; shape: 'square' | 'rounded' | 'pill'; uppercase: boolean };
  };
}

export interface MediaItem {
  /** Path used inside products/config, e.g. "assets/products/x.jpg" or "local/x.jpg" */
  path: string;
  name: string;
  folder: 'products' | 'site';
  size?: number;
  sha?: string;
  origin: 'github' | 'local' | 'referenced';
}
