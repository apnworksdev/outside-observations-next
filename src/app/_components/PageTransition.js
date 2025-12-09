'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { gsap } from 'gsap';

/**
 * PageTransition - Step 2: Fade out content before navigation
 * 
 * Nav stays visible, only content fades out
 * After content fade out, nav can animate (handled by CSS via data-page)
 */
export default function PageTransition({ children }) {
  const navRef = useRef(null);
  const contentRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const isNavigatingRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Separate nav (first child) and content (rest)
  const childrenArray = Array.isArray(children) ? children : [children];
  const navChild = childrenArray[0]; // First child is nav
  const contentChildren = childrenArray.slice(1); // Rest is content

  // Handle initial visibility and fade-in
  useEffect(() => {
    const body = document.body;
    const pageType = body.getAttribute('data-page');
    const content = contentRef.current;
    
    if (pageType === 'home') {
      requestAnimationFrame(() => {
        if (body && !body.classList.contains('blur-ready')) {
          body.classList.add('blur-ready');
        }
      });
    }

    // Fade in content on initial mount
    if (isInitialMountRef.current && content) {
      gsap.set(content, { opacity: 0 });
      gsap.to(content, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
      isInitialMountRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest('a[data-transition]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      if (href.startsWith('http') || href.startsWith('//')) return;

      // Normalize paths for comparison
      const normalizedHref = href === '/' ? '/' : href.replace(/\/$/, '');
      const normalizedPathname = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
      
      // If already on this page, don't do anything (let default behavior happen)
      if (normalizedHref === normalizedPathname) {
        return;
      }

      e.preventDefault();

      const content = contentRef.current;

      if (!content) {
        // If no content wrapper, just navigate
        router.push(href);
        return;
      }

      // Prevent rapid clicks - if already navigating, ignore
      if (isNavigatingRef.current) {
        return;
      }

      // Set navigating flag (using ref for synchronous access)
      isNavigatingRef.current = true;

      // Fade out content to opacity 0 (nav stays visible - opacity 1)
      gsap.to(content, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          // Navigate after content fade out
          // CSS will handle nav position changes via data-page
          // We can add nav animations here later if needed
          router.push(href);
        },
      });
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [router, pathname]);

  // Handle pathname change - fade in new content
  useEffect(() => {
    // Skip if pathname hasn't changed
    if (previousPathnameRef.current === pathname) {
      return;
    }

    // Skip initial mount (handled separately)
    if (isInitialMountRef.current) {
      previousPathnameRef.current = pathname;
      return;
    }

    const content = contentRef.current;
    
    if (content) {
      // Set initial state to opacity 0
      gsap.set(content, { opacity: 0 });
      
      // Fade in from opacity 0 to 1
      gsap.to(content, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          isNavigatingRef.current = false;
        },
      });
    }
    
    previousPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <>
      {/* Nav - always visible, can be controlled for animations */}
      <div ref={navRef}>
        {navChild}
      </div>
      {/* Content - fades in/out */}
      <div ref={contentRef}>
        {contentChildren}
      </div>
    </>
  );
}
