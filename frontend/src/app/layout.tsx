import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'PersoNutri',
  description: 'Dieta, refeições, calorias, macros e previsão de peso.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 md:pb-12">{children}</main>
      </body>
    </html>
  );
}
