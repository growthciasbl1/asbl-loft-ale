import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientKey, rateLimitHeaders } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ASBL Loft + reference anchors for Hyderabad commute comparisons.
 * Coordinates are [longitude, latitude] — ORS convention.
 */
const LOFT: [number, number] = [78.34123, 17.4246];
const GACHIBOWLI: [number, number] = [78.3489, 17.4401];
const KOKAPET: [number, number] = [78.3274, 17.4193];

/**
 * Hand-curated Hyderabad locality → commute times (minutes, ORR-corridor
 * realistic). OpenRouteService's OSM data routes via interior roads for
 * some localities and returns 30-50 min for places that are actually a
 * 12-15 min ORR drive. Hitting known localities takes priority over the
 * raw ORS matrix output.
 *
 * Keys are matched case-insensitively against the geocoded label +
 * locality + origin string — any hit swaps the ORS number for the
 * curated one. Distances (km) stay from ORS since those reflect actual
 * road geometry.
 */
const LOCALITY_COMMUTE_OVERRIDES: Record<
  string,
  { toLoft: number; toGachi: number; toKokapet: number }
> = {
  kondapur: { toLoft: 14, toGachi: 10, toKokapet: 18 },
  madhapur: { toLoft: 16, toGachi: 12, toKokapet: 20 },
  hitec: { toLoft: 15, toGachi: 11, toKokapet: 19 },
  'hitech city': { toLoft: 15, toGachi: 11, toKokapet: 19 },
  raidurg: { toLoft: 12, toGachi: 8, toKokapet: 16 },
  'nanakramguda': { toLoft: 4, toGachi: 6, toKokapet: 10 },
  gachibowli: { toLoft: 8, toGachi: 2, toKokapet: 14 },
  kokapet: { toLoft: 12, toGachi: 14, toKokapet: 2 },
  'jubilee hills': { toLoft: 22, toGachi: 18, toKokapet: 24 },
  'banjara hills': { toLoft: 26, toGachi: 22, toKokapet: 28 },
  begumpet: { toLoft: 32, toGachi: 28, toKokapet: 34 },
  ameerpet: { toLoft: 30, toGachi: 25, toKokapet: 32 },
  kukatpally: { toLoft: 28, toGachi: 22, toKokapet: 30 },
  secunderabad: { toLoft: 40, toGachi: 36, toKokapet: 42 },
  airport: { toLoft: 35, toGachi: 38, toKokapet: 32 },
  'rajiv gandhi international airport': { toLoft: 35, toGachi: 38, toKokapet: 32 },
  tolichowki: { toLoft: 18, toGachi: 14, toKokapet: 20 },
  manikonda: { toLoft: 10, toGachi: 12, toKokapet: 12 },
  nallagandla: { toLoft: 18, toGachi: 14, toKokapet: 22 },
  attapur: { toLoft: 20, toGachi: 22, toKokapet: 18 },
  khajaguda: { toLoft: 6, toGachi: 8, toKokapet: 10 },
  puppalguda: { toLoft: 10, toGachi: 12, toKokapet: 8 },
  narsingi: { toLoft: 14, toGachi: 16, toKokapet: 10 },
  mehdipatnam: { toLoft: 28, toGachi: 30, toKokapet: 26 },
};

function findLocalityOverride(
  origin: string,
  label: string | null,
  locality: string | null,
): { toLoft: number; toGachi: number; toKokapet: number } | null {
  const candidates = [origin, label, locality].filter(Boolean).map((s) => (s as string).toLowerCase());
  for (const key of Object.keys(LOCALITY_COMMUTE_OVERRIDES)) {
    for (const c of candidates) {
      if (c.includes(key)) return LOCALITY_COMMUTE_OVERRIDES[key];
    }
  }
  return null;
}

interface OrsGeocodeFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label?: string;
    name?: string;
    locality?: string;
    region?: string;
    country?: string;
  };
}

interface OrsGeocodeResponse {
  features: OrsGeocodeFeature[];
}

interface OrsMatrixResponse {
  durations?: number[][]; // seconds
  distances?: number[][]; // metres
}

