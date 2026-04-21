'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { resolvePageType } from '@/lib/resolvePageType'

export default function BodyPageTypeUpdater() {
  const pathname = usePathname()

  useEffect(() => {
    const pageType = resolvePageType(pathname)
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-page', pageType)
    }
  }, [pathname])

  return null
}


