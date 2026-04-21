'use client';

interface Props {
  hidden?: boolean;
}

export default function ReraWidget({ hidden = false }: Props) {
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
