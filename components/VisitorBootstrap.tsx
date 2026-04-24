'use client';

import { useEffect } from 'react';
import { getOrCreateVisitorId } from '@/lib/analytics/visitorId';
import { requestGeolocation } from '@/lib/utils/booking';
import { track } from '@/lib/analytics/tracker';

const GEO_CACHE_KEY = 'asbl_geo';
const GEO_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — fresh enough

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

    // ─── Geolocation — best-effort, per-session prompt ───
    // Business wants every visitor's location. Browser prompts once, we
    // cache the permission grant in localStorage for 24h so we don't
    // re-ask on every page. Works on Chrome/Firefox/Edge without a user
    // gesture (Safari sometimes blocks — we fall back to lat/lng 0).
    try {
      const cached = window.localStorage.getItem(GEO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          lat: number;
          lng: number;
          accuracy: number;
          at: number;
        };
        if (Date.now() - parsed.at < GEO_CACHE_MAX_AGE_MS) {
          // Cache still fresh — skip re-prompting.
          track('view', 'geo_cached_hit', { age_hours: ((Date.now() - parsed.at) / 3600000).toFixed(1) });
          return;
        }
      }
    } catch {
      // ignore
    }

    // Small delay so the geolocation prompt doesn't fight with page paint
    const geoTimer = window.setTimeout(() => {
      requestGeolocation(12000)
        .then((pos) => {
          if (!pos) {
            track('view', 'geo_denied_or_timeout');
            return;
          }
          track('view', 'geo_granted', { accuracy: pos.accuracy, via: 'bootstrap' });
          try {
            window.localStorage.setItem(
              GEO_CACHE_KEY,
              JSON.stringify({
                lat: pos.lat,
                lng: pos.lng,
                accuracy: pos.accuracy,
                at: Date.now(),
              }),
            );
          } catch {
            // localStorage disabled — ignore
          }
          // Any form that submits (LeadGate / VisitTile / ShareRequestTile)
          // reads asbl_geo from localStorage and attaches it to the webhook
          // payload — so even if the visitor never opens the Visit tile,
          // their geo lands in Zoho alongside the first form they submit.
        })
        .catch(() => {
          // ignore
        });
    }, 800);

    return () => window.clearTimeout(geoTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
