import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ASBL Loft + reference anchors for Hyderabad commute comparisons.
 * Coordinates are [longitude, latitude] — ORS convention.
 */
const LOFT: [number, number] = [78.34123, 17.4246];
const GACHIBOWLI: [number, number] = [78.3489, 17.4401];
const KOKAPET: [number, number] = [78.3274, 17.4193];

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

    return NextResponse.json({
      ok: true,
      origin: { label, lat, lng, locality: hit.properties.locality ?? null },
      toLoftMin: minFromSec(toLoftSec),
      toGachibowliMin: minFromSec(toGachiSec),
      toKokapetMin: minFromSec(toKokapetSec),
      toLoftKm: kmFromM(toLoftM),
      toGachibowliKm: kmFromM(toGachiM),
      toKokapetKm: kmFromM(toKokapetM),
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
