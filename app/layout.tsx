import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ERP ROI Kalkulator – Xentral',
  description: 'Berechne dein Einsparpotenzial mit Xentral ERP. Kostenloser ROI-Rechner für E-Commerce und Handel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
