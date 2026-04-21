'use client';

import { useEffect, useRef } from 'react';
import { track } from './tracker';

/**
 * Fires a `view` event on mount and a `read` event once the element has been
 * intersecting the viewport for `readMs` (default 1200ms).
 *
 * Use on artifact tiles so we know both "was rendered" (cheap) and "was actually seen".
 */
export function useTrackView(
  name: string,
  props?: Record<string, unknown>,
  opts: { readMs?: number; threshold?: number } = {}
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const fired = useRef<{ view: boolean; read: boolean }>({ view: false, read: false });

  useEffect(() => {
    if (!fired.current.view) {
      fired.current.view = true;
      track('view', name, props);
    }
  }, [name, props]);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current.read) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const readMs = opts.readMs ?? 1200;
    const threshold = opts.threshold ?? 0.5;
    let timer: number | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            if (timer == null) {
              timer = window.setTimeout(() => {
                if (!fired.current.read) {
                  fired.current.read = true;
                  track('read', name, props);
                  io.disconnect();
                }
              }, readMs);
            }
          } else if (timer != null) {
            window.clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [name, props, opts.readMs, opts.threshold]);

  return ref;
}
