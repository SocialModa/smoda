import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, FolderOpen, Plus, Trash2, X } from 'lucide-react';
import type { SiteConfig } from '@/types';
import { FONT_OPTIONS } from '@/lib/fonts';
import { cn, getIn, isValidHex, uid } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import MediaPicker from '../MediaPicker';
import type { Device } from './PreviewFrame';

interface EditorValue {
  config: SiteConfig;
  device: Device;
  /** Immutable update by dot-path. Edits to the same path within a moment merge into one undo step. */
  set: (path: string, value: unknown) => void;
  /** Set when the user clicked something in the preview: sections open and the field is focused */
  focus: { path: string; n: number } | null;
}
const Ctx = createContext<EditorValue | null>(null);
export const EditorProvider = Ctx.Provider;
function useEd(): EditorValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('Editor controls must be rendered inside <EditorProvider>');
  return c;
}

const fieldCls = 'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20';

/* ---------------- layout ---------------- */

export function Section({ title, children, defaultOpen = false, match = [] }: { title: string; children: ReactNode; defaultOpen?: boolean; match?: string[] }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const { focus } = useEd();
  useEffect(() => {
    if (focus && match.some((m) => focus.path === m || focus.path.startsWith(m))) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  return (
    <section className="border-b border-stone-200">
      <h3>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-stone-900 hover:bg-stone-50">
          {title}
          <ChevronDown size={16} className={cn('text-stone-400 transition', open && 'rotate-180')} />
        </button>
      </h3>
      {open && (
        <div id={id} className="space-y-4 px-4 pb-5 pt-1">
          {children}
        </div>
      )}
    </section>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl bg-stone-50 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function Row({ label, hint, htmlFor, children, aside, path }: { label: string; hint?: string; htmlFor?: string; children: ReactNode; aside?: ReactNode; path?: string }) {
  return (
    <div data-edit-path={path}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium text-stone-700">{label}</label>
        {aside}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-snug text-stone-500">{hint}</p>}
    </div>
  );
}

/* ---------------- primitives bound to a config path ---------------- */

export function TextControl({ path, label, multiline, rows = 3, hint, placeholder }: { path: string; label: string; multiline?: boolean; rows?: number; hint?: string; placeholder?: string }) {
  const { config, set } = useEd();
  const id = useId();
  const value = String(getIn(config, path) ?? '');
  return (
    <Row label={label} hint={hint} htmlFor={id} path={path}>
      {multiline ? (
        <textarea id={id} rows={rows} className={fieldCls} value={value} placeholder={placeholder} onChange={(e) => set(path, e.target.value)} />
      ) : (
        <input id={id} className={fieldCls} value={value} placeholder={placeholder} onChange={(e) => set(path, e.target.value)} />
      )}
    </Row>
  );
}

export function ColorControl({ path, label }: { path: string; label: string }) {
  const { config, set } = useEd();
  const id = useId();
  const value = String(getIn(config, path) ?? '#000000');
  const swatch = isValidHex(value) && value.length === 7 ? value : '#000000';
  return (
    <Row label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={swatch} onChange={(e) => set(path, e.target.value)} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-1" />
        <input id={id} className={cn(fieldCls, 'font-mono uppercase')} value={value} maxLength={7} onChange={(e) => set(path, e.target.value)} aria-invalid={!isValidHex(value)} />
      </div>
    </Row>
  );
}

function RangeInput({ id, label, value, min, max, step, unit, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input id={id} type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 flex-1 cursor-pointer accent-amber-700" />
      <div className="flex w-[4.6rem] shrink-0 items-center rounded-lg border border-stone-300 bg-white pr-1.5">
        <input type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none" />
        {unit && <span className="text-xs text-stone-400">{unit}</span>}
      </div>
    </div>
  );
}

export function RangeControl({ path, label, min, max, step = 1, unit, hint }: { path: string; label: string; min: number; max: number; step?: number; unit?: string; hint?: string }) {
  const { config, set } = useEd();
  const id = useId();
  const value = Number(getIn(config, path) ?? min);
  return (
    <Row label={label} hint={hint} htmlFor={id}>
      <RangeInput id={id} label={label} value={value} min={min} max={max} step={step} unit={unit} onChange={(n) => isFinite(n) && set(path, Math.min(max, Math.max(min, n)))} />
    </Row>
  );
}

/** A value stored per device ({desktop,tablet,mobile}). Edits apply to the device chosen in the toolbar. */
export function ResponsiveRange({ path, label, min, max, step = 1, unit, hint }: { path: string; label: string; min: number; max: number; step?: number; unit?: string; hint?: string }) {
  const { config, set, device } = useEd();
  const id = useId();
  const full = `${path}.${device}`;
  const value = Number(getIn(config, full) ?? min);
  return (
    <Row label={label} hint={hint} htmlFor={id} aside={<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium capitalize text-amber-800">{device}</span>}>
      <RangeInput id={id} label={`${label} (${device})`} value={value} min={min} max={max} step={step} unit={unit} onChange={(n) => isFinite(n) && set(full, Math.min(max, Math.max(min, n)))} />
    </Row>
  );
}

export function SelectControl({ path, label, options, hint }: { path: string; label: string; options: { value: string; label: string }[]; hint?: string }) {
  const { config, set } = useEd();
  const id = useId();
  return (
    <Row label={label} hint={hint} htmlFor={id}>
      <select id={id} className={fieldCls} value={String(getIn(config, path) ?? '')} onChange={(e) => set(path, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Row>
  );
}

export function NumberSelectControl({ path, label, options }: { path: string; label: string; options: { value: number; label: string }[] }) {
  const { config, set } = useEd();
  const id = useId();
  return (
    <Row label={label} htmlFor={id}>
      <select id={id} className={fieldCls} value={Number(getIn(config, path) ?? 0)} onChange={(e) => set(path, Number(e.target.value))}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Row>
  );
}

export function ToggleControl({ path, label, hint }: { path: string; label: string; hint?: string }) {
  const { config, set } = useEd();
  const on = !!getIn(config, path);
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-stone-700">{label}</p>
        {hint && <p className="text-[11px] leading-snug text-stone-500">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(path, !on)} className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-amber-700' : 'bg-stone-300')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[1.375rem]' : 'left-0.5')} />
      </button>
    </div>
  );
}

export function FontControl({ path, label }: { path: string; label: string }) {
  const { config, set } = useEd();
  const id = useId();
  const value = String(getIn(config, path) ?? '');
  return (
    <Row label={label} htmlFor={id}>
      <select id={id} className={fieldCls} value={value} onChange={(e) => set(path, e.target.value)}>
        <optgroup label="Serif">
          {FONT_OPTIONS.filter((f) => f.kind === 'serif').map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </optgroup>
        <optgroup label="Sans-serif">
          {FONT_OPTIONS.filter((f) => f.kind === 'sans').map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </optgroup>
      </select>
    </Row>
  );
}

export function ImageControl({ path, label, hint, optional = true }: { path: string; label: string; hint?: string; optional?: boolean }) {
  const { config, set } = useEd();
  const [open, setOpen] = useState(false);
  const value = String(getIn(config, path) ?? '');
  return (
    <Row label={label} hint={hint} path={path}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
          {value ? <SmartImage src={value} alt={`${label} preview`} fit="cover" className="h-full w-full" repoHint={config.repo} /> : <div className="flex h-full items-center justify-center text-[10px] text-stone-400">none</div>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-stone-50">
            <FolderOpen size={14} /> Choose / upload
          </button>
          {optional && value && (
            <button type="button" onClick={() => set(path, '')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">
              <X size={13} /> Remove
            </button>
          )}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} folder="site" title={`Choose: ${label}`} onSelect={(paths) => paths[0] && set(path, paths[0])} />
    </Row>
  );
}

/* ---------------- list editor (navigation, social links, highlights) ---------------- */

interface ListField { key: string; label: string; type?: 'text' | 'textarea' | 'select'; options?: { value: string; label: string }[]; placeholder?: string }

export function ListControl({ path, label, fields, makeItem, itemTitle, addLabel }: { path: string; label: string; fields: ListField[]; makeItem: () => Record<string, string>; itemTitle: (item: Record<string, string>, i: number) => string; addLabel: string }) {
  const { config, set } = useEd();
  const items = (getIn(config, path) as Record<string, string>[] | undefined) ?? [];
  const update = (i: number, key: string, v: string) => set(path, items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    set(path, copy);
  };
  return (
    <div data-edit-path={path}>
      <p className="mb-2 text-xs font-medium text-stone-700">{label}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={it.id || i} className="rounded-xl border border-stone-200 bg-white p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-stone-800">{itemTitle(it, i)}</span>
              <span className="flex shrink-0 gap-0.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => set(path, items.filter((_, j) => j !== i))} aria-label="Remove" className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              </span>
            </div>
            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <span className="mb-0.5 block text-[11px] text-stone-500">{f.label}</span>
                  {f.type === 'select' ? (
                    <select aria-label={f.label} className={fieldCls} value={it[f.key] ?? ''} onChange={(e) => update(i, f.key, e.target.value)}>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea aria-label={f.label} rows={2} className={fieldCls} value={it[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => update(i, f.key, e.target.value)} />
                  ) : (
                    <input aria-label={f.label} className={fieldCls} value={it[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => update(i, f.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => set(path, [...items, makeItem()])} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-amber-700 hover:text-amber-800">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

export const newId = uid;
