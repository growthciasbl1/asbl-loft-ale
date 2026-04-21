export type MediaKind = 'image' | 'video' | 'pdf' | 'embed' | 'audio';
export type IntentTag =
  | 'price'
  | 'yield'
  | 'rental-market'
  | 'amenity'
  | 'lifestyle'
  | 'school'
  | 'commute'
  | 'floor-plan'
  | 'unit-detail'
  | 'exterior'
  | 'interior'
  | 'aerial'
  | 'construction-update'
  | 'why-fd'
  | 'trends';

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  caption?: string;
  src: string;
  posterSrc?: string;
  aspect?: string;
  intentTags: IntentTag[];
  audienceTags?: ('investor' | 'family' | 'luxury' | 'budget' | 'nri')[];
  leadGated?: boolean;
  trigger?: string;
}

export const MEDIA_LIBRARY: MediaItem[] = [
  {
    id: 'aerial-dusk',
    kind: 'image',
    title: 'ASBL Loft at dusk',
    caption: 'Aerial, looking north from Nanakramguda ORR exit',
    src: '/media/aerial-dusk.jpg',
    aspect: '16/9',
    intentTags: ['exterior', 'aerial', 'why-fd'],
  },
  {
    id: 'balcony-east-1870',
    kind: 'image',
    title: '260 sqft east-facing balcony · 1,870 variant',
    caption: 'Morning, mirrored unit on floor 38',
    src: '/media/balcony-east-1870.jpg',
    aspect: '4/3',
    intentTags: ['interior', 'unit-detail', 'lifestyle'],
    audienceTags: ['luxury', 'family'],
  },
  {
    id: 'living-east-1695',
    kind: 'image',
    title: 'Living room · 1,695 East · floor 28',
    src: '/media/living-east-1695.jpg',
    aspect: '3/2',
    intentTags: ['interior', 'floor-plan'],
  },
  {
    id: 'clubhouse-pool',
    kind: 'video',
    title: 'Sky pool · level 45',
    caption: '0:45 flythrough of the infinity edge',
    src: '/media/sky-pool.mp4',
    posterSrc: '/media/sky-pool-poster.jpg',
    aspect: '16/9',
    intentTags: ['amenity', 'lifestyle'],
    audienceTags: ['luxury', 'family'],
  },
  {
    id: 'construction-dec-latest',
    kind: 'image',
    title: 'Construction update · this month',
    caption: 'Tower A · slab 43 · facade glazing in progress',
    src: '/media/construction-latest.jpg',
    aspect: '3/2',
    intentTags: ['construction-update', 'exterior'],
    audienceTags: ['nri'],
  },
  {
    id: 'price-sheet-pdf',
    kind: 'pdf',
    title: 'Full unit-wise price sheet',
    caption: '228 units · all-in pricing · Q2 2026',
    src: '/media/price-sheet.pdf',
    intentTags: ['price'],
    leadGated: true,
  },
  {
    id: 'floor-plan-1695-pdf',
    kind: 'pdf',
    title: '1,695 sqft · high-res floor plan',
    src: '/media/floor-plan-1695.pdf',
    intentTags: ['floor-plan', 'unit-detail'],
    leadGated: true,
  },
  {
    id: 'floor-plan-1870-pdf',
    kind: 'pdf',
    title: '1,870 sqft · high-res floor plan',
    src: '/media/floor-plan-1870.pdf',
    intentTags: ['floor-plan', 'unit-detail'],
    leadGated: true,
  },
  {
    id: 'virtual-tour-1870',
    kind: 'embed',
    title: 'Virtual walk-through · 1,870 East',
    caption: 'Coohome 3D · use WASD to move',
    src: 'https://example.com/tour/loft-1870',
    aspect: '16/9',
    intentTags: ['unit-detail', 'interior'],
    audienceTags: ['nri'],
    leadGated: true,
  },
  {
    id: 'rental-trend-chart',
    kind: 'image',
    title: 'FD rent trajectory · 2020–2026e',
    caption: '3BHK leased comps, Magicbricks + NoBroker',
    src: '/media/rental-trend.png',
    aspect: '16/9',
    intentTags: ['yield', 'rental-market', 'trends'],
    audienceTags: ['investor'],
  },
  {
    id: 'school-radius-map',
    kind: 'image',
    title: '12-minute school radius',
    caption: 'Delhi Public, Oakridge, Chirec, Gaudium, Meridian, Glendale',
    src: '/media/schools-map.png',
    aspect: '3/2',
    intentTags: ['school', 'commute'],
    audienceTags: ['family'],
  },
  {
    id: 'kitchen-detail',
    kind: 'image',
    title: 'Kitchen pre-install · dishwasher + hood line',
    src: '/media/kitchen.jpg',
    aspect: '4/3',
    intentTags: ['interior', 'unit-detail'],
  },
  {
    id: 'sunrise-unit-reel',
    kind: 'video',
    title: 'Mornings at Loft · Instagram reel',
    src: '/media/mornings-reel.mp4',
    posterSrc: '/media/mornings-poster.jpg',
    aspect: '9/16',
    intentTags: ['lifestyle', 'interior'],
    audienceTags: ['family'],
  },
];

export interface MediaPickContext {
  intent: IntentTag | IntentTag[];
  audience?: ('investor' | 'family' | 'luxury' | 'budget' | 'nri')[];
  gated?: boolean;
  limit?: number;
}

export function pickMedia(ctx: MediaPickContext): MediaItem[] {
  const intents = Array.isArray(ctx.intent) ? ctx.intent : [ctx.intent];
  const limit = ctx.limit ?? 3;

  const scored = MEDIA_LIBRARY.map((m) => {
    const intentHit = m.intentTags.filter((t) => intents.includes(t)).length;
    if (intentHit === 0) return { m, score: -1 };
    let score = intentHit * 10;
    if (ctx.audience && m.audienceTags) {
      const audienceHit = m.audienceTags.filter((a) => ctx.audience!.includes(a)).length;
      score += audienceHit * 4;
    }
    if (ctx.gated === false && m.leadGated) score -= 50;
    return { m, score };
  });

  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.m);
}
