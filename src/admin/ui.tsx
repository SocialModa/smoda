import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { cn } from '@/lib/utils';

export const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20 disabled:bg-stone-100 disabled:text-stone-500';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
const variants: Record<Variant, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-700 focus-visible:outline-stone-900',
  accent: 'bg-amber-700 text-white hover:bg-amber-800 focus-visible:outline-amber-700',
  secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 focus-visible:outline-amber-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  ghost: 'text-stone-700 hover:bg-stone-100 focus-visible:outline-amber-700',
};

export function Btn({
  variant = 'secondary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-800">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-stone-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-stone-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  stone: 'bg-stone-100 text-stone-700',
  blue: 'bg-sky-100 text-sky-800',
};
export function Badge({ tone = 'stone', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function StatusBadge({ status }: { status: 'published' | 'draft' }) {
  return <Badge tone={status === 'published' ? 'green' : 'amber'}>{status === 'published' ? 'Published' : 'Draft'}</Badge>;
}

export function AdminEmpty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      {icon && <div className="text-stone-400">{icon}</div>}
      <h3 className="text-base font-semibold text-stone-800">{title}</h3>
      {text && <p className="max-w-sm text-sm text-stone-500">{text}</p>}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 animate-fade-only bg-black/55" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-lg')}
      >
        <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Message shown after a save, depending on where the data went. */
export const savedMessage = (source: 'github' | 'local', what: string) =>
  source === 'github'
    ? `${what} saved to GitHub. The live site updates in 1 to 2 minutes.`
    : `${what} saved in this browser only (local mode). Connect GitHub to publish it for everyone.`;

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
