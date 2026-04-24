'use client';

import { TileShell } from './common';
import { useAsk } from '../AskContext';
import { ASBL_LOFT_DATA, UNIT_LAYOUTS } from '@/lib/utils/asblData';
import { useChatStore } from '@/lib/store/chatStore';
import { track } from '@/lib/analytics/tracker';

interface Props {
  unitId: string;
}

export default function UnitDetailTile({ unitId }: Props) {
  const unit = ASBL_LOFT_DATA.units.find((u) => u.id === unitId);
  const togglePin = useChatStore((s) => s.togglePin);
  const pinned = useChatStore((s) => s.pinnedUnitIds.includes(unitId));
  const ask = useAsk();

  if (!unit) {
    return (
      <TileShell title={`Unit ${unitId}`} sub="Not found in live inventory.">
        <div style={{ padding: 26, color: 'var(--mute)' }}>
          That unit doesn&apos;t match our current feed. Ask me for live inventory to see what&apos;s open.
        </div>
      </TileShell>
    );
  }

  const layout = UNIT_LAYOUTS[unit.size];

  return (
    <TileShell
      eyebrow={unit.available ? 'Available · can be pinned' : 'Held · join waitlist'}
      title={`Residence ${unit.id}`}
      sub={`Tower ${unit.tower} · Floor ${unit.floor} · ${unit.facing} facing · ${unit.size.toLocaleString()} sqft`}
      footer={
        <>
          Base pricing shown. GST 5% and registration extra. Handover December 2026. TS RERA
          P02400006761.
        </>
      }
      askMore={{ label: 'Compare yield with other units', query: `Compare yield of ${unit.id} with similar units` }}
      relatedAsks={[
        { label: 'Can I afford it?', query: `Check if I can afford ${unit.id} on 30L salary` },
        { label: 'Payment plan', query: 'Show me the payment schedule' },
        { label: 'Book a visit', query: `Book a visit to see ${unit.id}` },
      ]}
    >
      {/* Key stats strip */}
      <div
        style={{
          padding: '20px 26px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          background: 'var(--paper)',
          borderBottom: '1px solid var(--paper-2)',
        }}
      >
        <Stat label="Base price" value={`₹${(unit.basePrice / 10000000).toFixed(2)}Cr`} note="Pre-GST" />
        <Stat label="All-in" value={`₹${(unit.totalPrice / 10000000).toFixed(2)}Cr`} note="Incl. GST" highlight />
        <Stat label="Expected rent" value={`₹${Math.round(unit.expectedRental / 1000)}K/mo`} note="Conservative" />
        <Stat label="Gross yield" value={`${unit.roiPercentage.toFixed(2)}%`} note="Against all-in" />
      </div>

      {/* Balcony callout */}
      <div style={{ padding: '18px 26px', borderBottom: '1px solid var(--paper-2)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '14px 16px',
            background: 'var(--sienna-soft)',
            borderRadius: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--sienna-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontWeight: 500,
              }}
            >
              Outdoor space
            </div>
            <div className="display" style={{ fontSize: 22, marginTop: 2 }}>
              {layout.balcony.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
              {layout.balcony.note}
            </div>
          </div>
          <div
            className="mono"
            style={{ fontSize: 30, color: 'var(--sienna-dark)', fontWeight: 500 }}
          >
            {layout.balcony.sqft}
            <span style={{ fontSize: 12, color: 'var(--mute)', marginLeft: 4 }}>sqft</span>
          </div>
        </div>
      </div>

      {/* Room dimensions */}
      <div style={{ padding: '18px 26px 6px' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--mute)',
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          Room by room
        </div>
      </div>
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {layout.rooms.map((r) => (
              <tr key={r.name}>
                <td style={{ padding: '10px 26px', fontSize: 13.5, color: 'var(--ink)' }}>
                  {r.name}
                  {r.note && (
                    <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 1 }}>
                      {r.note}
                    </div>
                  )}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: '10px 26px',
                    fontSize: 12.5,
                    color: 'var(--sienna-dark)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.ft}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: '10px 26px',
                    fontSize: 11.5,
                    color: 'var(--mute)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.sqft} sqft
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '18px 26px',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          borderTop: '1px solid var(--paper-2)',
        }}
      >
        <button
          onClick={() => {
            track('click', 'unit_pin_toggle', { unitId: unit.id, pinned: !pinned });
            togglePin(unit.id);
          }}
          style={{
            padding: '10px 18px',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 500,
            background: pinned ? 'var(--sienna-dark)' : 'white',
            color: pinned ? 'white' : 'var(--ink)',
            border: '1px solid ' + (pinned ? 'var(--sienna-dark)' : 'var(--hairline)'),
          }}
        >
          {pinned ? '★ Pinned' : '☆ Pin this residence'}
        </button>
        <button
          type="button"
          onClick={() => {
            track('click', 'unit_compare_yield', { unitId: unit.id });
            ask(`Compare ${unit.id} yield with similar units in the same floor band`);
          }}
          style={{
            padding: '10px 18px',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 500,
            background: 'white',
            color: 'var(--ink)',
            border: '1px solid var(--hairline)',
          }}
        >
          Compare yield with similar units
        </button>
        <button
          type="button"
          onClick={() => {
            track('click', 'unit_book_visit', { unitId: unit.id });
            ask(`Book a visit to see ${unit.id}`);
          }}
          style={{
            padding: '10px 18px',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 500,
            background: 'var(--ink)',
            color: 'white',
          }}
        >
          Book a visit →
        </button>
      </div>
    </TileShell>
  );
}

function Stat({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: highlight ? 'white' : 'transparent',
        borderRadius: 10,
        border: highlight ? '1px solid var(--sienna)' : '1px solid transparent',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--mute)',
        }}
      >
        {label}
      </div>
      <div
        className="display"
        style={{
          fontSize: 22,
          lineHeight: 1.1,
          marginTop: 4,
          color: highlight ? 'var(--sienna-dark)' : 'var(--ink)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{note}</div>
    </div>
  );
}
