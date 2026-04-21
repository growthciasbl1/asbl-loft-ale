'use client';

import { useEffect, useState } from 'react';

interface Props {
  hidden?: boolean;
}

/**
 * Desktop: fixed top-right, 256px wide.
 * Mobile (< 900px): hidden entirely — page puts a compact RERA line in its own footer instead.
 */
export default function ReraWidget({ hidden = false }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 78,
        right: '1.75rem',
        width: 256,
        zIndex: 200,
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(-8px)' : 'translateY(0)',
        pointerEvents: hidden ? 'none' : 'auto',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/rera.webp"
        alt="TS RERA Certified · P02400006761"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}
