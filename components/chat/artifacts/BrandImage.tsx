'use client';

import { useState } from 'react';

interface Props {
  /** Primary image URL, or array of candidates tried in order. */
  src: string | string[];
  alt: string;
  fallback: React.ReactNode;
  bg?: string;
  aspectRatio?: string;
  maxWidth?: number;
}

/**
 * Loads the first `src` that succeeds. If all candidates 404/error, renders the SVG `fallback`.
 * Means we can ship tiles with multiple possible filenames (png / webp / brochure page) and
 * pick up whichever the content team dropped in `public/asbl/`.
 */
export default function BrandImage({ src, alt, fallback, bg = 'var(--paper-2)', aspectRatio, maxWidth }: Props) {
  const candidates = Array.isArray(src) ? src : [src];
  const [attempt, setAttempt] = useState(0);
  const [fullyFailed, setFullyFailed] = useState(false);

  if (fullyFailed) return <>{fallback}</>;

  const current = candidates[attempt];

  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--hairline)',
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(maxWidth ? { maxWidth } : {}),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={alt}
        onError={() => {
          if (attempt + 1 < candidates.length) {
            setAttempt(attempt + 1);
          } else {
            setFullyFailed(true);
          }
        }}
        style={{
          width: '100%',
          height: aspectRatio ? '100%' : 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
