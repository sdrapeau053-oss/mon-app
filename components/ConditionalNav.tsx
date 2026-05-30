'use client';

import { usePathname } from 'next/navigation';
import GlobalNavigation from '@/components/GlobalNavigation';

const ROUTES_SANS_NAV = ['/login'];

export default function ConditionalNav() {
  const pathname = usePathname();
  if (ROUTES_SANS_NAV.includes(pathname)) return null;
  return <GlobalNavigation />;
}