async function geocode(apiKey: string, text: string): Promise<OrsGeocodeFeature | null> {
  const url = new URL('https://api.openrouteservice.org/geocode/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('text', text);
  url.searchParams.set('boundary.country', 'IN');
  // Bias toward Hyderabad metro area
  url.searchParams.set('focus.point.lat', '17.4246');
  url.searchParams.set('focus.point.lon', '78.3412');
  url.searchParams.set('size', '1');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as OrsGeocodeResponse;
    return data.features?.[0] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function matrix(
  apiKey: string,
  origin: [number, number],
  destinations: [number, number][],
): Promise<OrsMatrixResponse | null> {
  const locations = [origin, ...destinations];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations,
        sources: [0],
        destinations: destinations.map((_, i) => i + 1),
        metrics: ['duration', 'distance'],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as OrsMatrixResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function minFromSec(s: number | undefined | null): number | null {
  if (typeof s !== 'number' || !isFinite(s)) return null;
  return Math.max(1, Math.round(s / 60));
}

function kmFromM(m: number | undefined | null): number | null {
  if (typeof m !== 'number' || !isFinite(m)) return null;
  return Math.round(m / 100) / 10;
}

export async function POST(req: NextRequest) {
  // Rate limit: 500 commute lookups per minute per client. Loose cap;
  // ORS upstream has its own 40 RPM global limit which is what actually
  // protects us. This is just a runaway-loop guard.
  const rl = checkRateLimit('geo:distance', getClientKey(req), { maxRequests: 500, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
  try {
    const body = await req.json();
    const origin: string = typeof body?.origin === 'string' ? body.origin.trim() : '';
    if (!origin || origin.length < 2) {
      return NextResponse.json({ error: 'origin is required' }, { status: 400 });
    }

    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ORS_API_KEY missing', diag: 'Server is not configured for distance lookups.' },
        { status: 500 },
      );
    }

    // 1. Geocode origin string → lat/lng
    const hit = await geocode(apiKey, origin);
    if (!hit) {
      return NextResponse.json(
        {
          error: 'not_found',
          message: `Could not locate "${origin}" — try a more specific neighbourhood name.`,
        },
        { status: 404 },
      );
    }

    const [lng, lat] = hit.geometry.coordinates;
    const label = hit.properties.label ?? hit.properties.name ?? origin;

    // 2. Matrix: user → [Loft, Gachibowli, Kokapet]
    const mx = await matrix(apiKey, [lng, lat], [LOFT, GACHIBOWLI, KOKAPET]);

    if (!mx || !mx.durations || !mx.durations[0]) {
      return NextResponse.json(
        { error: 'routing_failed', message: 'Distance service is temporarily unavailable.' },
        { status: 502 },
      );
    }

    const [toLoftSec, toGachiSec, toKokapetSec] = mx.durations[0];
    const [toLoftM, toGachiM, toKokapetM] = mx.distances?.[0] ?? [null, null, null];

    // If we recognise the locality, override the ORS minutes with hand-
    // curated ORR-corridor times. ORS frequently routes via interior
    // roads for places like Kondapur and returns 40-50 min for a real
    // 12-15 min drive.
    const override = findLocalityOverride(
      origin,
      label ?? null,
      hit.properties.locality ?? null,
    );
    const toLoftMin = override ? override.toLoft : minFromSec(toLoftSec);
    const toGachibowliMin = override ? override.toGachi : minFromSec(toGachiSec);
    const toKokapetMin = override ? override.toKokapet : minFromSec(toKokapetSec);

    return NextResponse.json({
      ok: true,
      origin: { label, lat, lng, locality: hit.properties.locality ?? null },
      toLoftMin,
      toGachibowliMin,
      toKokapetMin,
      toLoftKm: kmFromM(toLoftM),
      toGachibowliKm: kmFromM(toGachiM),
      toKokapetKm: kmFromM(toKokapetM),
      overrideSource: override ? 'locality_table' : 'ors',
    });
  } catch (err) {
    console.error('[api/geo/distance] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'asbl-loft-geo-distance',
    provider: 'OpenRouteService',
  });
}
