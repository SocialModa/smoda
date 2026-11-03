import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Github, KeyRound, ShieldAlert, XCircle } from 'lucide-react';
import { useAdminStore } from '@/context/AdminStoreContext';
import { useToast } from '@/context/ToastContext';
import { forgetToken, listBranches, loadGhSettings, loadToken, saveGh, testConnection, GitHubError, type GhRepoInfo } from '@/lib/github';
import { Badge, Btn, Card, Field, PageHeader, errMsg, inputCls } from './ui';

interface Check { ok: boolean; label: string; detail?: string }

export default function GitHubPage() {
  const store = useAdminStore();
  const toast = useToast();
  const initial = loadGhSettings();
  const tok = loadToken();

  const [owner, setOwner] = useState(initial.owner);
  const [repo, setRepo] = useState(initial.repo);
  const [branch, setBranch] = useState(initial.branch || 'main');
  const [token, setToken] = useState(tok.token);
  const [remember, setRemember] = useState(tok.remembered);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [info, setInfo] = useState<GhRepoInfo | null>(null);

  const cfg = () => ({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main', token: token.trim() });

  const save = () => {
    const c = cfg();
    if (!c.owner || !c.repo) return toast.error('Enter the repository owner and name.');
    saveGh(c, c.token, remember);
    toast.success(c.token ? 'GitHub connection saved in this browser.' : 'Repository saved. Add a token to publish.');
  };

  const test = async () => {
    const c = cfg();
    if (!c.owner || !c.repo || !c.token) return toast.error('Owner, repository and token are all required to test the connection.');
    setTesting(true);
    setChecks(null);
    const out: Check[] = [];
    try {
      const r = await testConnection(c);
      setInfo(r);
      out.push({ ok: true, label: `Repository found: ${r.fullName}`, detail: r.isPrivate ? 'Private repository' : 'Public repository' });
      out.push({ ok: r.canPush, label: r.canPush ? 'Token can write to this repository' : 'Token cannot write to this repository', detail: r.canPush ? undefined : 'Grant "Contents: Read and write" on this repository.' });
      out.push({ ok: r.branchExists, label: r.branchExists ? `Branch "${c.branch}" exists` : `Branch "${c.branch}" was not found`, detail: r.branchExists ? undefined : `The default branch is "${r.defaultBranch}".` });
      try {
        setBranches(await listBranches(c));
      } catch {
        /* branch list is a nicety */
      }
      if (r.canPush && r.branchExists) {
        saveGh(c, c.token, remember);
        out.push({ ok: true, label: 'Connection saved. The dashboard now publishes to GitHub.' });
      }
    } catch (e) {
      out.push({ ok: false, label: 'Connection failed', detail: e instanceof GitHubError ? `${e.message}` : errMsg(e) });
    }
    setChecks(out);
    setTesting(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      await store.refresh();
      toast.success('Repository data loaded.');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const forget = () => {
    forgetToken();
    setToken('');
    setChecks(null);
    toast.success('Token removed from this browser.');
  };

  return (
    <>
      <PageHeader title="GitHub Integration" description="Products, website settings and images are saved as files in your repository. GitHub Pages then publishes them." />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card
            title="Repository connection"
            actions={store.ghConfigured ? <Badge tone={store.ghError ? 'red' : 'green'}>{store.ghError ? 'Problem' : 'Connected'}</Badge> : <Badge tone="amber">Not connected</Badge>}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Repository owner" hint="Your GitHub username or organisation.">{(id) => <input id={id} className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="your-username" autoComplete="off" />}</Field>
              <Field label="Repository name">{(id) => <input id={id} className={inputCls} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="socialmoda" autoComplete="off" />}</Field>
              <Field label="Branch" hint="The branch GitHub Pages deploys from." className="sm:col-span-2">
                {(id) => (
                  <>
                    <input id={id} list="branch-list" className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)} autoComplete="off" />
                    <datalist id="branch-list">{branches.map((b) => <option key={b} value={b} />)}</datalist>
                  </>
                )}
              </Field>
              <Field label="Personal access token" className="sm:col-span-2" hint="Fine-grained token, limited to this repository, with Contents: Read and write.">
                {(id) => (
                  <div className="relative">
                    <input id={id} type={show ? 'text' : 'password'} className={`${inputCls} pr-10 font-mono`} value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" spellCheck={false} />
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide token' : 'Show token'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-stone-500 hover:bg-stone-100">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </Field>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300" />
              <span>Remember the token on this device. Leave unticked on shared computers: it is then forgotten when you close the tab.</span>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <Btn variant="primary" loading={testing} onClick={() => void test()}>
                <Github size={16} /> Test connection
              </Btn>
              <Btn onClick={save}>Save</Btn>
              <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={forget}>
                <KeyRound size={15} /> Forget token
              </Btn>
            </div>

            {checks && (
              <ul className="mt-5 space-y-2 rounded-xl bg-stone-50 p-4" aria-live="polite">
                {checks.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {c.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={17} className="mt-0.5 shrink-0 text-red-600" />}
                    <div>
                      <p className={c.ok ? 'text-stone-800' : 'font-medium text-red-700'}>{c.label}</p>
                      {c.detail && <p className="text-stone-500">{c.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {info && !info.isPrivate && <p className="mt-3 text-xs text-stone-500">Tip: {info.htmlUrl}/settings/pages is where you set "Source" to "GitHub Actions".</p>}
          </Card>

          <Card title="Repository data" description="Load the newest products and site configuration straight from GitHub (no waiting for the deploy).">
            {store.ghError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{store.ghError}</p>}
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-stone-50 p-3"><dt className="text-stone-500">Source</dt><dd className="font-medium">{store.source === 'github' ? store.repoLabel : 'Local mode'}</dd></div>
              <div className="rounded-xl bg-stone-50 p-3"><dt className="text-stone-500">Products loaded</dt><dd className="font-medium">{store.products.length}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Btn loading={loading} onClick={() => void load()} disabled={!store.ghConfigured}>Load existing repository data</Btn>
              {store.ghConfigured && store.repoMissing && (store.repoMissing.products || store.repoMissing.config) && (
                <Btn variant="accent" onClick={() => void store.initRepository().then(() => toast.success('Repository data created.')).catch((e) => toast.error(errMsg(e)))}>
                  Create missing data files
                </Btn>
              )}
              {store.ghConfigured && (store.localNewer.products || store.localNewer.config) && (
                <Btn variant="accent" onClick={() => void store.pushLocalToGitHub().then(() => toast.success('Local changes pushed.')).catch((e) => toast.error(errMsg(e)))}>
                  Push local changes to GitHub
                </Btn>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="How saving works">
            <pre className="thin-scroll overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs leading-relaxed text-stone-200">{`public/
  data/
    products.json      ← product catalogue
    site-config.json   ← Web Editor settings
  assets/
    products/          ← product photos
    site/              ← hero, logo, pages`}</pre>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-stone-600">
              <li>You save in the dashboard.</li>
              <li>The dashboard commits the file to your repository through the GitHub API.</li>
              <li>The GitHub Actions workflow rebuilds the site (1 to 2 minutes).</li>
              <li>Visitors see the update. You see it immediately in this browser.</li>
            </ol>
          </Card>

          <Card title="Security: please read">
            <div className="flex gap-3">
              <ShieldAlert size={22} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="space-y-3 text-sm leading-relaxed text-stone-600">
                <p>
                  A static site has no secret place to hide a token. It is stored in <em>your</em> browser only and sent to api.github.com. It is never written to the repository, but anything running in this browser (an
                  extension, or a script injected through a vulnerability) could read it.
                </p>
                <p className="font-medium text-stone-800">To keep the risk small:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Use a <strong>fine-grained</strong> token for <strong>this repository only</strong>, with only <strong>Contents: Read and write</strong>.</li>
                  <li>Set a short expiry (30 to 90 days) and revoke it if a device is lost.</li>
                  <li>Do not tick "Remember" on shared computers.</li>
                </ul>
                <p>
                  For a team, or for real multi-user security, put a small authentication proxy in front of GitHub (a GitHub App or OAuth flow running on a serverless function such as Cloudflare Workers or Netlify
                  Functions). It keeps the secret server-side, signs editors in individually and hands the browser short-lived tokens. See the README, "Production authentication".
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
