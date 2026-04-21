'use client';

import { useEffect, useRef, useState } from 'react';
import Lightbox from './Lightbox';
import { track } from '@/lib/analytics/tracker';

export interface PlanSlide {
  key: string;
  img: string;
  label: string;
  sub: string;
}

interface Props {
  slides: PlanSlide[];
  autoPlayMs?: number;
}

type SlideState = 'active' | 'exiting' | 'entering' | 'idle';

export default function FloorPlanCarousel({ slides, autoPlayMs = 3000 }: Props) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const timer = useRef<number | null>(null);

  const go = (next: number) => {
    const n = ((next % slides.length) + slides.length) % slides.length;
    if (n === active) return;
    setPrev(active);
    setActive(n);
  };

  const resetTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => go(active + 1), autoPlayMs);
  };

  useEffect(() => {
    const start = window.setTimeout(() => resetTimer(), 400);
    return () => {
      window.clearTimeout(start);
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const slideState = (i: number): SlideState => {
    if (i === active) return 'active';
    if (i === prev) return 'exiting';
    return 'entering';
  };

  const transform = (s: SlideState) => {
    switch (s) {
      case 'active':
        return 'translateX(0) scale(1)';
      case 'exiting':
        return 'translateX(-100%) scale(0.82)';
      default:
        return 'translateX(100%) scale(0.82)';
    }
  };

  const filter = (s: SlideState) => (s === 'active' ? 'none' : 'blur(3px)');
  const opacity = (s: SlideState) => (s === 'active' ? 1 : 0.5);
  const z = (s: SlideState) => (s === 'active' ? 2 : s === 'exiting' ? 1 : 0);

  const current = slides[active];

  return (
    <>
      <div
        className="asbl-carousel-frame"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 12,
          height: 260,
          background: 'var(--beige)',
          margin: '0 18px',
        }}
      >
        {slides.map((s, i) => {
          const st = slideState(i);
          return (
            <div
              key={s.key}
              style={{
                position: 'absolute',
                inset: 0,
                transition: 'transform 1200ms cubic-bezier(0.4,0,0.2,1), filter 1200ms cubic-bezier(0.4,0,0.2,1), opacity 1200ms cubic-bezier(0.4,0,0.2,1)',
                transform: transform(st),
                filter: filter(st),
                opacity: opacity(st),
                zIndex: z(st),
              }}
            >
              <div
                className="asbl-carousel-image-area"
                style={{
                  width: '100%',
                  height: 215,
                  background: '#fff',
                  cursor: 'zoom-in',
                }}
                onClick={() => {
                  track('click', 'carousel_image_zoom', { plan: s.key, via: 'image' });
                  setLightbox(true);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.img}
                  alt={s.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
              <div
                style={{
                  background: '#fff',
                  borderTop: '1px solid var(--border)',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  height: 45,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--charcoal)' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--mid-gray)', marginTop: 1 }}>
                    {s.sub}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    track('click', 'carousel_image_zoom', { plan: s.key, via: 'button' });
                    setLightbox(true);
                  }}
                  style={{
                    background: 'var(--plum)',
                    color: '#fff',
                    fontSize: 11,
                    borderRadius: 8,
                    padding: '5px 11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx={11} cy={11} r={7} />
                    <path strokeLinecap="round" d="m21 21-4.3-4.3" />
                  </svg>
                  Zoom
                </button>
              </div>
            </div>
          );
        })}

        {/* Arrow navigation */}
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            right: 12,
            display: 'flex',
            gap: 6,
            zIndex: 3,
          }}
        >
          {[
            { dir: -1, d: 'M15 6l-6 6 6 6' },
            { dir: 1, d: 'M9 6l6 6-6 6' },
          ].map((a, i) => (
            <button
              key={i}
              onClick={() => {
                track('click', 'carousel_nav', {
                  direction: a.dir === -1 ? 'prev' : 'next',
                  via: 'arrow',
                });
                go(active + a.dir);
              }}
              aria-label={a.dir === -1 ? 'Previous' : 'Next'}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 180ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--plum-pale)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--plum-border)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.9)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--charcoal)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={a.d} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          padding: '8px 18px',
          background: '#fff',
        }}
      >
        {slides.map((s, i) => (
          <button
            key={s.key}
            onClick={() => {
              track('click', 'carousel_nav', { target: s.key, via: 'dot' });
              go(i);
            }}
            aria-label={`Go to ${s.label}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: i === active ? 'var(--plum)' : 'var(--light-gray)',
              transform: i === active ? 'scale(1.3)' : 'scale(1)',
              transition: 'all 200ms ease',
              padding: 0,
            }}
          />
        ))}
      </div>

      <Lightbox
        open={lightbox}
        images={slides.map((s) => ({ src: s.img, label: s.label.toUpperCase() }))}
        activeIndex={active}
        onChange={go}
        onClose={() => setLightbox(false)}
      />
    </>
  );
}
