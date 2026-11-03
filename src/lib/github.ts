/**
 * Minimal GitHub REST client used by the admin dashboard.
 *
 * SECURITY: the token lives in the admin's browser only (localStorage if "remember" is ticked,
 * otherwise sessionStorage). It is never written to any file in the repository.
 * See README.md for the limitations of client-side GitHub authentication.
 */
import { KEYS, lsGet, lsSet, lsRemove, ssGet, ssSet, ssRemove } from './storage';

export interface GhSettings { owner: string; repo: string; branch: string }
export interface GhConfig extends GhSettings { token: string }
export interface GhFile { name: string; path: string; sha: string; size: number }
export interface GhRepoInfo {
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  canPush: boolean;
  branchExists: boolean;
  htmlUrl: string;
}

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

const API = 'https://api.github.com';
const EVENT = 'sm:gh-changed';

/* ---------------- settings + token storage ---------------- */

export function loadGhSettings(): GhSettings {
  return lsGet<GhSettings>(KEYS.ghSettings, { owner: '', repo: '', branch: 'main' });
}

export function loadToken(): { token: string; remembered: boolean } {
  const l = lsGet<string>(KEYS.ghToken, '');
  if (l) return { token: l, remembered: true };
  return { token: ssGet<string>(KEYS.ghToken, ''), remembered: false };
}

export function getGhConfig(): GhConfig | null {
  const s = loadGhSettings();
  const { token } = loadToken();
  return s.owner && s.repo && token ? { ...s, branch: s.branch || 'main', token } : null;
}

export function saveGh(settings: GhSettings, token: string, remember: boolean) {
  lsSet(KEYS.ghSettings, {
    owner: settings.owner.trim(),
    repo: settings.repo.trim(),
    branch: settings.branch.trim() || 'main',
  });
  lsRemove(KEYS.ghToken);
  ssRemove(KEYS.ghToken);
  if (token) (remember ? lsSet : ssSet)(KEYS.ghToken, token.trim());
  window.dispatchEvent(new Event(EVENT));
}

export function forgetToken() {
  lsRemove(KEYS.ghToken);
  ssRemove(KEYS.ghToken);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeGh(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/* ---------------- encoding helpers ---------------- */

export function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/* ---------------- low-level request ---------------- */

async function toError(res: Response): Promise<GitHubError> {
  let msg = '';
  try {
    msg = ((await res.json()) as { message?: string }).message || '';
  } catch {
    /* ignore */
  }
  const s = res.status;
  if (s === 401) return new GitHubError(s, 'GitHub rejected the token (401 Bad credentials). Create a new token and paste it again.');
  if (s === 403) {
    if (res.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(msg))
      return new GitHubError(s, 'GitHub API rate limit reached. Wait a few minutes and try again.');
    return new GitHubError(s, `Permission denied (403). The token needs "Contents: Read and write" access to this repository.${msg ? ` GitHub says: ${msg}` : ''}`);
  }
  if (s === 404) return new GitHubError(s, 'Not found (404). Check the owner, repository name and branch, and make sure the token can access this repository.');
  if (s === 409) return new GitHubError(s, 'Conflict (409): the file changed on GitHub while saving. Reload the data and try again.');
  if (s === 422) return new GitHubError(s, `GitHub could not process the request (422).${msg ? ` ${msg}` : ''}`);
  return new GitHubError(s, `GitHub error ${s}${msg ? `: ${msg}` : ''}`);
}

async function request(cfg: GhConfig, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      // GitHub answers GETs with max-age=60: without this a stale file sha is reused and writes fail with 409
      cache: 'no-store',
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${cfg.token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...((init.headers as Record<string, string>) || {}),
      },
    });
  } catch {
    throw new GitHubError(0, 'Network error: could not reach api.github.com. Check your internet connection.');
  }
  if (!res.ok) throw await toError(res);
  return res;
}

