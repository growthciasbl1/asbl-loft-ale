import VariantNav from '@/components/variants/VariantNav';
import VariantFooter from '@/components/variants/VariantFooter';

export const metadata = { title: 'ASBL Loft · Smart Buy — Own for less than you rent.' };

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-budget">
      <VariantNav
        label="Smart Buy"
        badge="EMI-first view"
        links={[
          { href: '/v/budget', label: 'The Plan' },
          { href: '/v/budget/plans', label: 'Payment Plans' },
          { href: '/v/budget/affordability', label: 'Affordability' },
        ]}
        ctaLabel="Get Pre-approval"
      />
      {children}
      <VariantFooter variantLabel="Smart Buy" tagline="Own it for less than you rent." />
    </div>
  );
}
