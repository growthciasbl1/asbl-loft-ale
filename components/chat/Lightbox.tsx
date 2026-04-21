'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

/**
 * Renders via createPortal → document.body so it escapes any ancestor with
 * a `transform` or `filter` which would otherwise make `position: fixed`
 * positioned relative to that ancestor instead of the viewport. This was
 * the cause of the "lightbox opening inside the card" bug.
 */
export default function Lightbox({ open, images, activeIndex, onChange, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onChange(Math.max(0, activeIndex - 1));
      if (e.key === 'ArrowRight') onChange(Math.min(images.length - 1, activeIndex + 1));
    };
    window.addEventListener('keydown', onKey);
    // Prevent body scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, activeIndex, images.length, onChange, onClose]);

  if (!open || !mounted) return null;
  const active = images[activeIndex];
  if (!active) return null;

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        background: 'rgba(0, 0, 0, 0.94)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'env(safe-area-inset-top, 1rem) 1rem env(safe-area-inset-bottom, 1rem)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 16,
          background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.22)',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: 20,
          fontSize: 13,
          transition: 'background 180ms ease',
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        ← Back to chat
      </button>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 'max(22px, calc(env(safe-area-inset-top) + 6px))',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          maxWidth: 'calc(100vw - 240px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {active.label}
      </div>

      {/* Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '94vw',
          maxHeight: 'calc(100vh - 160px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.src}
          alt={active.label}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 8,
            display: 'block',
          }}
        />
      </div>

      {/* Dot navigation */}
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
                cursor: 'pointer',
                transition: 'background 180ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
