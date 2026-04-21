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
 * Uses the React-recommended "reset state during render when props change" pattern so that
 * switching from a missing-image plan (fullyFailed=true) back to a present-image plan
 * immediately re-tries candidates instead of sticking on the old "coming soon" state.
 */
export default function BrandImage({
  src,
  alt,
  fallback,
  bg = 'var(--paper-2)',
  aspectRatio,
  maxWidth,
}: Props) {
  const candidates = Array.isArray(src) ? src : [src];
  const key = candidates.join('|');

  const [state, setState] = useState<{ key: string; attempt: number; fullyFailed: boolean }>({
    key,
    attempt: 0,
    fullyFailed: false,
  });

  // React-recommended pattern: adjust state during render when the derived key changes.
  // React will immediately re-render with the updated state, before committing to DOM.
  if (state.key !== key) {
    setState({ key, attempt: 0, fullyFailed: false });
    return null;
  }

  if (state.fullyFailed) return <>{fallback}</>;

  const current = candidates[state.attempt];

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
        key={current}
        src={current}
        alt={alt}
        onError={() =>
          setState((s) => {
            if (s.attempt + 1 < candidates.length) {
              return { ...s, attempt: s.attempt + 1 };
            }
            return { ...s, fullyFailed: true };
          })
        }
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
