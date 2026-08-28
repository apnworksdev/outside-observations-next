'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeContent() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/archive');
    fetch('/archive', { priority: 'low' }).catch(() => {});
    router.replace('/archive');
  }, [router]);

  return null;
}
