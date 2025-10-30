'use client'

import Script from 'next/script'

export default function MaskScrollWrapper({ children, className }) {
  return (
    <>
      <Script src="/mask-scroll.js" strategy="afterInteractive" />
      <mask-scroll className={className} suppressHydrationWarning>
        {children}
      </mask-scroll>
    </>
  )
}


