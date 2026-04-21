'use client';

import { useEffect } from 'react';

export interface LightboxImage {
  src: string;
  label: string;
}

interface Props {
  open: boolean;
  images: LightboxImage[];
  activeIndex: number;
  onChange: (i: number) => void;
  onClose: () => void;
}

export default function Lightbox({ open, images, activeIndex, onChange, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onChange(Math.max(0, activeIndex - 1));
      if (e.key === 'ArrowRight') onChange(Math.min(images.length - 1, activeIndex + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, activeIndex, images.length, onChange, onClose]);

  if (!open) return null;
  const active = images[activeIndex];
  if (!active) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 13,
          transition: 'background 180ms ease',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)')}
      >
        ← Back to chat
      </button>

      <div
        style={{
          position: 'absolute',
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {active.label}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={active.src}
        alt={active.label}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: 8,
        }}
      />

      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              aria-label={`Go to image ${i + 1}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: 0,
                transition: 'background 180ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
