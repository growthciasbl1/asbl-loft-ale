'use client';

import { useEffect } from 'react';
import { getOrCreateVisitorId } from '@/lib/analytics/visitorId';

/**
 * Fires once per page mount on every route (homepage, /chat, /v/*).
 * Captures UTM params from the URL + referrer + landing path and POSTs to
 * /api/visitor/resolve so the visitors collection has full attribution
 * even for users who never fill a form.
 *
 * Runs fire-and-forget \u2014 never blocks page render. If Mongo / network
 * is down, we just lose that visit's attribution silently.
 *
 * Mounted in app/layout.tsx so it runs for EVERY page a visitor hits.
 */
export default function VisitorBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const visitorId = getOrCreateVisitorId();
    const params = new URLSearchParams(window.location.search);

    const pickParam = (k: string): string | null => {
      const v = params.get(k);
      return v && v.trim() ? v.trim() : null;
    };

    const utm = {
      source: pickParam('utm_source'),
      medium: pickParam('utm_medium'),
      campaign: pickParam('utm_campaign'),
      content: pickParam('utm_content'),
      term: pickParam('utm_term'),
    };

    const body = {
      visitorId,
      utm,
      referrer: document.referrer || null,
      landingPath: window.location.pathname + window.location.search,
    };

    fetch('/api/visitor/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true, // survive page unload
    }).catch(() => {
      // Fire-and-forget — attribution failure must not break UX
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
