import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Monitor, Redo2, RotateCcw, Rocket, Save, Smartphone, Tablet, Undo2, Undo } from 'lucide-react';
import { useAdminStore } from '@/context/AdminStoreContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_CONFIG } from '@/data/defaultConfig';
import { clearDraft, loadDraft, saveDraft } from '@/lib/data';
import { SOCIAL_PLATFORMS } from '@/components/store/SocialIcon';
import { cn, setIn } from '@/lib/utils';
import type { SiteConfig } from '@/types';
import { Btn, errMsg, savedMessage } from '../ui';
import PreviewFrame, { type Device } from './PreviewFrame';
import { useHistory } from './useHistory';
import {
  ColorControl,
  EditorProvider,
  FontControl,
  Group,
  ImageControl,
  ListControl,
  NumberSelectControl,
  RangeControl,
  ResponsiveRange,
  Section,
  SelectControl,
  TextControl,
  ToggleControl,
  newId,
} from './controls';

/** Fingerprint without bookkeeping fields, to tell whether anything really changed. */
const sig = (c: SiteConfig) => JSON.stringify({ ...c, updatedAt: '', repo: undefined });

const DEVICES: { id: Device; label: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

export default function SiteEditor() {
  const store = useAdminStore();
  const toast = useToast();
  const confirm = useConfirm();

  const restored = useMemo(() => loadDraft(), []);
  const hist = useHistory<SiteConfig>(restored ?? store.config);
  const config = hist.value;

  const [device, setDevice] = useState<Device>('desktop');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [path, setPath] = useState('/');
  const [savedSig, setSavedSig] = useState(() => sig(restored ?? store.config));
  const [publishing, setPublishing] = useState(false);

  const unsaved = sig(config) !== savedSig;
  const unpublished = sig(config) !== sig(store.config);
  const published = useMemo(() => store.products.filter((p) => p.status === 'published'), [store.products]);

  useEffect(() => {
    if (restored) toast.info('Restored your saved draft. It is not live until you publish.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving with edits that were neither saved as a draft nor published
  useEffect(() => {
    if (!unsaved) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [unsaved]);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (not while typing in a field, which has its own undo)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) hist.redo();
        else hist.undo();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [hist]);

  const set = useCallback((p: string, v: unknown) => hist.set((c) => setIn(c, p, v), p), [hist]);
  const [focus, setFocus] = useState<{ path: string; n: number } | null>(null);
  const ctx = useMemo(() => ({ config, device, set, focus }), [config, device, set, focus]);

  // Clicked something in the preview: open its section, scroll to the field and focus it
  const onPreviewEdit = useCallback((p: string) => {
    setTab('edit');
    setFocus({ path: p, n: Date.now() });
  }, []);
  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-edit-path]'));
      const el = els.find((x) => x.dataset.editPath === focus.path);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.querySelector<HTMLElement>('textarea, input, button')?.focus({ preventScroll: true });
      el.classList.add('ring-2', 'ring-amber-500', 'rounded-lg');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500', 'rounded-lg'), 1800);
    }, 80);
    return () => window.clearTimeout(t);
  }, [focus]);

  const doSaveDraft = () => {
    if (!saveDraft(config)) return toast.error('Could not save the draft: browser storage is full or disabled.');
    setSavedSig(sig(config));
    toast.success('Draft saved in this browser. Visitors do not see it until you publish.');
  };

  const doPublish = async () => {
    setPublishing(true);
    try {
      const next = await store.publishConfig(config);
      clearDraft();
      hist.reset(next);
      setSavedSig(sig(next));
      toast.success(savedMessage(store.source, 'Website design'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPublishing(false);
    }
  };

  const doReset = async () => {
    const ok = await confirm({
      title: 'Reset the design to default?',
      message: 'All colours, fonts, text and layout settings return to the SocialModa defaults. Nothing goes live until you publish, and you can undo this step.',
      confirmText: 'Reset to default',
      danger: true,
    });
    if (!ok) return;
    hist.set({ ...DEFAULT_CONFIG, repo: config.repo }, 'reset');
    toast.info('Reset to defaults. Publish to apply them to the live site.');
  };

  const doRevert = async () => {
    if (unpublished) {
      const ok = await confirm({ title: 'Discard all unpublished changes?', message: 'The editor goes back to what is currently published.', confirmText: 'Discard changes', danger: true });
      if (!ok) return;
    }
    clearDraft();
    hist.reset(store.config);
    setSavedSig(sig(store.config));
    toast.info('Back to the published version.');
  };

  const pages = [
    { value: '/', label: 'Home' },
    { value: '/shop', label: 'Shop' },
    { value: '/about', label: 'About Us' },
    { value: '/contact', label: 'Contact' },
    ...published.slice(0, 4).map((p) => ({ value: `/product/${p.slug}`, label: `Product: ${p.name}` })),
  ];

  const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition hover:bg-stone-100 disabled:opacity-35 disabled:hover:bg-transparent';

  return (
    <EditorProvider value={ctx}>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-stone-200 bg-white px-3 py-2">
          <div className="flex items-center">
            <button className={iconBtn} onClick={hist.undo} disabled={!hist.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
            <button className={iconBtn} onClick={hist.redo} disabled={!hist.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
          </div>

          <div className="flex gap-0.5 rounded-lg bg-stone-100 p-0.5" role="group" aria-label="Preview device">
            {DEVICES.map((d) => (
              <button key={d.id} onClick={() => setDevice(d.id)} aria-pressed={device === d.id} title={`${d.label} preview`} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', device === d.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900')}>
                <d.icon size={15} /> <span className="hidden sm:inline">{d.label}</span>
              </button>
            ))}
          </div>

          <label className="hidden items-center gap-2 text-xs text-stone-600 md:flex">
            <Eye size={15} />
            <span className="sr-only">Preview page</span>
            <select value={path} onChange={(e) => setPath(e.target.value)} className="max-w-[12rem] rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs">
              {pages.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <div className="flex gap-0.5 rounded-lg bg-stone-100 p-0.5 lg:hidden" role="group" aria-label="Editor view">
            {(['edit', 'preview'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={cn('rounded-md px-3 py-1.5 text-xs font-medium capitalize', tab === t ? 'bg-white shadow-sm' : 'text-stone-600')}>{t}</button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={cn('hidden text-xs font-medium xl:inline', unpublished ? 'text-amber-700' : 'text-emerald-700')} aria-live="polite">
              {unpublished ? (unsaved ? 'Unsaved changes' : 'Draft saved, not published') : 'Matches the live site'}
            </span>
            <button className={iconBtn} onClick={() => void doReset()} aria-label="Reset to default" title="Reset to default"><RotateCcw size={17} /></button>
            <button className={iconBtn} onClick={() => void doRevert()} aria-label="Discard changes and go back to the published version" title="Discard changes (back to published)"><Undo size={17} /></button>
            <Btn size="sm" onClick={doSaveDraft} disabled={!unsaved}><Save size={14} /> Save draft</Btn>
            <Btn size="sm" variant="accent" onClick={() => void doPublish()} loading={publishing} disabled={!unpublished}><Rocket size={14} /> Publish</Btn>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Controls */}
          <div className={cn('thin-scroll w-full shrink-0 overflow-y-auto border-r border-stone-200 bg-white lg:block lg:w-[380px]', tab === 'edit' ? 'block' : 'hidden')}>
            <Section title="Branding" defaultOpen match={['brand.name', 'brand.logo', 'brand.show', 'brand.pageTitle', 'brand.meta', 'brand.favicon', 'brand.currency']}>
              <TextControl path="brand.name" label="Website name" />
              <ImageControl path="brand.logo" label="Logo" hint="Leave empty to show the website name as text." />
              <RangeControl path="brand.logoHeight" label="Logo height" min={16} max={80} unit="px" />
              <ToggleControl path="brand.showNameWithLogo" label="Show name next to the logo" />
              <TextControl path="brand.pageTitle" label="Browser page title" hint="Shown in the browser tab and search results." />
              <TextControl path="brand.metaDescription" label="Search description" multiline rows={3} />
              <ImageControl path="brand.favicon" label="Favicon" hint="Small square icon in the browser tab." />
              <SelectControl path="brand.currency" label="Currency" options={['USD', 'EUR', 'GBP', 'TRY', 'CAD', 'AUD', 'CHF', 'AED'].map((c) => ({ value: c, label: c }))} />
            </Section>

            <Section title="Colours and typography" match={['brand.colors', 'brand.fonts', 'brand.typography']}>
              <Group title="Brand colours">
                <ColorControl path="brand.colors.primary" label="Main dark colour (buttons, dark sections)" />
                <ColorControl path="brand.colors.secondary" label="Accent colour (bronze highlights, sale badge)" />
                <ColorControl path="brand.colors.background" label="Page background" />
                <ColorControl path="brand.colors.surface" label="Alternate section background" />
                <ColorControl path="brand.colors.text" label="Text colour" />
              </Group>
              <Group title="Fonts">
                <FontControl path="brand.fonts.heading" label="Heading font" />
                <FontControl path="brand.fonts.body" label="Body font" />
                <NumberSelectControl path="brand.typography.headingWeight" label="Heading weight" options={[{ value: 400, label: 'Regular (400)' }, { value: 500, label: 'Medium (500)' }, { value: 600, label: 'Semibold (600)' }, { value: 700, label: 'Bold (700)' }]} />
                <RangeControl path="brand.typography.headingTracking" label="Heading letter spacing" min={-4} max={20} unit="%" />
                <ToggleControl path="brand.typography.uppercaseHeadings" label="Uppercase headings" />
              </Group>
            </Section>

            <Section title="Header" match={['header.']}>
              <SelectControl path="header.logoPosition" label="Logo position" options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }]} />
              <ColorControl path="header.background" label="Background colour" />
              <ColorControl path="header.text" label="Text colour" />
              <RangeControl path="header.height" label="Header height" min={56} max={120} unit="px" />
              <ToggleControl path="header.sticky" label="Sticky header" hint="Stays visible while scrolling." />
              <ListControl
                path="header.nav"
                label="Navigation"
                addLabel="Add link"
                makeItem={() => ({ id: newId('nav'), label: 'New link', href: '/' })}
                itemTitle={(it) => it.label || 'Link'}
                fields={[
                  { key: 'label', label: 'Label' },
                  { key: 'href', label: 'Link', placeholder: '/shop, #collection or https://…' },
                ]}
              />
            </Section>

            <Section title="Hero section" match={['hero.']}>
              <ImageControl path="hero.image" label="Background image" optional={false} hint="Use a large landscape photo (at least 1600px wide)." />
              <TextControl path="hero.eyebrow" label="Small text above headline" />
              <TextControl path="hero.headline" label="Headline" multiline rows={2} />
              <TextControl path="hero.subtitle" label="Subtitle" multiline rows={3} />
              <TextControl path="hero.ctaText" label="Button text" hint="Leave empty to hide the button." />
              <TextControl path="hero.ctaHref" label="Button destination" placeholder="/shop" hint="A page (/shop), a section (#collection) or a full URL." />
              <SelectControl path="hero.align" label="Text alignment" options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }]} />
              <ResponsiveRange path="hero.height" label="Section height" min={40} max={100} unit="vh" hint="Percent of the screen height. Switch device in the toolbar to set each one." />
              <ResponsiveRange path="hero.headlineSize" label="Headline size" min={28} max={140} unit="px" hint="Set separately for desktop, tablet and mobile." />
              <ColorControl path="hero.overlayColor" label="Overlay colour" />
              <RangeControl path="hero.overlayOpacity" label="Overlay opacity" min={0} max={90} unit="%" />
              <ColorControl path="hero.headlineColor" label="Headline colour" />
              <ColorControl path="hero.subtitleColor" label="Subtitle colour" />
            </Section>

            <Section title="Product section" match={['products.']}>
              <TextControl path="products.title" label="Section title" />
              <TextControl path="products.subtitle" label="Section subtitle" multiline rows={2} />
              <TextControl path="products.viewAllText" label="“View all” button text" />
              <RangeControl path="products.limit" label="Products on the home page" min={2} max={24} />
              <ResponsiveRange path="products.columns" label="Columns" min={1} max={5} hint="Switch device in the toolbar to set each one." />
              <SelectControl path="products.cardStyle" label="Card style" options={[{ value: 'floating', label: 'Floating (shadow)' }, { value: 'flat', label: 'Flat' }, { value: 'outlined', label: 'Outlined' }, { value: 'minimal', label: 'Minimal (no box)' }]} />
              <RangeControl path="products.imagePadding" label="Space around the picture" min={0} max={40} unit="px" hint="0 = picture fills the card. Raise it to show the jacket inside a frame." />
              <ColorControl path="products.cardBackground" label="Card background" />
              <RangeControl path="products.radius" label="Corner radius" min={0} max={40} unit="px" />
              <RangeControl path="products.shadow" label="Shadow intensity" min={0} max={100} hint="Only for the Floating style." />
              <SelectControl path="products.aspectRatio" label="Image aspect ratio" options={[{ value: '4/5', label: 'Portrait 4:5' }, { value: '3/4', label: 'Portrait 3:4' }, { value: '2/3', label: 'Tall 2:3' }, { value: '1/1', label: 'Square 1:1' }]} />
              <SelectControl path="products.imageFit" label="Image size" options={[{ value: 'cover', label: 'Fill the frame (crop)' }, { value: 'contain', label: 'Fit inside (no crop)' }]} />
              <SelectControl path="products.hover" label="Hover animation" options={[{ value: 'lift-zoom', label: 'Lift and zoom' }, { value: 'lift', label: 'Lift' }, { value: 'zoom', label: 'Zoom image' }, { value: 'none', label: 'None' }]} />
              <ToggleControl path="products.showDescription" label="Show short description" />
              <Group title="Price typography">
                <RangeControl path="products.priceSize" label="Size" min={12} max={32} unit="px" />
                <NumberSelectControl path="products.priceWeight" label="Weight" options={[{ value: 300, label: 'Light (300)' }, { value: 400, label: 'Regular (400)' }, { value: 500, label: 'Medium (500)' }, { value: 600, label: 'Semibold (600)' }, { value: 700, label: 'Bold (700)' }]} />
                <SelectControl path="products.priceFont" label="Font" options={[{ value: 'body', label: 'Body font' }, { value: 'heading', label: 'Heading font' }]} />
              </Group>
            </Section>

            <Section title="Page texts (Home, Shop, Product)" match={['pages.home', 'pages.shop', 'pages.product']}>
              <Group title="Home page">
                <p className="text-[11px] text-stone-500">The headline, subtitle and button are in “Hero section”; the jackets heading is in “Product section”; the story block uses the About texts below.</p>
                <TextControl path="pages.home.storyButton" label="Story button text" />
              </Group>
              <Group title="Shop page">
                <TextControl path="pages.shop.title" label="Page title" />
                <TextControl path="pages.shop.intro" label="Introduction" multiline rows={2} />
              </Group>
              <Group title="Product pages">
                <TextControl path="pages.product.enquireButton" label="Enquiry button text" />
                <TextControl path="pages.product.backLink" label="Back link text" />
                <TextControl path="pages.product.relatedTitle" label="Related products heading" />
              </Group>
            </Section>

            <Section title="About and Contact pages" match={['pages.about', 'pages.contact']}>
              <TextControl path="pages.about.title" label="About page title" />
              <TextControl path="pages.about.intro" label="About introduction" multiline rows={3} />
              <TextControl path="pages.about.ctaTitle" label="Closing heading" />
              <TextControl path="pages.about.ctaButton" label="Closing button text" />
              <TextControl path="pages.about.body" label="About text" multiline rows={8} hint="Leave a blank line between paragraphs." />
              <ImageControl path="pages.about.image" label="About image" />
              <ListControl
                path="pages.about.highlights"
                label="Highlights"
                addLabel="Add highlight"
                makeItem={() => ({ id: newId('hl'), title: 'New highlight', text: '' })}
                itemTitle={(it) => it.title || 'Highlight'}
                fields={[{ key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea' }]}
              />
              <TextControl path="pages.contact.title" label="Contact page title" />
              <TextControl path="pages.contact.intro" label="Contact introduction" multiline rows={3} />
            </Section>

            <Section title="Footer and contact details" match={['footer.', 'contact.']}>
              <TextControl path="footer.about" label="Footer text" multiline rows={3} />
              <Group title="Contact details">
                <TextControl path="contact.email" label="Email" hint="Messages from the contact form are sent here." />
                <TextControl path="contact.phone" label="Phone" />
                <TextControl path="contact.address" label="Address" multiline rows={2} />
                <TextControl path="contact.hours" label="Opening hours" />
                <TextControl path="contact.formEndpoint" label="Contact form service address (optional)" placeholder="https://formspree.io/f/xxxxxxxx" hint="Paste a Formspree (or similar) address to deliver messages straight to your inbox. Leave empty to open the visitor's email app instead." />
              </Group>
              <ListControl
                path="footer.social"
                label="Social media links"
                addLabel="Add social link"
                makeItem={() => ({ id: newId('soc'), platform: 'instagram', url: 'https://' })}
                itemTitle={(it) => SOCIAL_PLATFORMS.find((p) => p.value === it.platform)?.label || it.platform}
                fields={[
                  { key: 'platform', label: 'Network', type: 'select', options: SOCIAL_PLATFORMS.map((p) => ({ value: p.value, label: p.label })) },
                  { key: 'url', label: 'Address (URL)', placeholder: 'https://instagram.com/…' },
                ]}
              />
              <ColorControl path="footer.background" label="Background colour" />
              <ColorControl path="footer.text" label="Text colour" />
              <TextControl path="footer.copyright" label="Copyright line" hint="{year} becomes the current year." />
            </Section>

            <Section title="Layout and buttons" match={['layout.']}>
              <RangeControl path="layout.maxWidth" label="Maximum content width" min={960} max={1680} step={20} unit="px" />
              <ResponsiveRange path="layout.pagePadding" label="Page side spacing" min={12} max={80} unit="px" hint="Set separately for each device." />
              <ResponsiveRange path="layout.sectionSpacing" label="Section spacing" min={24} max={200} unit="px" hint="Set separately for each device." />
              <RangeControl path="layout.radius" label="Global corner radius" min={0} max={32} unit="px" />
              <RangeControl path="layout.baseFontSize" label="Global font size" min={14} max={20} unit="px" />
              <Group title="Buttons">
                <SelectControl path="layout.button.style" label="Style" options={[{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }]} />
                <SelectControl path="layout.button.shape" label="Shape" options={[{ value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }]} />
                <ToggleControl path="layout.button.uppercase" label="Uppercase text" />
              </Group>
            </Section>

            <p className="p-4 text-xs leading-relaxed text-stone-500">
              Changes appear in the preview instantly. <strong>Save draft</strong> keeps them privately in this browser; <strong>Publish</strong> makes them live for every visitor.
            </p>
          </div>

          {/* Live preview */}
          <div className={cn('min-w-0 flex-1 bg-stone-300 lg:block', tab === 'preview' ? 'block' : 'hidden')}>
            <PreviewFrame config={config} products={published} device={device} path={path} onEdit={onPreviewEdit} />
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
