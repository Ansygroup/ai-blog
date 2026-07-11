'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ENDPOINT = '/api/track';

export default function TrackVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;

    const controller = new AbortController();
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});

    return () => controller.abort();
  }, [pathname]);

  return null;
}
