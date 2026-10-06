'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/agenda', label: 'Agenda', icon: '🗓️' },
  { href: '/refeicoes', label: 'Refeições', icon: '🍽️' },
  { href: '/dietas', label: 'Dietas', icon: '📋' },
  { href: '/exercicios', label: 'Exercícios', icon: '🏃' },
  { href: '/alimentos', label: 'Alimentos', icon: '🥑' },
  { href: '/corpo', label: 'Corpo', icon: '⚖️' },
];

export function Nav() {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-line bg-surface/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-accent">
            PersoNutri
          </Link>
          <nav className="flex gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l.href) ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active(l.href) ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface2 hover:text-ink'}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-line bg-surface md:hidden" aria-label="Principal">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active(l.href) ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium ${active(l.href) ? 'text-accent' : 'text-muted'}`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {l.icon}
            </span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
