import VariantNav from '@/components/variants/VariantNav';
import VariantFooter from '@/components/variants/VariantFooter';

export const metadata = { title: 'ASBL Loft · Luxury — Sky-floor residences.' };

export default function LuxuryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-luxury">
      <VariantNav
        label="Luxury"
        badge="By appointment"
        links={[
          { href: '/v/luxury', label: 'Overview' },
          { href: '/v/luxury/residences', label: 'Sky Residences' },
          { href: '/v/luxury/amenities', label: 'Private Collection' },
        ]}
        ctaLabel="Request Private Tour"
      />
      {children}
      <VariantFooter variantLabel="Luxury" tagline="Sky-floor residences, curated." />
    </div>
  );
}
