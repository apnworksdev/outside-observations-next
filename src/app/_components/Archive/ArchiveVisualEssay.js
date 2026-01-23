'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SanityImage from '@/sanity/components/SanityImage';
import { urlForImage } from '@/sanity/lib/image';
import { useContentWarningConsent } from '@/app/_contexts/ContentWarningConsentContext';
import { MediaProtector } from '@/app/_components/MediaProtector';
import styles from '@app/_assets/archive/archive-page.module.css';

const ROTATION_INTERVAL = 2000; // 2 seconds

export default function ArchiveVisualEssay({ entry, width = 1200, height, onCurrentImageChange, contentWarning = false, priority = false }) {
  const visualEssayImages = entry?.visualEssayImages || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { hasConsent } = useContentWarningConsent();
  const intervalRef = useRef(null);
  const observerRef = useRef(null);
  const containerRef = useRef(null);

  // Filter out images without valid image data
  const validImages = visualEssayImages.filter(img => img?.image?.asset?._ref);

  // Reset index if it's out of bounds (e.g., if array became shorter)
  useEffect(() => {
    if (validImages.length > 0 && currentIndex >= validImages.length) {
      setCurrentIndex(0);
    }
  }, [validImages.length, currentIndex]);

  // Get current image (use first image as fallback if array is empty)
  const currentImage = validImages[currentIndex] || validImages[0];
  const nextIndex = validImages.length > 0 ? (currentIndex + 1) % validImages.length : 0;
  const nextImage = validImages[nextIndex];

  // Find the image with the largest dimensions (by area)
  const largestImage = validImages.reduce((largest, current) => {
    const largestArea = largest?.image?.dimensions?.width * largest?.image?.dimensions?.height || 0;
    const currentArea = current?.image?.dimensions?.width * current?.image?.dimensions?.height || 0;
    return currentArea > largestArea ? current : largest;
  }, validImages[0]);

  // Calculate consistent aspect ratio from largest image (for consistent container height)
  const baseAspectRatio = largestImage?.image?.dimensions?.aspectRatio || 1;
  const aspectRatioPadding = height 
    ? `${(height / width) * 100}%`
    : baseAspectRatio 
      ? `${(1 / baseAspectRatio) * 100}%`
      : '100%';

  // Calculate height from aspect ratio if not provided (for Next.js Image component)
  const imageHeight = height || 
    (currentImage?.image?.dimensions?.aspectRatio 
      ? Math.round(width / currentImage.image.dimensions.aspectRatio) 
      : width);

  // Preload next image
  useEffect(() => {
    if (validImages.length <= 1 || !nextImage) return;

    const nextImageUrl = urlForImage(nextImage.image);
    if (nextImageUrl) {
      const img = new Image();
      img.src = nextImageUrl;
    }
  }, [currentIndex, nextImage, validImages.length]);

  // IntersectionObserver to pause when not visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1, // Trigger when at least 10% visible
      }
    );

    observerRef.current.observe(container);

    return () => {
      if (observerRef.current && container) {
        observerRef.current.unobserve(container);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Rotation interval
  useEffect(() => {
    // Don't rotate if only one image or not visible
    if (validImages.length <= 1 || !isVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % validImages.length);
    }, ROTATION_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible, validImages.length]);

  // Notify parent when the currently displayed image changes (for hover overlay, link ?image=, etc.)
  useEffect(() => {
    if (onCurrentImageChange && currentImage) {
      onCurrentImageChange(currentImage, currentIndex);
    }
  }, [currentImage, currentIndex, onCurrentImageChange]);

  // Early return after all hooks
  if (validImages.length === 0 || !currentImage) {
    return null;
  }

  const handleContextMenu = useCallback((e) => {
    if (contentWarning && !hasConsent) {
      e.preventDefault();
    }
  }, [contentWarning, hasConsent]);

  return (
    <div 
      ref={containerRef} 
      className={styles.archiveVisualEssayContainer}
      style={{ paddingBottom: aspectRatioPadding }}
      onContextMenu={handleContextMenu}
    >
      <div className={styles.archiveVisualEssayImageWrapper}>
        <SanityImage
          image={currentImage.image}
          alt={currentImage.metadata?.artName || currentImage.metadata?.fileName || 'Visual essay image'}
          width={width}
          height={imageHeight}
          priority={priority && currentIndex === 0}
          placeholder={currentImage?.image?.lqip ? 'blur' : undefined}
          blurDataURL={currentImage?.image?.lqip || undefined}
          quality={priority && currentIndex === 0 ? 85 : 75}
          className={styles.archiveVisualEssayImage}
        />
        <MediaProtector contentWarning={contentWarning} />
      </div>
    </div>
  );
}

