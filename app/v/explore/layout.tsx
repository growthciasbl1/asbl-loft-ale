import VariantNav from '@/components/variants/VariantNav';
import VariantFooter from '@/components/variants/VariantFooter';

export const metadata = { title: 'ASBL Loft · Explore — Discover your way.' };

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-explore">
      <VariantNav
        label="Explore"
        badge="Editorial"
        links={[
          { href: '/v/explore', label: 'Overview' },
          { href: '/v/explore/quiz', label: 'Find my view' },
        ]}
        ctaLabel="Speak to a human"
      />
      {children}
      <VariantFooter variantLabel="Explore" tagline="Discover ASBL Loft your way." />
    </div>
  );
}
