'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import GlobalNavigation from '@/components/GlobalNavigation';

const ROUTES_SANS_NAV = ['/login'];

export default function ConditionalNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (ROUTES_SANS_NAV.includes(pathname)) return null;
  return <GlobalNavigation />;
}
