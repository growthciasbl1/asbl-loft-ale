import VariantNav from '@/components/variants/VariantNav';
import VariantFooter from '@/components/variants/VariantFooter';

export const metadata = { title: 'ASBL Loft · NRI — Buy from anywhere.' };

export default function NriLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-nri">
      <VariantNav
        label="NRI"
        badge="Remote-first"
        links={[
          { href: '/v/nri', label: 'Overview' },
          { href: '/v/nri/virtual-tour', label: 'Virtual Tour' },
          { href: '/v/nri/legal', label: 'Legal & Tax' },
        ]}
        ctaLabel="Talk to NRI Desk"
      />
      {children}
      <VariantFooter variantLabel="NRI" tagline="Buy from anywhere. Own here." />
    </div>
  );
}
