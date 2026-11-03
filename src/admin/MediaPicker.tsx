import { useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { useAdminStore, type Folder } from '@/context/AdminStoreContext';
import { useToast } from '@/context/ToastContext';
import { ACCEPT_ATTR } from '@/lib/images';
import { cn } from '@/lib/utils';
import SmartImage from '@/components/store/SmartImage';
import { Btn, Modal } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (paths: string[]) => void;
  multiple?: boolean;
  folder?: Folder;
  title?: string;
}

/** Pick existing images from the Media Library, or upload new ones without leaving the form. */
export default function MediaPicker({ open, onClose, onSelect, multiple, folder = 'products', title = 'Choose from Media Library' }: Props) {
  const store = useAdminStore();
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const toggle = (path: string) => setPicked((cur) => (multiple ? (cur.includes(path) ? cur.filter((p) => p !== path) : [...cur, path]) : [path]));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const { paths, errors } = await store.uploadImages(Array.from(files), folder);
    setUploading(false);
    errors.forEach((e) => toast.error(e));
    if (paths.length) {
      toast.success(`${paths.length} image${paths.length > 1 ? 's' : ''} uploaded.`);
      setPicked((cur) => (multiple ? [...cur, ...paths] : [paths[0]]));
    }
    if (input.current) input.current.value = '';
  };

  const finish = () => {
    onSelect(picked);
    setPicked([]);
    onClose();
  };
  const close = () => {
    setPicked([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={title} wide>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <p className="text-sm text-stone-500">{store.media.length} image{store.media.length === 1 ? '' : 's'} available</p>
        <div>
          <input ref={input} type="file" accept={ACCEPT_ATTR} multiple className="sr-only" id="picker-upload" onChange={(e) => void upload(e.target.files)} />
          <label htmlFor="picker-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone-50">
            <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload new'}
          </label>
        </div>
      </div>

      <div className="p-5">
        {store.mediaLoading && store.media.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">Loading media…</p>
        ) : store.media.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">No images yet. Upload your first one.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {store.media.map((m) => {
              const on = picked.includes(m.path);
              return (
                <li key={m.path}>
                  <button
                    type="button"
                    onClick={() => toggle(m.path)}
                    aria-pressed={on}
                    className={cn('relative block w-full overflow-hidden rounded-xl border-2 text-left transition', on ? 'border-amber-700' : 'border-transparent hover:border-stone-300')}
                  >
                    <SmartImage src={m.path} alt={m.name} className="aspect-[4/5] w-full" repoHint={store.config.repo} />
                    {on && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-white">
                        <Check size={14} />
                      </span>
                    )}
                    <span className="block truncate bg-stone-50 px-2 py-1.5 text-xs text-stone-600">{m.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-stone-100 bg-white px-5 py-3">
        <Btn onClick={close}>Cancel</Btn>
        <Btn variant="primary" disabled={picked.length === 0} onClick={finish}>
          Use {picked.length > 1 ? `${picked.length} images` : 'image'}
        </Btn>
      </div>
    </Modal>
  );
}
