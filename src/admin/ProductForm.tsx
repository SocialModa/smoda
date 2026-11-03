import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FolderOpen, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useAdminStore } from '@/context/AdminStoreContext';
import { useToast } from '@/context/ToastContext';
import { ACCEPTED_TYPES, ACCEPT_ATTR, MAX_UPLOAD_BYTES } from '@/lib/images';
import { cn, isValidHex, nowIso, slugify, uid } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import type { Product, ProductColor, ProductSpec, ProductStatus } from '@/types';
import MediaPicker from './MediaPicker';
import { AdminEmpty, Btn, Card, Field, PageHeader, errMsg, inputCls, savedMessage } from './ui';

interface ImgEntry { key: string; path?: string; file?: File; preview?: string }
type Errors = Partial<Record<'name' | 'slug' | 'sku' | 'price' | 'salePrice' | 'images', string>>;

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const newSku = () => `SM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${String(Math.floor(Math.random() * 900) + 100)}`;

export default function ProductForm() {
  const { id } = useParams();
  // Re-mount when switching between products so the form state is always fresh
  return <Inner key={id ?? 'new'} id={id} />;
}

function Inner({ id }: { id?: string }) {
  const store = useAdminStore();
  const toast = useToast();
  const navigate = useNavigate();
  const existing = id ? store.products.find((p) => p.id === id) : undefined;
  const isNew = !id;

  const [name, setName] = useState(existing?.name ?? '');
  const [slug, setSlug] = useState(existing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!existing);
  const [sku, setSku] = useState(existing?.sku ?? newSku());
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [salePrice, setSalePrice] = useState(existing?.salePrice ? String(existing.salePrice) : '');
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [status, setStatus] = useState<ProductStatus>(existing?.status ?? 'published');
  const [sizes, setSizes] = useState<string[]>(existing?.sizes ?? ['S', 'M', 'L', 'XL']);
  const [customSize, setCustomSize] = useState('');
  const [colors, setColors] = useState<ProductColor[]>(existing?.colors ?? []);
  const [specs, setSpecs] = useState<ProductSpec[]>(existing?.specs ?? [{ label: 'Leather', value: '' }, { label: 'Lining', value: '' }, { label: 'Fit', value: '' }]);
  const [images, setImages] = useState<ImgEntry[]>((existing?.images ?? []).map((path) => ({ key: uid('img'), path })));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  if (!isNew && !existing) {
    return (
      <AdminEmpty
        title="Product not found"
        text="It may have been deleted."
        action={
          <Link to="/admin/products">
            <Btn variant="primary">Back to products</Btn>
          </Link>
        }
      />
    );
  }

  /* ---------------- images ---------------- */
  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const next: ImgEntry[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: only JPEG, PNG and WebP images are supported.`);
        continue;
      }
      if (f.size > MAX_UPLOAD_BYTES) {
        toast.error(`${f.name}: larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      const preview = URL.createObjectURL(f);
      previews.current.push(preview);
      next.push({ key: uid('img'), file: f, preview });
    }
    if (next.length) setImages((cur) => [...cur, ...next]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((cur) => {
      const copy = [...cur];
      const [it] = copy.splice(from, 1);
      copy.splice(to, 0, it);
      return copy;
    });
  };

  const onDropZone = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  /* ---------------- validation + save ---------------- */
  const validate = (): Errors => {
    const e: Errors = {};
    const p = Number(price);
    const sp = salePrice.trim() === '' ? null : Number(salePrice);
    if (name.trim().length < 2) e.name = 'Enter the product name.';
    if (!slug) e.slug = 'Enter a URL slug.';
    else if (!SLUG_RE.test(slug)) e.slug = 'Use lowercase letters, numbers and single hyphens only.';
    else if (store.products.some((x) => x.slug === slug && x.id !== existing?.id)) e.slug = 'Another product already uses this URL.';
    if (sku.trim() && store.products.some((x) => x.sku.toLowerCase() === sku.trim().toLowerCase() && x.id !== existing?.id)) e.sku = 'Another product already uses this SKU.';
    if (!price.trim() || !isFinite(p) || p <= 0) e.price = 'Enter a price above 0.';
    if (sp !== null && (!isFinite(sp) || sp <= 0)) e.salePrice = 'Enter a valid discounted price, or leave it empty.';
    else if (sp !== null && isFinite(p) && sp >= p) e.salePrice = 'The discounted price must be lower than the price.';
    if (status === 'published' && images.length === 0) e.images = 'Add at least one image before publishing (or save as draft).';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields.');
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    try {
      // Upload newly added images (one by one so a retry never re-uploads finished ones)
      const entries = [...images];
      for (let i = 0; i < entries.length; i++) {
        const en = entries[i];
        if (!en.file) continue;
        const r = await store.uploadImages([en.file], 'products');
        if (r.errors.length || !r.paths[0]) throw new Error(r.errors[0] || 'Image upload failed.');
        entries[i] = { key: en.key, path: r.paths[0], preview: en.preview };
        setImages([...entries]);
      }
      const now = nowIso();
      const sp = salePrice.trim() === '' ? null : Number(salePrice);
      const product: Product = {
        id: existing?.id ?? uid('p'),
        slug,
        name: name.trim(),
        sku: sku.trim(),
        price: Number(price),
        salePrice: sp,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        specs: specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value),
        sizes,
        colors: colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: isValidHex(c.hex) ? c.hex : '#000000' })),
        images: entries.map((e) => e.path!).filter(Boolean),
        status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await store.saveProduct(product);
      toast.success(savedMessage(store.source, `"${product.name}"`));
      navigate('/admin/products');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleSize = (s: string) => setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const addCustomSize = () => {
    const s = customSize.trim().toUpperCase();
    if (s && !sizes.includes(s)) setSizes((cur) => [...cur, s]);
    setCustomSize('');
  };

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={isNew ? 'Add new product' : `Edit: ${existing!.name}`}
        description="Fill in the details below. Images can be reordered by dragging; the first one is the main image."
        actions={
          <>
            <Link to="/admin/products">
              <Btn type="button">Cancel</Btn>
            </Link>
            <Btn type="submit" variant="primary" loading={saving}>
              {isNew ? 'Create product' : 'Save changes'}
            </Btn>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" error={errors.name} className="sm:col-span-2">
                {(fid) => (
                  <input
                    id={fid}
                    className={inputCls}
                    value={name}
                    aria-invalid={!!errors.name}
                    placeholder="Classic Black Leather Jacket"
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slugTouched) setSlug(slugify(e.target.value));
                    }}
                  />
                )}
              </Field>
              <Field label="URL slug" error={errors.slug} hint={`Page address: /product/${slug || 'your-slug'}`}>
                {(fid) => (
                  <input
                    id={fid}
                    className={inputCls}
                    value={slug}
                    aria-invalid={!!errors.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value.toLowerCase());
                    }}
                  />
                )}
              </Field>
              <Field label="SKU / reference" error={errors.sku}>
                {(fid) => <input id={fid} className={inputCls} value={sku} aria-invalid={!!errors.sku} onChange={(e) => setSku(e.target.value)} />}
              </Field>
              <Field label={`Price (${store.config.brand.currency})`} error={errors.price}>
                {(fid) => <input id={fid} type="number" min="0" step="0.01" inputMode="decimal" className={inputCls} value={price} aria-invalid={!!errors.price} onChange={(e) => setPrice(e.target.value)} />}
              </Field>
              <Field label="Discounted price (optional)" error={errors.salePrice} hint="Shown with the regular price struck through.">
                {(fid) => <input id={fid} type="number" min="0" step="0.01" inputMode="decimal" className={inputCls} value={salePrice} aria-invalid={!!errors.salePrice} onChange={(e) => setSalePrice(e.target.value)} />}
              </Field>
              <Field label="Short description" hint="Shown on the product card." className="sm:col-span-2">
                {(fid) => <input id={fid} className={inputCls} maxLength={140} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />}
              </Field>
              <Field label="Full description" hint="Leave a blank line between paragraphs." className="sm:col-span-2">
                {(fid) => <textarea id={fid} rows={7} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />}
              </Field>
            </div>
          </Card>

          <Card title="Images" description="JPEG, PNG or WebP. Large photos are resized automatically.">
            <div data-error={!!errors.images}>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragFrom.current === null) setDropping(true);
                }}
                onDragLeave={() => setDropping(false)}
                onDrop={onDropZone}
                className={cn('rounded-xl border-2 border-dashed p-4 transition', dropping ? 'border-amber-700 bg-amber-50' : 'border-stone-300')}
              >
                {images.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {images.map((im, i) => (
                      <li
                        key={im.key}
                        draggable
                        onDragStart={() => (dragFrom.current = i)}
                        onDragEnd={() => (dragFrom.current = null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragFrom.current !== null) moveImage(dragFrom.current, i);
                          dragFrom.current = null;
                        }}
                        className="group relative cursor-grab overflow-hidden rounded-xl border border-stone-200 bg-stone-50 active:cursor-grabbing"
                      >
                        {im.preview ? (
                          <img src={im.preview} alt={`New image ${i + 1}`} className="aspect-[4/5] w-full object-cover" />
                        ) : (
                          <SmartImage src={im.path} alt={`Product image ${i + 1}`} className="aspect-[4/5] w-full" repoHint={store.config.repo} />
                        )}
                        {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">Main</span>}
                        {im.file && <span className="absolute bottom-9 left-2 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-medium text-white">Not saved yet</span>}
                        <button type="button" onClick={() => setImages((c) => c.filter((x) => x.key !== im.key))} aria-label={`Remove image ${i + 1}`} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow hover:bg-white">
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center justify-between border-t border-stone-200 bg-white px-1.5 py-1">
                          <button type="button" disabled={i === 0} onClick={() => moveImage(i, i - 1)} aria-label="Move image earlier" className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30">
                            <ArrowLeft size={15} />
                          </button>
                          <span className="text-xs text-stone-400">{i + 1}</span>
                          <button type="button" disabled={i === images.length - 1} onClick={() => moveImage(i, i + 1)} aria-label="Move image later" className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30">
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-stone-500">
                    <ImagePlus size={30} />
                    <p className="text-sm">Drag images here, or use the buttons below.</p>
                  </div>
                )}
              </div>
              {errors.images && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{errors.images}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <input ref={fileInput} id="product-files" type="file" accept={ACCEPT_ATTR} multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
              <label htmlFor="product-files" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
                <ImagePlus size={16} /> Upload images
              </label>
              <Btn type="button" onClick={() => setPickerOpen(true)}>
                <FolderOpen size={16} /> Media Library
              </Btn>
            </div>
          </Card>

          <Card title="Specifications" description="Shown as a table on the product page.">
            <div className="space-y-2">
              {specs.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                  <input aria-label={`Specification ${i + 1} label`} className={inputCls} placeholder="Label" value={s.label} onChange={(e) => setSpecs((c) => c.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input aria-label={`Specification ${i + 1} value`} className={inputCls} placeholder="Value" value={s.value} onChange={(e) => setSpecs((c) => c.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" onClick={() => setSpecs((c) => c.filter((_, j) => j !== i))} aria-label={`Remove specification ${i + 1}`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-red-600">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <Btn type="button" size="sm" onClick={() => setSpecs((c) => [...c, { label: '', value: '' }])}>
                <Plus size={14} /> Add specification
              </Btn>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Publishing">
            <Field label="Status" hint={status === 'published' ? 'Visible to visitors as soon as it is saved.' : 'Hidden from the website. Only admins can preview it.'}>
              {(fid) => (
                <select id={fid} className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              )}
            </Field>
          </Card>

          <Card title="Available sizes">
            <div className="flex flex-wrap gap-2">
              {[...PRESET_SIZES, ...sizes.filter((s) => !PRESET_SIZES.includes(s))].map((s) => (
                <button key={s} type="button" onClick={() => toggleSize(s)} aria-pressed={sizes.includes(s)} className={cn('min-w-11 rounded-lg border px-3 py-1.5 text-sm transition', sizes.includes(s) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500')}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input aria-label="Custom size" className={inputCls} placeholder="Custom size (e.g. 52)" value={customSize} onChange={(e) => setCustomSize(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())} />
              <Btn type="button" onClick={addCustomSize}>Add</Btn>
            </div>
          </Card>

          <Card title="Available colours">
            <div className="space-y-2">
              {colors.map((c, i) => (
                <div key={i} className="grid grid-cols-[2.75rem_1fr_auto] gap-2">
                  <input type="color" aria-label={`Colour ${i + 1} swatch`} className="h-10 w-full cursor-pointer rounded-lg border border-stone-300 bg-white p-1" value={isValidHex(c.hex) && c.hex.length === 7 ? c.hex : '#000000'} onChange={(e) => setColors((cur) => cur.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
                  <input aria-label={`Colour ${i + 1} name`} className={inputCls} placeholder="Name (e.g. Cognac)" value={c.name} onChange={(e) => setColors((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <button type="button" onClick={() => setColors((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove colour ${i + 1}`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-red-600">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <Btn type="button" size="sm" onClick={() => setColors((c) => [...c, { name: '', hex: '#1b1816' }])}>
                <Plus size={14} /> Add colour
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-stone-200 bg-stone-100/95 py-3 backdrop-blur">
        <Link to="/admin/products">
          <Btn type="button">Cancel</Btn>
        </Link>
        <Btn type="submit" variant="primary" loading={saving}>
          {isNew ? 'Create product' : 'Save changes'}
        </Btn>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple
        onSelect={(paths) => setImages((cur) => [...cur, ...paths.filter((p) => !cur.some((c) => c.path === p)).map((path) => ({ key: uid('img'), path }))])}
      />
    </form>
  );
}
