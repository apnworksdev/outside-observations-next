'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function ScrollContainerWrapper({ children, className }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && !customElements.get('scroll-container')) {
      const checkScript = setInterval(() => {
        if (customElements.get('scroll-container')) {
          clearInterval(checkScript)
        }
      }, 100)
      
      return () => clearInterval(checkScript)
    }
  }, [])

  return (
    <>
      <Script src="/scroll-container.js" strategy="afterInteractive" />
      <scroll-container className={className} suppressHydrationWarning>
        {children}
      </scroll-container>
    </>
  )
}
