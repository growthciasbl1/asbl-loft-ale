'use client';

import { useState } from 'react';
import { TileShell } from './common';
import Lightbox from '../Lightbox';
import { track } from '@/lib/analytics/tracker';

type Category = 'Clubhouse' | 'Landscape' | 'Utility' | 'Security';

interface Amenity {
  label: string;
  category: Category;
  note?: string;
  /** One or more /asbl/amenities/*.webp paths. First is the card thumbnail,
   *  full set opens in the lightbox on click. Omit for text-only cards. */
  images?: string[];
}

// Full list per KB + three new landscape/clubhouse amenities we have renders
// for (Tower lobby, Themed garden, Multi-purpose plaza).
const AMENITIES: Amenity[] = [
  // Clubhouse
  {
    label: 'Swimming pool',
    category: 'Clubhouse',
    note: 'Clubhouse level',
    images: ['/asbl/amenities/pool.webp'],
  },
  {
    label: 'Gym & fitness',
    category: 'Clubhouse',
    note: 'Double-height',
    images: ['/asbl/amenities/gym-1.webp', '/asbl/amenities/gym-2.webp'],
  },
  {
    label: 'Yoga & calisthenics studio',
    category: 'Clubhouse',
    images: ['/asbl/amenities/yoga-1.webp', '/asbl/amenities/yoga-2.webp'],
  },
  {
    label: 'Squash court',
    category: 'Clubhouse',
    note: 'Regulation size',
    images: ['/asbl/amenities/squash.webp'],
  },
  {
    label: '3 badminton courts',
    category: 'Clubhouse',
    images: ['/asbl/amenities/badminton.webp'],
  },
  {
    label: 'Indoor games',
    category: 'Clubhouse',
    images: ['/asbl/amenities/indoor-games.webp'],
  },
  {
    label: 'Co-working space',
    category: 'Clubhouse',
    note: 'Meeting rooms',
    images: ['/asbl/amenities/coworking.webp'],
  },
  {
    label: 'Conference rooms',
    category: 'Clubhouse',
    images: ['/asbl/amenities/conference.webp'],
  },
  {
    label: 'Creche & learning centre',
    category: 'Clubhouse',
    images: ['/asbl/amenities/creche.webp'],
  },
  {
    label: 'Tuition centre',
    category: 'Clubhouse',
    images: ['/asbl/amenities/tuition.webp'],
  },
  {
    label: 'Hobby & art centre',
    category: 'Clubhouse',
    images: ['/asbl/amenities/hobby.webp'],
  },
  {
    label: 'Guest rooms',
    category: 'Clubhouse',
    images: ['/asbl/amenities/guest-rooms.webp'],
  },
  {
    label: 'Gents + ladies salon',
    category: 'Clubhouse',
    images: ['/asbl/amenities/salon.webp'],
  },
  {
    label: 'Tower lobby',
    category: 'Clubhouse',
    note: 'Double-height entry',
    images: ['/asbl/amenities/lobby.webp'],
  },

  // Landscape
  {
    label: 'Jogging & cycling loop',
    category: 'Landscape',
    images: ['/asbl/amenities/jogging.webp'],
  },
  {
    label: "Kids' play area",
    category: 'Landscape',
    note: 'Age-zoned · indoor + outdoor',
    images: ['/asbl/amenities/kids-outdoor.webp', '/asbl/amenities/kids-indoor.webp'],
  },
  {
    label: 'Themed garden',
    category: 'Landscape',
    note: 'Landscape zone',
    images: ['/asbl/amenities/garden.webp'],
  },
  {
    label: 'Multi-purpose plaza',
    category: 'Landscape',
    note: 'Events + gatherings',
    images: ['/asbl/amenities/plaza.webp'],
  },
  {
    label: 'Senior reflexology walk',
    category: 'Landscape',
    images: ['/asbl/amenities/reflexology.webp'],
  },
  {
    label: 'Pet park',
    category: 'Landscape',
    note: 'Fenced loop',
    images: ['/asbl/amenities/pet-park.webp'],
  },
  {
    label: 'Basketball court',
    category: 'Landscape',
    images: ['/asbl/amenities/basketball.webp'],
  },
  {
    label: 'Multi-sports turf',
    category: 'Landscape',
    images: ['/asbl/amenities/turf.webp'],
  },

  // Utility
  {
    label: 'EV charging',
    category: 'Utility',
    note: 'Basement level',
    images: ['/asbl/amenities/ev-charging.webp'],
  },
  {
    label: 'Solar + DG backup',
    category: 'Utility',
    note: '100% backup',
    images: ['/asbl/amenities/solar-dg.webp'],
  },
  { label: 'On-campus retail', category: 'Utility', note: 'Ratnadeep · ICICI' },

  // Security
  {
    label: '24/7 security & CCTV',
    category: 'Security',
    note: 'Gated community',
    images: ['/asbl/amenities/security.webp'],
  },
];

