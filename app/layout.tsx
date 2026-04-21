import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASBL LOFT — Ask Anything',
  description: '3BHK residences, Financial District, Hyderabad. Ask anything, get a tailored answer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
