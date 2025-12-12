'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import CircleAnimation from '@/app/_components/Home/CircleAnimation';
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
  const [showCircleLoader, setShowCircleLoader] = useState(false);
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Memoize children separation to avoid recalculation on every render
  const { navChild, contentChildren } = useMemo(() => {
    const childrenArray = Array.isArray(children) ? children : [children];
    return {
      navChild: childrenArray[0], // First child is nav
      contentChildren: childrenArray.slice(1), // Rest is content
    };
  }, [children]);

  // Determine if we should show CircleAnimation (client-side only to avoid hydration issues)
  useEffect(() => {
    setIsClient(true);
    
    // Only check on initial mount
    if (!isInitialMountRef.current) return;
    
    const isHomePage = pathname === '/';
    let shouldShow = false;
    
    if (isHomePage) {
      // On home page: Middleware redirects non-first-time visitors to /archive,
      // so if we reach here, it's a first-time visitor.
      // First-time visitors on home should NOT see CircleAnimation because
      // FirstVisitAnimation will handle the entire animation sequence.
      // Never show CircleAnimation on home page - FirstVisitAnimation handles it.
      shouldShow = false;
      
      // For returning visitors on home (edge case: cookies disabled, middleware didn't redirect),
      // ensure header is visible immediately since they won't see FirstVisitAnimation
      const isFirstVisit = isFirstWebsiteVisit();
      if (!isFirstVisit) {
        document.body.classList.add('home-animation-complete');
      }
    } else {
      // Not home page - show CircleAnimation if it hasn't been shown this session
      try {
        const hasShownLoader = sessionStorage.getItem('circleLoaderShown') === 'true';
        shouldShow = !hasShownLoader;
      } catch {
        // If sessionStorage fails, don't show loader
        shouldShow = false;
      }
    }
    
    setShowCircleLoader(shouldShow);
    
    // Hide content initially if showing loader
    if (shouldShow) {
      const content = contentRef.current;
      if (content) {
        gsap.set(content, { opacity: 0 });
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

  // Handle CircleAnimation completion - fade in content and mark as shown
  useEffect(() => {
    if (!loaderComplete || !showCircleLoader) return;
    
    // Mark that CircleAnimation has been shown this session
    try {
      sessionStorage.setItem('circleLoaderShown', 'true');
    } catch {
      // Silently fail if sessionStorage is unavailable
    }
    
    const content = contentRef.current;
    if (content) {
      gsap.to(content, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          isNavigatingRef.current = false;
        },
      });
    }
  }, [loaderComplete, showCircleLoader]);

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
    setShowCircleLoader(false);
    setLoaderComplete(false);

    // Handle home page header visibility (defensive check in case cookies are disabled)
    const isHomePage = pathname === '/';
    if (isHomePage && !isFirstWebsiteVisit()) {
      document.body.classList.add('home-animation-complete');
    }

    // Fade in new content
    const content = contentRef.current;
    if (content) {
      gsap.set(content, { opacity: 0 });
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

  const handleLoaderComplete = () => {
    setLoaderComplete(true);
  };

  return (
    <>
      {/* Nav - always visible, can be controlled for animations */}
      <div ref={navRef}>
        {navChild}
      </div>
      {/* CircleAnimation loader - shows on all pages except home on first visit */}
      {isClient && showCircleLoader && !loaderComplete && (
        <CircleAnimation onComplete={handleLoaderComplete} />
      )}
      {/* Content - fades in/out */}
      <div ref={contentRef}>
        {contentChildren}
      </div>
    </>
  );
}
