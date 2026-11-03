import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, Upload } from 'lucide-react';
import { useAdminStore } from '@/context/AdminStoreContext';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { changeLocalPassword, isEnvManaged } from '@/lib/auth';
import { normalizeConfig, normalizeProducts } from '@/lib/data';
import { KEYS, clearLocalData, lsRemove } from '@/lib/storage';
import { downloadText, nowIso } from '@/lib/utils';
import { Badge, Btn, Card, Field, PageHeader, errMsg, inputCls } from './ui';

export default function Settings() {
  const store = useAdminStore();
  const auth = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [pwError, setPwError] = useState('');
  const [busy, setBusy] = useState(false);
  const envManaged = isEnvManaged();

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (next.length < 8) return setPwError('The new password needs at least 8 characters.');
    if (next !== again) return setPwError('The new passwords do not match.');
    setBusy(true);
    const r = await changeLocalPassword(cur, next);
    setBusy(false);
    if (!r.ok) return setPwError(r.error || 'Could not change the password.');
    setCur('');
    setNext('');
    setAgain('');
    toast.success('Password changed for this browser.');
  };

  const resetCredentials = async () => {
    const ok = await confirm({
      title: 'Reset admin credentials?',
      message: 'You will be signed out and asked to create a new username and password on this browser.',
      confirmText: 'Reset and sign out',
      danger: true,
    });
    if (!ok) return;
    lsRemove(KEYS.authLocal);
    auth.logout();
    auth.refreshMode();
    navigate('/admin/login', { replace: true });
  };

  const exportProducts = () => downloadText('socialmoda-products.json', JSON.stringify({ updatedAt: nowIso(), products: store.products }, null, 2));
  const exportConfig = () => downloadText('socialmoda-site-config.json', JSON.stringify(store.config, null, 2));

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      const isProducts = Array.isArray(data.products);
      const isConfig = typeof data.brand === 'object' && data.brand !== null;
      if (!isProducts && !isConfig) throw new Error('This file is neither a products backup nor a site configuration backup.');
      const ok = await confirm({
        title: `Import ${isProducts ? 'products' : 'site configuration'}?`,
        message: isProducts
          ? `This replaces all ${store.products.length} current products with ${(data.products as unknown[]).length} from the file.`
          : 'This replaces the current website configuration (design, text, navigation).',
        confirmText: 'Import and save',
        danger: true,
      });
      if (!ok) return;
      await store.replaceAll(isProducts ? normalizeProducts(data) : { updatedAt: nowIso(), products: store.products }, isConfig ? normalizeConfig(data) : store.config);
      toast.success('Backup imported.');
    } catch (e) {
      toast.error(e instanceof SyntaxError ? 'That file is not valid JSON.' : errMsg(e));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const clearLocal = async () => {
    const ok = await confirm({
      title: 'Clear local data?',
      message: 'Removes unpublished local changes, saved design drafts and images stored in this browser. Anything already on GitHub is untouched.',
      confirmText: 'Clear local data',
      danger: true,
    });
    if (!ok) return;
    clearLocalData();
    await store.discardLocal();
    toast.success('Local data cleared.');
  };

  return (
    <>
      <PageHeader title="Website Settings" description="Admin access, backups and local data. Design and content live in the Website Editor." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Admin access" actions={<Badge tone={envManaged ? 'blue' : 'amber'}>{envManaged ? 'Set at build time' : 'This browser only'}</Badge>}>
          {envManaged ? (
            <p className="text-sm leading-relaxed text-stone-600">
              The admin username and password hash are configured in the repository variables <code className="rounded bg-stone-100 px-1">ADMIN_USER</code> and <code className="rounded bg-stone-100 px-1">ADMIN_PASSWORD_SHA256</code>. Change
              them there and redeploy. See the README, "Authentication".
            </p>
          ) : (
            <form onSubmit={changePassword} className="space-y-4" noValidate>
              <p className="text-sm text-stone-600">Signed in as <strong>{auth.user}</strong>. These credentials are stored as a hash in this browser only.</p>
              <Field label="Current password">{(id) => <input id={id} type="password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />}</Field>
              <Field label="New password" hint="At least 8 characters.">{(id) => <input id={id} type="password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />}</Field>
              <Field label="Repeat new password">{(id) => <input id={id} type="password" className={inputCls} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" />}</Field>
              {pwError && <p className="text-sm text-red-600" role="alert">{pwError}</p>}
              <div className="flex flex-wrap gap-2">
                <Btn type="submit" variant="primary" loading={busy}>Change password</Btn>
                <Btn type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => void resetCredentials()}>Reset credentials</Btn>
              </div>
            </form>
          )}
        </Card>

        <Card title="Backup and restore" description="Download your data, or restore it from a previous download.">
          <div className="flex flex-wrap gap-2">
            <Btn onClick={exportProducts}><Download size={15} /> Products (JSON)</Btn>
            <Btn onClick={exportConfig}><Download size={15} /> Site configuration (JSON)</Btn>
          </div>
          <div className="mt-4 border-t border-stone-100 pt-4">
            <input ref={fileRef} id="import-file" type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void importFile(e.target.files?.[0])} />
            <label htmlFor="import-file" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50">
              <Upload size={15} /> Import a backup file
            </label>
            <p className="mt-2 text-xs text-stone-500">Products and site configuration files are recognised automatically. Image files are not part of the backup: they live in the repository.</p>
          </div>
        </Card>

        <Card title="Local data" description="Unpublished changes, design drafts and local images kept in this browser.">
          <Btn variant="danger" onClick={() => void clearLocal()}>
            <Trash2 size={15} /> Clear local data
          </Btn>
        </Card>

        <Card title="Website address">
          <p className="text-sm text-stone-600">
            Storefront: <code className="rounded bg-stone-100 px-1">{window.location.origin}{import.meta.env.BASE_URL}</code>
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Admin: <code className="rounded bg-stone-100 px-1">{window.location.origin}{import.meta.env.BASE_URL}admin</code>
          </p>
          <p className="mt-3 text-xs text-stone-500">The admin address is not linked anywhere on the public site.</p>
        </Card>
      </div>
    </>
  );
}