const CATEGORY_ORDER: Category[] = ['Clubhouse', 'Landscape', 'Utility', 'Security'];

// Section header image — generic clubhouse render.
const CLUBHOUSE_HERO = '/asbl/amenities/clubhouse-overview.webp';

export default function AmenityTile() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: AMENITIES.filter((a) => a.category === cat),
  }));

  // Flat list of all images used across amenities for the Lightbox navigator.
  // Clicking any image card opens Lightbox at that image's global index.
  const allImages: { src: string; label: string }[] = [];
  for (const a of AMENITIES) {
    if (a.images) {
      for (const img of a.images) {
        allImages.push({ src: img, label: a.label });
      }
    }
  }

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const openLightbox = (src: string, label: string) => {
    const idx = allImages.findIndex((i) => i.src === src);
    if (idx >= 0) {
      setLightboxIdx(idx);
      track('click', 'amenity_image_zoom', { label });
    }
  };

  return (
    <TileShell
      eyebrow={`${AMENITIES.length} amenities · all zones`}
      title="Lifestyle amenities"
      sub="Full clubhouse + landscape + utility + security grid."
      askMore={{
        label: 'See inside the clubhouse',
        query: 'Walk me through the clubhouse and podium amenities',
      }}
      relatedAsks={[
        { label: 'Schools nearby', query: 'What schools are within 12 minutes?' },
        { label: 'Commute time', query: 'How long to reach Loft from my place?' },
        { label: 'Book a visit', query: 'Book a site visit' },
      ]}
    >
      <div style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        {grouped.map((group) => (
          <div key={group.category}>
            {/* Section header — Clubhouse gets a hero image on top. */}
            {group.category === 'Clubhouse' && (
              <button
                type="button"
                onClick={() => openLightbox(CLUBHOUSE_HERO, 'Clubhouse')}
                style={{
                  width: '100%',
                  height: 200,
                  background: `url(${CLUBHOUSE_HERO}) center/cover no-repeat, var(--paper)`,
                  border: 'none',
                  borderBottom: '1px solid var(--hairline)',
                  cursor: 'pointer',
                  display: 'block',
                }}
                aria-label="Clubhouse overview"
              />
            )}
            <div style={{ padding: '18px 22px 4px' }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--plum-dark)',
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {group.category} · {group.items.length}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                {group.items.map((a) => {
                  const hasImage = a.images && a.images.length > 0;
                  const thumbnail = hasImage ? a.images![0] : undefined;

                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={
                        hasImage ? () => openLightbox(thumbnail!, a.label) : undefined
                      }
                      disabled={!hasImage}
                      style={{
                        padding: 0,
                        background: 'var(--paper)',
                        borderRadius: 10,
                        border: '1px solid var(--hairline)',
                        overflow: 'hidden',
                        textAlign: 'left',
                        cursor: hasImage ? 'pointer' : 'default',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {hasImage && (
                        <div
                          style={{
                            width: '100%',
                            height: 110,
                            background: `url(${thumbnail}) center/cover no-repeat, var(--paper-2)`,
                            position: 'relative',
                          }}
                        >
                          {a.images!.length > 1 && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                padding: '2px 8px',
                                borderRadius: 100,
                                background: 'rgba(0,0,0,0.55)',
                                color: 'white',
                                fontSize: 10,
                                fontWeight: 500,
                              }}
                            >
                              +{a.images!.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ padding: '10px 12px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {!hasImage && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--sienna)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 500,
                              color: 'var(--ink)',
                            }}
                          >
                            {a.label}
                          </div>
                        </div>
                        {a.note && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: 'var(--mute)',
                              marginTop: 3,
                              marginLeft: hasImage ? 0 : 14,
                            }}
                          >
                            {a.note}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Lightbox
        open={lightboxIdx != null}
        images={allImages}
        activeIndex={lightboxIdx ?? 0}
        onChange={setLightboxIdx}
        onClose={() => setLightboxIdx(null)}
      />
    </TileShell>
  );
}
