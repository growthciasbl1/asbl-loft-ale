'use client';

import { useAsk } from '../AskContext';

export function TileShell({
  eyebrow,
  title,
  sub,
  children,
  footer,
  askMore,
  relatedAsks,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  askMore?: { label: string; query: string };
  relatedAsks?: { label: string; query: string }[];
}) {
  const ask = useAsk();

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--hairline)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--paper-2)' }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--sienna)',
              fontWeight: 500,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div className="display" style={{ fontSize: 26, fontWeight: 400, marginTop: 6, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div>{children}</div>

      {relatedAsks && relatedAsks.length > 0 && (
        <div
          style={{
            padding: '14px 26px',
            borderTop: '1px solid var(--paper-2)',
            background: 'white',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--mute)',
              alignSelf: 'center',
              marginRight: 4,
            }}
          >
            Ask more
          </span>
          {relatedAsks.map((r) => (
            <button
              type="button"
              key={r.label}
              onClick={() => ask(r.query)}
              style={{
                padding: '6px 12px',
                borderRadius: 100,
                background: 'var(--paper)',
                border: '1px solid var(--hairline)',
                fontSize: 11.5,
                color: 'var(--ink-2)',
                fontWeight: 500,
                transition: 'all 160ms',
              }}
              className="hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {(footer || askMore) && (
        <div
          style={{
            padding: '14px 26px',
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.55 }}>{footer}</div>
          {askMore && (
            <button
              type="button"
              onClick={() => ask(askMore.query)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--sienna-dark)',
                whiteSpace: 'nowrap',
                background: 'transparent',
              }}
              className="hover:underline"
            >
              {askMore.label} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TileRow({
  label,
  value,
  note,
  highlight,
  right,
}: {
  label: string;
  value?: string;
  note?: string;
  highlight?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '14px 0',
        borderBottom: '1px solid var(--paper-2)',
        background: highlight ? 'var(--sienna-soft)' : 'transparent',
        marginLeft: highlight ? -26 : 0,
        marginRight: highlight ? -26 : 0,
        paddingLeft: highlight ? 26 : 0,
        paddingRight: highlight ? 26 : 0,
      }}
    >
      <div>
        <div style={{ fontSize: 14.5, color: 'var(--ink-2)', fontWeight: highlight ? 500 : 400 }}>
          {label}
        </div>
        {note && <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>{note}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        {right ?? (
          <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
