import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzlookup = require('tz-lookup') as (lat: number, lng: number) => string;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resolve an IANA timezone from a lat/lng coordinate using the offline tz-lookup
 * dataset. Used by the booking flow so that when a visitor grants geolocation,
 * the confirmation shows the slot in the timezone implied by their physical
 * location rather than just their browser clock.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'valid lat and lng required' }, { status: 400 });
  }
  try {
    const timezone = tzlookup(lat, lng);
    return NextResponse.json({ timezone, lat, lng });
  } catch (err) {
    return NextResponse.json(
      { error: 'timezone lookup failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
