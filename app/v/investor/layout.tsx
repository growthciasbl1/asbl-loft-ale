import VariantNav from '@/components/variants/VariantNav';
import VariantFooter from '@/components/variants/VariantFooter';

export const metadata = {
  title: 'ASBL Loft · Investor — Yield. Appreciation. Exit.',
};

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-investor">
      <VariantNav
        label="Investor"
        badge="Yield-first view"
        links={[
          { href: '/v/investor', label: 'Thesis' },
          { href: '/v/investor/units', label: 'Yield Matrix' },
          { href: '/v/investor/market', label: 'Market' },
          { href: '/v/investor/finance', label: 'Finance' },
        ]}
        ctaLabel="Book Investor Call"
      />
      {children}
      <VariantFooter variantLabel="Investor" tagline="Yield. Appreciation. Exit." />
    </div>
  );
}
