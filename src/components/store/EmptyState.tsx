import type { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-ink/20 px-6 py-16 text-center">
      <PackageOpen size={34} className="opacity-40" aria-hidden="true" />
      <h3 className="text-2xl">{title}</h3>
      {text && <p className="max-w-md text-sm opacity-70">{text}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
