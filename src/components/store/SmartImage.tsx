import { useEffect, useState, type CSSProperties } from 'react';
import { ImageOff } from 'lucide-react';
import { resolveImg } from '@/lib/images';
import { getGhConfig, getImageObjectUrl } from '@/lib/github';
import { cn } from '@/lib/utils';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fit?: 'cover' | 'contain';
  eager?: boolean;
  /** GitHub "owner/repo@branch" hint (public) used before the Pages deploy has finished */
  repoHint?: { owner: string; name: string; branch: string };
}

/**
 * Image with a loading shimmer and a fallback chain:
 *  1. the deployed asset,
 *  2. (admins) the file straight from the repository through the GitHub API,
 *  3. raw.githubusercontent.com (public repositories, before the deploy completes),
 *  4. a neutral placeholder.
 */
export default function SmartImage({ src, alt, className, style, fit = 'cover', eager, repoHint }: Props) {
  const resolved = resolveImg(src);
  const [current, setCurrent] = useState(resolved);
  const [stage, setStage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!resolved);

  useEffect(() => {
    setCurrent(resolved);
    setStage(0);
    setLoaded(false);
    setFailed(!resolved);
  }, [resolved]);

  const repoPath = src && /^assets\//.test(src) ? `public/${src}` : '';

  const onError = async () => {
    if (!repoPath) return setFailed(true);
    if (stage === 0) {
      setStage(1);
      const cfg = getGhConfig();
      if (cfg) {
        try {
          setCurrent(await getImageObjectUrl(cfg, repoPath));
          return;
        } catch {
          /* fall through to raw URL */
        }
      }
    }
    if (stage <= 1 && repoHint?.owner) {
      setStage(2);
      setCurrent(`https://raw.githubusercontent.com/${repoHint.owner}/${repoHint.name}/${repoHint.branch}/${repoPath}`);
      return;
    }
    setFailed(true);
  };

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center bg-black/5 text-black/25', className)} style={style} role="img" aria-label={alt}>
        <ImageOff size={28} />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', !loaded && 'sm-shimmer', className)} style={style}>
      <img
        src={current}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onError}
        className={cn('h-full w-full transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
        style={{ objectFit: fit }}
      />
    </div>
  );
}
