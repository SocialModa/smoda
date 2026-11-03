import { useCallback, useReducer, useRef } from 'react';

/**
 * Undo / redo state. Rapid edits with the same `key` (dragging a slider, typing in one field)
 * collapse into a single history step so Undo feels natural.
 */
export function useHistory<T>(initial: T) {
  const ref = useRef<{ past: T[]; present: T; future: T[] }>({ past: [], present: initial, future: [] });
  const last = useRef<{ key: string; t: number } | null>(null);
  const [, force] = useReducer((n: number) => n + 1, 0);

  const set = useCallback((next: T | ((prev: T) => T), key?: string) => {
    const s = ref.current;
    const value = typeof next === 'function' ? (next as (prev: T) => T)(s.present) : next;
    if (Object.is(value, s.present)) return;
    const now = Date.now();
    const coalesce = !!key && !!last.current && last.current.key === key && now - last.current.t < 900;
    last.current = key ? { key, t: now } : null;
    ref.current = coalesce
      ? { past: s.past, present: value, future: [] }
      : { past: [...s.past, s.present].slice(-100), present: value, future: [] };
    force();
  }, []);

  const undo = useCallback(() => {
    const s = ref.current;
    if (!s.past.length) return;
    last.current = null;
    ref.current = { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] };
    force();
  }, []);

  const redo = useCallback(() => {
    const s = ref.current;
    if (!s.future.length) return;
    last.current = null;
    ref.current = { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
    force();
  }, []);

  /** Replace the present value and forget the history (after publishing). */
  const reset = useCallback((value: T) => {
    last.current = null;
    ref.current = { past: [], present: value, future: [] };
    force();
  }, []);

  const s = ref.current;
  return { value: s.present, set, undo, redo, reset, canUndo: s.past.length > 0, canRedo: s.future.length > 0 };
}
