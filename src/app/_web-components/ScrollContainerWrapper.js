'use client'

import { forwardRef, useEffect } from 'react'
import Script from 'next/script'

const ScrollContainerWrapper = forwardRef(function ScrollContainerWrapper({ children, className, ...rest }, ref) {
  /**
   * The custom element that powers the smooth archive scrolling is registered via a
   * separate script. We poll for its availability after hydration so we can stop the
   * interval as soon as the definition loads, preventing unnecessary work on rerenders.
   */
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
      <scroll-container ref={ref} className={className} suppressHydrationWarning {...rest}>
        {children}
      </scroll-container>
    </>
  )
})

export default ScrollContainerWrapper
