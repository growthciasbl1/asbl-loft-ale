'use client';

import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  fallback: React.ReactNode;
  bg?: string;
  aspectRatio?: string;
  maxWidth?: number;
}

/**
 * Shows `src` if it loads; otherwise renders `fallback` (an SVG schematic).
 * Lets us ship a brand PNG whenever it's dropped into public/asbl/ without
 * breaking the product if it's missing.
 */
export default function BrandImage({
  src,
  alt,
  fallback,
  bg = 'var(--paper-2)',
  aspectRatio,
  maxWidth,
}: Props) {
  const [error, setError] = useState(false);

  if (error) return <>{fallback}</>;

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
        src={src}
        alt={alt}
        onError={() => setError(true)}
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
