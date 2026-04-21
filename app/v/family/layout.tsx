import VariantNav from '@/components/variants/VariantNav';
import VariantFooter from '@/components/variants/VariantFooter';

export const metadata = { title: 'ASBL Loft · Family — Where your kids grow up.' };

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-family">
      <VariantNav
        label="Family"
        badge="Built for kids. Built for calm."
        links={[
          { href: '/v/family', label: 'Home' },
          { href: '/v/family/schools', label: 'Schools' },
          { href: '/v/family/amenities', label: 'Amenities' },
          { href: '/v/family/floor-plans', label: 'Floor Plans' },
        ]}
        ctaLabel="Schedule Family Tour"
      />
      {children}
      <VariantFooter variantLabel="Family" tagline="Where your kids will grow up." />
    </div>
  );
}
