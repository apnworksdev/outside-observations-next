'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CircleAnimation from '@/app/_components/Home/CircleAnimation';
import styles from '@app/_assets/home.module.css';

/**
 * FirstVisitAnimation - Complex animation sequence for first-time visitors
 * 
 * Orchestrates a multi-stage animation:
 * - Circle animations with staggered timing
 * - Text reveals ("Create for each other", "Invest in each other", long text)
 * - Lines grid animation
 * - Typewriter effect for first message
 * - Form elements reveal
 * - Header fade-in
 */
export default function FirstVisitAnimation({ onComplete, children }) {
  const contentRef = useRef(null);
  const createTextRef = useRef(null);
  const investTextRef = useRef(null);
  const longTextRef = useRef(null);
  const timelineRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const animationsSetupRef = useRef(false); // Guard to prevent multiple setups
  const [isClient, setIsClient] = useState(false);

  // Store onComplete in ref so it doesn't trigger re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Only render children on client to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create timeline immediately so CircleAnimation can use it
  useEffect(() => {
    if (!isClient) return;

    // Create shared timeline
    const tl = gsap.timeline({
      onComplete: () => {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      },
    });

    timelineRef.current = tl;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    };
  }, [isClient]);

  // Handle circle timing callback and set up animations
  const handleCircleTimingReady = useCallback((timing) => {
    // Prevent multiple setups if callback is called multiple times
    if (animationsSetupRef.current) {
      return;
    }
    animationsSetupRef.current = true;
    
    // Set up animations now that timing is ready
    const content = contentRef.current;
    const createText = createTextRef.current;
    const investText = investTextRef.current;
    const longText = longTextRef.current;
    if (!content || !createText || !investText || !longText || !timelineRef.current) return;

    // ===== TIMING & DURATION CONSTANTS =====
    // Text fade animations (appear/disappear)
    const textFadeDuration = 0.5;
    
    // Long text
    const longTextDisplayDuration = 2.5; // How long to show long text
    const longTextDelay = 0.6; // Delay before showing long text
    
    // Circle animations
    const circleDuration = 0.6; // Duration of each circle fade-in
    const circleFadeOutDuration = 0.3; // Duration of circles fade-out
    
    // Line animations (grid and form lines)
    const linesDuration = 0.8; // Duration of lines grid animation
    
    // Typewriter animation
    const typingSpeed = 0.03; // seconds per character
    const messageBackgroundColorDuration = 0.6; // Duration of background/color change after typewriter
    
    // Form animations
    const formElementFadeDuration = 0.6; // Duration of form elements fade-in
    const formDelay = 0.6; // Delay after typewriter completes before showing form
    
    // Header animation
    const headerFadeDuration = 0.6; // Duration of header fade-in
    // =======================================

    // Select elements to animate (hybrid approach: querySelector for outside, refs for children)
    const linesGrid = document.querySelector('[data-first-visit-animate="lines"]');
    const header = document.querySelector('[data-first-visit-animate="header"]');

    // Hide all elements immediately (content stays visible, but individual elements will be hidden)
    gsap.set(createText, { opacity: 0 });
    gsap.set(investText, { opacity: 0 });
    gsap.set(longText, { opacity: 0 });
    if (linesGrid) {
      gsap.set(linesGrid, { transform: 'translateY(-100%)' });
    }
    if (header) {
      gsap.set(header, { opacity: 0 });
    }

    // Hide content elements (first message and form input) immediately
    let firstMessage = content.querySelector('[data-first-visit-animate="first-message"]');
    if (firstMessage) {
      // Get computed CSS variable values
      const rootStyle = window.getComputedStyle(document.documentElement);
      const fgColor = rootStyle.getPropertyValue('--fg-color').trim();
      gsap.set(firstMessage, { 
        opacity: 0, 
        backgroundColor: 'transparent', 
        color: fgColor || '#000000' // fallback if CSS var doesn't work
      });
    }
    const formElements = content.querySelectorAll('[data-first-visit-animate="form-element"]');
    if (formElements.length > 0) {
      gsap.set(formElements, { opacity: 0 });
    }
    const formLines = content.querySelectorAll('[data-first-visit-animate="form-line"]');
    if (formLines.length > 0) {
      gsap.set(formLines, { transform: 'translateX(-100%)' });
    }

    const tl = timelineRef.current;

    // 1. Show first circle + show "Create for each other" text at the same time
    const firstCircleTime = timing.getCircleTime(1);
    tl.to(createText, {
      opacity: 1,
      duration: textFadeDuration,
      ease: 'power1.out',
    }, firstCircleTime);

    // 2. At 4th circle: hide "Create for each other" text
    const fourthCircleTime = timing.getCircleTime(4); // 4th circle (0-indexed)
    tl.to(createText, {
      opacity: 0,
      duration: textFadeDuration,
      ease: 'power1.in',
    }, fourthCircleTime);

    // 3. After 5th circle finishes: show "Invest in each other" text
    const fifthCircleTime = timing.getCircleTime(5);
    const fifthCircleEndTime = fifthCircleTime + circleDuration;
    tl.to(investText, {
      opacity: 1,
      duration: textFadeDuration,
      ease: 'power1.out',
    }, fifthCircleEndTime);

    // 4. After circles have disappeared: hide "Invest in each other" text
    const lastCircleTime = timing.getCircleTime(7); // 8th circle (0-indexed)
    const lastCircleEndTime = lastCircleTime + circleDuration * 2;
    const circlesFadeOutEndTime = lastCircleEndTime + circleFadeOutDuration;
    const hiddenCirclesTime = circlesFadeOutEndTime;
    tl.to(investText, {
      opacity: 0,
      duration: textFadeDuration,
      ease: 'power1.in',
    }, hiddenCirclesTime);

    // 5. After circles have disappeared: show long text
    const longTextStartTime = hiddenCirclesTime + textFadeDuration + longTextDelay;
    tl.to(longText, {
      opacity: 1,
      duration: textFadeDuration,
      ease: 'power1.out',
    }, longTextStartTime);
    
    // Hide long text after display duration (after fade-in completes)
    const longTextEndTime = longTextStartTime + textFadeDuration + longTextDisplayDuration;
    tl.to(longText, {
      opacity: 0,
      duration: textFadeDuration,
      ease: 'power1.in',
    }, longTextEndTime);

    // 6. Show lines after long text is hidden
    const linesStartTime = longTextEndTime + textFadeDuration;
    if (linesGrid) {
      tl.to(linesGrid, {
        transform: 'translateY(0%)',
        duration: linesDuration,
        ease: 'none',
      }, linesStartTime);
    }

    // 7. Animate content elements: first message and form input after lines are done
    const contentElementsStartTime = linesStartTime + linesDuration;
    
    // Get the text content early and store it (before the call function)
    let storedText = '';
    if (firstMessage) {
      const textElement = firstMessage.querySelector('p');
      if (textElement) {
        storedText = (textElement.textContent || textElement.innerText || '').trim();
      }
    }
    
    // Use GSAP call to animate elements (reuse variables from top scope)
    // This ensures ChatBox has rendered by the time we need the elements
    tl.call(() => {
      // Re-select if they weren't found earlier (fallback)
      if (!firstMessage) {
        firstMessage = content.querySelector('[data-first-visit-animate="first-message"]');
      }
      let formElements = content.querySelectorAll('[data-first-visit-animate="form-element"]');
      let formLines = content.querySelectorAll('[data-first-visit-animate="form-line"]');

      // Show first message with typewriter effect
      if (firstMessage && storedText) {
        // Get computed CSS variable values
        const rootComputedStyle = window.getComputedStyle(document.documentElement);
        const darkGrayColor = rootComputedStyle.getPropertyValue('--dark-gray-color').trim();
        const bgColor = rootComputedStyle.getPropertyValue('--bg-color').trim();
        const initialFgColor = rootComputedStyle.getPropertyValue('--fg-color').trim() || '#000000';
        
        // Get the text content from the paragraph element inside firstMessage
        const textElement = firstMessage.querySelector('p');
        if (!textElement) return;
        
        // Use stored text (captured earlier) or try to get it again
        const textToType = storedText || (textElement.textContent || textElement.innerText || '').trim();
        
        if (!textToType) {
          return;
        }
        
        // Set initial state: visible, transparent background, fg-color text
        gsap.set(firstMessage, {
          opacity: 1,
          color: initialFgColor,
          backgroundColor: 'transparent',
        });
        
        // Clear the element before starting typewriter
        textElement.textContent = '';
        
        // Create typewriter effect: reveal text character by character
        const typewriterObj = { progress: 0 };
        const typewriterDuration = textToType.length * typingSpeed;
        
        // Add typewriter directly to timeline - use position parameter to start at current timeline time
        const currentTime = tl.time();
        tl.to(typewriterObj, {
          progress: 1,
          duration: typewriterDuration,
          ease: 'none',
          onUpdate: function() {
            const progress = typewriterObj.progress;
            const currentLength = Math.floor(textToType.length * progress);
            textElement.textContent = textToType.substring(0, currentLength);
          },
          onComplete: function() {
            textElement.textContent = textToType; // Ensure full text is set
          },
        }, currentTime) // Start at current timeline time (immediately)
        // After typewriter completes, change both backgroundColor and color simultaneously
        .to(firstMessage, {
          backgroundColor: darkGrayColor || '#333333',
          color: bgColor || '#ffffff',
          duration: messageBackgroundColorDuration,
          ease: 'none',
        }, '>'); // Start after typewriter completes
      }

      // Animate form lines first, then form elements
      if (formLines.length > 0) {
        tl.to(formLines, {
          transform: 'translateX(0%)',
          duration: linesDuration,
          ease: 'none',
        }, `>+${formDelay}`);
      }
      // Then animate form elements (form container + circles)
      if (formElements.length > 0) {
        tl.to(formElements, {
          opacity: 1,
          duration: formElementFadeDuration,
          ease: 'power1.out',
        }, '>'); // Start after lines animation completes
      }
      
      // Finally, show header after everything is done
      if (header) {
        tl.to(header, {
          opacity: 1,
          duration: headerFadeDuration,
          ease: 'power1.out',
        }, '>'); // Start after form elements animation completes
      }
    }, null, contentElementsStartTime);
  }, []);

  return (
    <>
      {/* Circle animation using shared timeline */}
      {isClient && timelineRef.current && (
        <CircleAnimation 
          timeline={timelineRef.current}
          startTime={1.0}
          stagger={0.5}
          onTimingReady={handleCircleTimingReady}
        />
      )}
      <div className={`${styles.firstVisitText} ${styles.firstVisitTextCreate}`} ref={createTextRef}>
        <p>Create for each other</p>
      </div>
      <div className={`${styles.firstVisitText} ${styles.firstVisitTextInvest}`} ref={investTextRef}>
        <p>Invest in each other</p>
      </div>
      <div className={`${styles.firstVisitText} ${styles.firstVisitTextLong}`} ref={longTextRef}>
        <p>By entering your email address on this website you allow Outside Observations® to reach out to you. By using our website, you agree to the use of cookies in order to deliver the best experience.</p>
      </div>
      <div ref={contentRef}>
        {isClient ? children : null}
      </div>
    </>
  );
}
