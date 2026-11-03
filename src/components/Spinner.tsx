import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-stone-500" role="status" aria-live="polite">
      <Spinner size={28} />
      <span className="text-xs uppercase tracking-[0.25em]">{label}</span>
    </div>
  );
}
