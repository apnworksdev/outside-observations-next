'use client'

import { useEffect } from 'react'

// Simplified for production: only home page exists
export default function BodyPageTypeUpdater() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-page', 'home')
    }
  }, [])

  return null
}


