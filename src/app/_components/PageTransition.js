'use client';

import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { isFirstWebsiteVisit } from '@/app/_helpers/visitTracker';

/**
 * PageTransition - Handles page transitions and initial load animations
 * 
 * Responsibilities:
 * - Fade out content before navigation (nav stays visible)
 * - Show CircleAnimation loader on first website entry (except home page first visit)
 * - Handle content fade-in after loader completes
 * - Manage header visibility for home page
 */
export default function PageTransition({ children }) {
  const navRef = useRef(null);
  const contentRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const isNavigatingRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const linesAnimationRef = useRef(null);
  const contentFadeInAnimationRef = useRef(null);
  const navFadeInAnimationRef = useRef(null);
  const navigationFadeInAnimationRef = useRef(null);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Memoize children separation to avoid recalculation on every render
  const { navChild, linesChild, contentChildren } = useMemo(() => {
    const childrenArray = Array.isArray(children) ? children : [children];
    return {
      navChild: childrenArray[0], // First child is nav
      linesChild: childrenArray[1], // Second child is lines
      contentChildren: childrenArray.slice(2), // Rest is content
    };
  }, [children]);

  // Use useLayoutEffect to hide content synchronously before paint (prevents flash)
  useLayoutEffect(() => {
    setIsClient(true);
    
    // Only check on initial mount
    if (!isInitialMountRef.current) return;
    
    const isHomePage = pathname === '/';
    let shouldShow = false;
    
    if (isHomePage) {
      // Home has two states: first-time (animation) and returning (welcome view).
      // Never show CircleAnimation on home - FirstVisitAnimation or the returning view handles it.
      shouldShow = false;
      // If returning visitor on home, ensure header is visible (HomeContent also sets this)
      const isFirstVisit = isFirstWebsiteVisit();
      if (!isFirstVisit) {
        document.body.classList.add('home-animation-complete');
      }
    } else {
      // Not home page - show loader if it hasn't been shown this session
      try {
        const hasShownLoader = sessionStorage.getItem('loaderShown') === 'true';
        shouldShow = !hasShownLoader;
      } catch {
        // If sessionStorage fails, don't show loader
        shouldShow = false;
      }
    }
    
    setShowLoader(shouldShow);
    
    // Hide content and nav immediately if showing loader (runs synchronously before paint)
    if (shouldShow) {
      const content = contentRef.current;
      const nav = navRef.current;
      const lines = document.getElementById('lines-grid');
      
      if (content) {
        gsap.set(content, { opacity: 0 });
      }
      if (nav) {
        gsap.set(nav, { opacity: 0 });
      }
      if (lines) {
        gsap.set(lines, { transform: 'translateY(-100%)' });
      }
    }
    
    isInitialMountRef.current = false;
  }, [pathname]);

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

  const handleLoaderComplete = useCallback(() => {
    setLoaderComplete(true);
  }, []);

  // Animate lines when showLoader is true
  useEffect(() => {
    if (!showLoader || !isClient || loaderComplete) return;
    
    // Find the lines element by its id
    const lines = document.getElementById('lines-grid');
    if (!lines) return;
    
    // Kill any existing animation
    if (linesAnimationRef.current) {
      linesAnimationRef.current.kill();
    }
    
    // Animate lines from translateY(-100%) to translateY(0%)
    linesAnimationRef.current = gsap.to(lines, {
      transform: 'translateY(0%)',
      duration: 0.8,
      ease: 'none',
      onComplete: () => {
        handleLoaderComplete();
        linesAnimationRef.current = null;
      },
    });
    
    return () => {
      if (linesAnimationRef.current) {
        linesAnimationRef.current.kill();
        linesAnimationRef.current = null;
      }
    };
  }, [showLoader, isClient, loaderComplete, handleLoaderComplete]);

  // Handle loader completion - fade in content and mark as shown
  useEffect(() => {
    if (!loaderComplete || !showLoader) return;
    
    // Mark that loader has been shown this session
    try {
      sessionStorage.setItem('loaderShown', 'true');
    } catch {
      // Silently fail if sessionStorage is unavailable
    }

    // Kill any existing animations
    if (navFadeInAnimationRef.current) {
      navFadeInAnimationRef.current.kill();
    }
    if (contentFadeInAnimationRef.current) {
      contentFadeInAnimationRef.current.kill();
    }

    const nav = navRef.current;
    if (nav) {
      navFadeInAnimationRef.current = gsap.to(nav, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          navFadeInAnimationRef.current = null;
        },
      });
    }
    
    const content = contentRef.current;
    if (content) {
      contentFadeInAnimationRef.current = gsap.to(content, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        delay: 0.3,
        onComplete: () => {
          isNavigatingRef.current = false;
          contentFadeInAnimationRef.current = null;
        },
      });
    }
    
    return () => {
      if (navFadeInAnimationRef.current) {
        navFadeInAnimationRef.current.kill();
        navFadeInAnimationRef.current = null;
      }
      if (contentFadeInAnimationRef.current) {
        contentFadeInAnimationRef.current.kill();
        contentFadeInAnimationRef.current = null;
      }
    };
  }, [loaderComplete, showLoader]);

  // Handle pathname change - fade in new content (no CircleAnimation on navigation)
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

    // On navigation, don't show CircleAnimation (only shown on initial website entry)
    setShowLoader(false);
    setLoaderComplete(false);

    // Handle home page header visibility (defensive check in case cookies are disabled)
    const isHomePage = pathname === '/';
    if (isHomePage && !isFirstWebsiteVisit()) {
      document.body.classList.add('home-animation-complete');
    }

    // Kill any existing navigation animation
    if (navigationFadeInAnimationRef.current) {
      navigationFadeInAnimationRef.current.kill();
    }

    // Fade in new content
    const content = contentRef.current;
    if (content) {
      gsap.set(content, { opacity: 0 });
      navigationFadeInAnimationRef.current = gsap.to(content, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        delay: 0.3,
        onComplete: () => {
          isNavigatingRef.current = false;
          navigationFadeInAnimationRef.current = null;
        },
      });
    }
    
    previousPathnameRef.current = pathname;
    
    return () => {
      if (navigationFadeInAnimationRef.current) {
        navigationFadeInAnimationRef.current.kill();
        navigationFadeInAnimationRef.current = null;
      }
    };
  }, [pathname]);

  return (
    <>
      {/* Nav - always visible, can be controlled for animations */}
      <div ref={navRef}>
        {navChild}
      </div>
      {/* Lines animation - shows on all pages except home on first visit */}
      {linesChild}
      {/* Content - fades in/out */}
      <div ref={contentRef}>
        {contentChildren}
      </div>
    </>
  );
}
