import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  useEffect(() => {
    if (!opts) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts]);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="presentation">
          <div className="absolute inset-0 animate-fade-only bg-black/55" onClick={() => close(false)} />
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="relative w-full max-w-md animate-pop rounded-2xl bg-white p-6 text-stone-800 shadow-2xl">
            <div className="flex gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${opts.danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 id="confirm-title" className="text-base font-semibold text-stone-900">{opts.title}</h2>
                {opts.message && <div className="mt-1.5 text-sm leading-relaxed text-stone-600">{opts.message}</div>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button ref={cancelRef} onClick={() => close(false)} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
                {opts.cancelText || 'Cancel'}
              </button>
              <button onClick={() => close(true)} className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${opts.danger ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600' : 'bg-stone-900 hover:bg-stone-700 focus-visible:outline-stone-900'}`}>
                {opts.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return c;
}
