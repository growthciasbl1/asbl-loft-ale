'use client';

import Link from 'next/link';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';

interface Props {
  variantLabel: string;
  tagline: string;
}

export default function VariantFooter({ variantLabel, tagline }: Props) {
  return (
    <footer className="border-t border-theme mt-24" id="contact">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <p className="eyebrow mb-3">ASBL · {variantLabel}</p>
          <h3 className="text-2xl md:text-3xl font-bold mb-3 serif">{tagline}</h3>
          <p className="muted-text max-w-md text-sm">
            {ASBL_LOFT_DATA.project.name} · {ASBL_LOFT_DATA.project.location} · Handover{' '}
            {new Date(ASBL_LOFT_DATA.project.handover).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <a href="#contact" className="btn-primary text-sm">Book a call</a>
            <Link href="/" className="btn-ghost text-sm">Try a different view</Link>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">Trust</p>
          <div className="text-sm space-y-2">
            <div>
              <p className="muted-text text-xs">RERA</p>
              <p>{ASBL_LOFT_DATA.project.rera}</p>
            </div>
            <div>
              <p className="muted-text text-xs">Building Permit</p>
              <p className="text-xs">{ASBL_LOFT_DATA.project.buildingPermit}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">Inventory</p>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="muted-text">Total</span><span>{ASBL_LOFT_DATA.project.totalUnits}</span></div>
            <div className="flex justify-between"><span className="muted-text">Sold</span><span>{ASBL_LOFT_DATA.project.soldUnits}</span></div>
            <div className="flex justify-between"><span className="muted-text">Available</span><span className="accent-text font-semibold">{ASBL_LOFT_DATA.project.availableUnits}</span></div>
          </div>
        </div>
      </div>

      <div className="border-t border-theme py-6 text-center text-xs muted-text">
        © {new Date().getFullYear()} ASBL. All rights reserved.
      </div>
    </footer>
  );
}
