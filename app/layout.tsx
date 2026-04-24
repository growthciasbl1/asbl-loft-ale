import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import VisitorBootstrap from '@/components/VisitorBootstrap';

// GTM container ID — override via NEXT_PUBLIC_GTM_ID in .env.local / Vercel
// env if you ever rotate containers or want a staging container.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5GPRCJGL';

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

        {/* Google Tag Manager — loader. Must run early so the dataLayer is
            ready before any client code pushes events. Next.js injects this
            into <head> via the Script component. */}
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />

        {/* ASBL web tracker — captures UTMs, referrer, pages, time-spent in localStorage.
            Forms then read `asbl_track` and forward to our /api/webhook → Zoho CRM. */}
        <script src="https://asbl-crm-api.vercel.app/tracker.js" defer />
      </head>
      <body>
        {/* GTM noscript fallback — required for users with JS disabled to
            still register a GTM page view. Must be the first element inside
            <body> per Google's install guide. */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <VisitorBootstrap />
        {children}
      </body>
    </html>
  );
}