const repoPath = (cfg: GhConfig) => `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;

/* ---------------- public API ---------------- */

export async function testConnection(cfg: GhConfig): Promise<GhRepoInfo> {
  const repo = (await (await request(cfg, repoPath(cfg))).json()) as {
    full_name: string;
    private: boolean;
    default_branch: string;
    html_url: string;
    permissions?: { push?: boolean };
  };
  let branchExists = true;
  try {
    await request(cfg, `${repoPath(cfg)}/branches/${encodeURIComponent(cfg.branch)}`);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) branchExists = false;
    else throw e;
  }
  return {
    fullName: repo.full_name,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch,
    canPush: !!repo.permissions?.push,
    branchExists,
    htmlUrl: repo.html_url,
  };
}

export async function listBranches(cfg: GhConfig): Promise<string[]> {
  const res = await request(cfg, `${repoPath(cfg)}/branches?per_page=100`);
  return ((await res.json()) as { name: string }[]).map((b) => b.name);
}

/** Returns null when the file does not exist. */
export async function getFile(cfg: GhConfig, path: string): Promise<{ sha: string; text: string } | null> {
  let res: Response;
  try {
    res = await request(cfg, `${repoPath(cfg)}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return null;
    throw e;
  }
  const json = (await res.json()) as { sha: string; content?: string; encoding?: string; size: number };
  if (Array.isArray(json)) throw new GitHubError(0, `${path} is a folder, expected a file.`);
  if (json.content) return { sha: json.sha, text: base64ToUtf8(json.content) };
  // Files > 1 MB come back without content: fetch the raw bytes instead
  const raw = await request(cfg, `${repoPath(cfg)}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: { Accept: 'application/vnd.github.raw+json' },
  });
  return { sha: json.sha, text: await raw.text() };
}

export async function putFile(cfg: GhConfig, path: string, contentBase64: string, message: string, sha?: string): Promise<{ sha: string }> {
  const attempt = async (useSha?: string) => {
    const res = await request(cfg, `${repoPath(cfg)}/contents/${encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ message, content: contentBase64, branch: cfg.branch, ...(useSha ? { sha: useSha } : {}) }),
    });
    const json = (await res.json()) as { content: { sha: string } };
    return { sha: json.content.sha };
  };
  // 409/422 means the file changed since we read its sha (or two commits hit the branch at once).
  // Re-read the current sha and retry a few times with a short pause.
  let useSha = sha;
  for (let i = 0; ; i++) {
    try {
      return await attempt(useSha);
    } catch (e) {
      const conflict = e instanceof GitHubError && (e.status === 409 || e.status === 422);
      if (!conflict || i >= 3) throw e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      const meta = await request(cfg, `${repoPath(cfg)}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`)
        .then((r) => r.json())
        .catch(() => null);
      useSha = (meta as { sha?: string } | null)?.sha;
    }
  }
}

export async function deleteFile(cfg: GhConfig, path: string, sha: string, message: string): Promise<void> {
  await request(cfg, `${repoPath(cfg)}/contents/${encodePath(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: cfg.branch }),
  });
}

/** Lists files in a folder. Missing folder returns []. */
export async function listDir(cfg: GhConfig, dir: string): Promise<GhFile[]> {
  try {
    const res = await request(cfg, `${repoPath(cfg)}/contents/${encodePath(dir)}?ref=${encodeURIComponent(cfg.branch)}`);
    const json = (await res.json()) as { type: string; name: string; path: string; sha: string; size: number }[];
    if (!Array.isArray(json)) return [];
    return json.filter((f) => f.type === 'file').map((f) => ({ name: f.name, path: f.path, sha: f.sha, size: f.size }));
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return [];
    throw e;
  }
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif' };

/** Authenticated image download (works for private repos and before the Pages deploy finishes). */
const blobCache = new Map<string, string>();
export async function getImageObjectUrl(cfg: GhConfig, repoFilePath: string): Promise<string> {
  const key = `${cfg.owner}/${cfg.repo}@${cfg.branch}:${repoFilePath}`;
  const hit = blobCache.get(key);
  if (hit) return hit;
  const res = await request(cfg, `${repoPath(cfg)}/contents/${encodePath(repoFilePath)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: { Accept: 'application/vnd.github.raw+json' },
  });
  const ext = repoFilePath.split('.').pop()?.toLowerCase() || '';
  const url = URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: MIME[ext] || 'application/octet-stream' }));
  blobCache.set(key, url);
  return url;
}
