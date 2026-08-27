import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const filsonSoft = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-filson-soft',
  display: 'swap',
});

const bodySans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MYR to VND Exchange Rate Tracker & Multi-Horizon Historical Chart',
  description:
    'Track live Malaysian Ringgit to Vietnamese Dong exchange rates with interactive historical charts, two-way currency converter, and remittance market statistics.',
  openGraph: {
    title: 'MYR to VND Exchange Rate Tracker',
    description:
      'Live rates, interactive historical charts, and instant converter between MYR and VND.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${filsonSoft.variable} ${bodySans.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
