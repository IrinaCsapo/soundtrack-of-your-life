'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'home' },
  { href: '/about', label: 'about' },
  { href: '/archive', label: 'soundtrack cabinet' },
];

/**
 * Site-wide top navigation.
 * Three links centered. Active page highlighted in brass.
 * Used on the landing, about, archive, and soundtrack reveal pages.
 * Intentionally omitted from the question flow (focused experience).
 */
export function SiteNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="absolute top-0 left-0 right-0 z-10 pt-6 sm:pt-8 px-6 flex justify-center pointer-events-none">
      <ul className="flex items-center gap-3 sm:gap-5 font-sans text-[10px] sm:text-[11px] tracking-[0.3em] uppercase pointer-events-auto">
        {NAV_ITEMS.map((item, i) => (
          <li key={item.href} className="flex items-center gap-3 sm:gap-5">
            <Link
              href={item.href}
              className={
                isActive(item.href)
                  ? 'text-brass'
                  : 'text-paper/75 hover:text-brass transition-colors duration-300'
              }
            >
              {item.label}
            </Link>
            {i < NAV_ITEMS.length - 1 && (
              <span className="text-paper/25" aria-hidden>
                ·
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
