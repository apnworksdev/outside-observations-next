'use client';

import { useEffect, useRef, useState } from 'react';
import { urlForImage } from '@/sanity/lib/image';
import SanityImage from '@/sanity/components/SanityImage';

/**
 * SanityVideo - A simple video component for Sanity-hosted videos
 * Features:
 * - Lazy loading when visible (unless priority)
 * - Error fallback to poster image
 * - Autoplay when visible
 */
export default function SanityVideo({
  video,
  poster,
  alt,
  width,
  height,
  className,
  fallbackClassName,
  priority = false,
  preload = 'metadata',
  muted = true,
  playsInline = true,
  controls = false,
  loop = true,
  maxWidth, // Optional: limit video resolution for thumbnails
  onLoad,
  onPlay,
  onPause,
  onError,
  ...props
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const shouldLoadRef = useRef(priority);
  const prefersReducedMotionRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Get video URL from Sanity file asset
  const videoUrl = video?.asset?.url;
  const videoMimeType = video?.asset?.mimeType || 'video/mp4';
  
  // Get poster URL from Sanity image
  const posterUrl = poster ? urlForImage(poster) : null;
  
  // Calculate aspect ratio padding for responsive container
  const posterAspectRatio = poster?.dimensions?.aspectRatio;
  const aspectRatioPadding = posterAspectRatio 
    ? `${(1 / posterAspectRatio) * 100}%`
    : width && height
    ? `${(height / width) * 100}%`
    : '100%';

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const matches = mediaQuery.matches;
    setPrefersReducedMotion(matches);
    prefersReducedMotionRef.current = matches;
    
    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
      prefersReducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize shouldLoad for priority videos
  useEffect(() => {
    if (priority && !shouldLoadRef.current) {
      shouldLoadRef.current = true;
      setShouldLoad(true);
    }
  }, [priority]);

  // Lazy load and play/pause based on visibility
  useEffect(() => {
    const container = containerRef.current;
    const videoElement = videoRef.current;
    if (!container || !videoElement) return;

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          const intersectionRatio = entry.intersectionRatio;
          // Consider visible if >50% is in viewport
          const visible = isIntersecting && intersectionRatio >= 0.5;

          // Load video when it becomes visible
          if (visible && !shouldLoadRef.current) {
            shouldLoadRef.current = true;
            setShouldLoad(true);
          }

          // Play/pause based on visibility and reduced motion preference
          // Use refs to avoid stale closures
          const canPlay = shouldLoadRef.current && !prefersReducedMotionRef.current;
          
          if (canPlay) {
            if (visible && videoElement.paused) {
              videoElement.play().catch(() => {
                // Autoplay blocked - that's okay, user interaction required
              });
            } else if (!visible && !videoElement.paused) {
              videoElement.pause();
            }
          } else {
            // Pause if reduced motion is preferred or not loaded
            if (!videoElement.paused) {
              videoElement.pause();
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    observer.observe(container);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [prefersReducedMotion]); // Only re-run when reduced motion preference changes

  // Handle video errors - show poster as fallback
  const handleError = (event) => {
    setHasError(true);
    onError?.(event);
  };

  // Validate video URL
  if (!videoUrl) {
    // If no video URL but we have a poster, show the poster as fallback
    if (poster) {
      return (
        <SanityImage
          image={poster}
          alt={alt || 'Video poster'}
          width={width}
          height={height}
          className={fallbackClassName || className}
          {...props}
        />
      );
    }
    return null;
  }

  if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
    // If invalid video URL but we have a poster, show the poster as fallback
    if (poster) {
      return (
        <SanityImage
          image={poster}
          alt={alt || 'Video poster'}
          width={width}
          height={height}
          className={fallbackClassName || className}
          {...props}
        />
      );
    }
    return null;
  }

  // Show poster as fallback if video has error
  if (hasError && poster) {
    return (
      <SanityImage
        image={poster}
        alt={alt || 'Video poster'}
        width={width}
        height={height}
        className={fallbackClassName || className}
        {...props}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        '--video-aspect-ratio-padding': aspectRatioPadding,
      }}
      {...props}
    >
      <video
        ref={videoRef}
        poster={posterUrl || undefined}
        preload={shouldLoad ? preload : 'none'}
        autoPlay={false}
        muted={muted}
        playsInline={playsInline}
        controls={controls}
        loop={loop}
        width={width}
        height={height}
        style={{
          maxWidth: maxWidth ? `${maxWidth}px` : width ? `${width}px` : undefined,
          height: 'auto',
          objectFit: 'contain',
        }}
        aria-label={alt || 'Video'}
        onLoadedMetadata={() => onLoad?.()}
        onPlay={onPlay}
        onPause={onPause}
        onError={handleError}
      >
        <source src={videoUrl} type={videoMimeType} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
