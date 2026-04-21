'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

interface Props {
  label: string;
  badge?: string;
  links: NavLink[];
  ctaLabel: string;
  ctaHref?: string;
  onCta?: () => void;
}

export default function VariantNav({ label, badge, links, ctaLabel, ctaHref = '#contact' }: Props) {
  const pathname = usePathname();

  return (
    <nav className="nav-bar">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-sm eyebrow">ASBL · Loft</span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold accent-bg">
            {label}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  active ? 'accent-text font-semibold' : 'muted-text hover:opacity-100'
                }`}
                style={active ? { background: 'var(--surface-2)' } : {}}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {badge && <span className="hidden md:inline-block text-xs muted-text">{badge}</span>}
          <a href={ctaHref} className="btn-primary text-sm">
            {ctaLabel}
          </a>
        </div>
      </div>
    </nav>
  );
}
