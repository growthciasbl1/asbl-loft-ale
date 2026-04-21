'use client';

import { useMemo, useState } from 'react';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';

type SortKey = 'yield' | 'rent' | 'price' | 'floor';

export default function InvestorUnitsPage() {
  const all = ASBL_LOFT_DATA.units;

  const [size, setSize] = useState<'ALL' | 1695 | 1870>('ALL');
  const [facing, setFacing] = useState<'ALL' | 'EAST' | 'WEST'>('ALL');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('yield');

  const rows = useMemo(() => {
    let r = all.slice();
    if (size !== 'ALL') r = r.filter((u) => u.size === size);
    if (facing !== 'ALL') r = r.filter((u) => u.facing === facing);
    if (availableOnly) r = r.filter((u) => u.available);
    r.sort((a, b) => {
      if (sortBy === 'yield') return b.roiPercentage - a.roiPercentage;
      if (sortBy === 'rent') return b.expectedRental - a.expectedRental;
      if (sortBy === 'price') return a.totalPrice - b.totalPrice;
      return b.floor - a.floor;
    });
    return r.slice(0, 40);
  }, [all, size, facing, availableOnly, sortBy]);

  const best = rows[0];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <p className="eyebrow mb-3">Unit-level yield</p>
      <h1 className="text-4xl md:text-5xl serif mb-6">
        Which unit prints the highest cash flow?
      </h1>
      <p className="muted-text max-w-2xl mb-10">
        Filter by size and facing. We&apos;ve priced every unit with floor and facing premium and modelled
        rent conservatively. Top result wins — period.
      </p>

      {/* Controls */}
      <div className="surface rounded-2xl p-5 mb-8 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs muted-text mr-2">Size</span>
          {(['ALL', 1695, 1870] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                size === s ? 'accent-bg text-white' : 'surface-2'
              }`}
            >
              {s === 'ALL' ? 'All' : `${s} sqft`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs muted-text mr-2">Facing</span>
          {(['ALL', 'EAST', 'WEST'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFacing(f)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                facing === f ? 'accent-bg text-white' : 'surface-2'
              }`}
            >
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Available only
        </label>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs muted-text mr-2">Sort</span>
          {(['yield', 'rent', 'price', 'floor'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize ${
                sortBy === k ? 'accent-bg text-white' : 'surface-2'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Best unit card */}
      {best && (
        <div
          className="rounded-2xl p-6 md:p-8 mb-8"
          style={{
            background:
              'radial-gradient(500px 200px at 0% 0%, rgba(212,175,55,0.2), transparent 60%), var(--surface)',
            border: '1px solid var(--accent)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="eyebrow mb-2">Top match</p>
              <p className="text-2xl md:text-3xl serif">
                Unit {best.id} · Tower {best.tower}, Floor {best.floor}, {best.facing} facing
              </p>
              <p className="muted-text mt-2">
                {best.size} sqft · ticket ₹{(best.totalPrice / 10000000).toFixed(2)}Cr · expected rent ₹
                {Math.round(best.expectedRental / 1000)}K/mo
              </p>
            </div>
            <div className="text-right">
              <p className="muted-text text-xs">Gross yield</p>
              <p className="text-5xl serif accent-text">{best.roiPercentage.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr>
                <th className="text-left p-4 muted-text text-xs uppercase tracking-wider">Unit</th>
                <th className="text-left p-4 muted-text text-xs uppercase tracking-wider">Tower</th>
                <th className="text-left p-4 muted-text text-xs uppercase tracking-wider">Floor</th>
                <th className="text-left p-4 muted-text text-xs uppercase tracking-wider">Facing</th>
                <th className="text-left p-4 muted-text text-xs uppercase tracking-wider">Size</th>
                <th className="text-right p-4 muted-text text-xs uppercase tracking-wider">Ticket</th>
                <th className="text-right p-4 muted-text text-xs uppercase tracking-wider">Rent/mo</th>
                <th className="text-right p-4 muted-text text-xs uppercase tracking-wider">Yield</th>
                <th className="text-center p-4 muted-text text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-t border-theme hover:bg-[var(--surface-2)] transition"
                >
                  <td className="p-4 font-mono text-xs">{u.id}</td>
                  <td className="p-4">{u.tower}</td>
                  <td className="p-4">{u.floor}</td>
                  <td className="p-4">{u.facing}</td>
                  <td className="p-4">{u.size}</td>
                  <td className="p-4 text-right">₹{(u.totalPrice / 10000000).toFixed(2)}Cr</td>
                  <td className="p-4 text-right">₹{Math.round(u.expectedRental / 1000)}K</td>
                  <td className={`p-4 text-right font-semibold ${i === 0 ? 'accent-text' : ''}`}>
                    {u.roiPercentage.toFixed(2)}%
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
                      style={{
                        background: u.available ? 'rgba(16,185,129,0.15)' : 'rgba(235,87,87,0.12)',
                        color: u.available ? '#34d399' : '#ef4444',
                      }}
                    >
                      {u.available ? 'Available' : 'Sold'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted-text text-xs mt-4">
        Showing top {rows.length} matches. Rent modelling is conservative; actuals trend higher for
        upper floors with east facing.
      </p>
    </section>
  );
}
