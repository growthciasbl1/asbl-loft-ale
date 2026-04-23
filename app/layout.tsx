import type { Metadata } from 'next';
import './globals.css';
import VisitorBootstrap from '@/components/VisitorBootstrap';

export const metadata: Metadata = {
  title: 'ASBL LOFT — Ask Anything',
  description:
    '3BHK residences at ASBL Loft, Financial District, Hyderabad. Ask about plans, pricing, rental offer, amenities, location.',
  icons: {
    icon: [{ url: '/assets/logo.webp', type: 'image/webp' }],
    shortcut: '/assets/logo.webp',
    apple: '/assets/logo.webp',
  },
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
        {/* ASBL web tracker — captures UTMs, referrer, pages, time-spent in localStorage.
            Forms then read `asbl_track` and forward to our /api/webhook → Zoho CRM. */}
        <script src="https://asbl-crm-api.vercel.app/tracker.js" defer />
      </head>
      <body>
        <VisitorBootstrap />
        {children}
      </body>
    </html>
  );
}
