import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASBL LOFT — Ask Anything',
  description:
    '3BHK residences at ASBL Loft, Financial District, Hyderabad. Ask about plans, pricing, rental offer, amenities, location.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
