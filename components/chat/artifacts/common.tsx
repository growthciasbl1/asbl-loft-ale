'use client';

import { useAsk } from '../AskContext';

interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  askMore?: { label: string; query: string };
  relatedAsks?: { label: string; query: string }[];
}

export function TileShell({ eyebrow, title, sub, icon, children, footer, askMore, relatedAsks }: Props) {
  const ask = useAsk();

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Card header — topic icon + title */}
      <div
        className="asbl-tile-head"
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {icon ?? <DefaultIcon />}
        <div>
          {eyebrow && (
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.13em',
                color: 'var(--plum)',
                fontWeight: 500,
                marginBottom: 2,
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            className="serif"
            style={{ fontSize: 16, color: 'var(--charcoal)', fontWeight: 500, lineHeight: 1.3 }}
          >
            {title}
          </div>
          {sub && (
            <div style={{ fontSize: 11.5, color: 'var(--mid-gray)', marginTop: 2 }}>{sub}</div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="asbl-tile-body" style={{ padding: '10px 18px 16px' }}>
        {children}
      </div>

      {/* Related-ask chips (plum follow-ups) */}
      {relatedAsks && relatedAsks.length > 0 && (
        <div
          className="asbl-tile-followups"
          style={{
            padding: '12px 18px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7,
          }}
        >
          {relatedAsks.map((r) => (
            <button
              type="button"
              key={r.label}
              onClick={() => ask(r.query)}
              className="chip-followup"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Footer / ask-more link */}
      {(footer || askMore) && (
        <div
          className="asbl-tile-footer"
          style={{
            padding: '12px 18px',
            background: 'var(--beige)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 10.5, color: 'var(--mid-gray)', lineHeight: 1.5 }}>{footer}</div>
          {askMore && (
            <button
              type="button"
              onClick={() => ask(askMore.query)}
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--plum-dark)',
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

function DefaultIcon() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: 'var(--plum-pale)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5}>
        <circle cx={12} cy={12} r={9} />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function TileIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: 'var(--plum-pale)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
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
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        background: highlight ? 'var(--plum-pale)' : 'transparent',
        marginLeft: highlight ? -18 : 0,
        marginRight: highlight ? -18 : 0,
        paddingLeft: highlight ? 18 : 0,
        paddingRight: highlight ? 18 : 0,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13.5,
            color: highlight ? 'var(--charcoal)' : 'var(--gray-2)',
            fontWeight: highlight ? 500 : 400,
          }}
        >
          {label}
        </div>
        {note && <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 1 }}>{note}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        {right ?? (
          <div
            className="serif"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: highlight ? 'var(--plum-dark)' : 'var(--charcoal)',
            }}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
