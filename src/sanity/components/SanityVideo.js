'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { urlForImage } from '@/sanity/lib/image';
import SanityImage from '@/sanity/components/SanityImage';

/**
 * SanityVideo - An optimized video component for Sanity-hosted videos
 * Features:
 * - Lazy loading with Intersection Observer
 * - Autoplay when visible, pause when not
 * - Poster image support with smooth transition
 * - Proper preload strategy
 * - Error handling and fallbacks
 * - Performance optimizations
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
  onLoad,
  onPlay,
  onPause,
  onError,
  ...props
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const isVisibleRef = useRef(false);
  const [shouldPreload, setShouldPreload] = useState(priority);
  const [hasError, setHasError] = useState(false);

  // Get video URL from Sanity file asset
  // Sanity file URLs should work directly, but we ensure it's a valid URL
  let videoUrl = video?.asset?.url;
  const videoMimeType = video?.asset?.mimeType || 'video/mp4';
  
  // Ensure URL is properly formatted for video playback
  // Don't add ?dl= for video playback (that's for downloads)
  // The URL from Sanity should work directly for video elements
  
  // Get poster URL from Sanity image
  const posterUrl = poster ? urlForImage(poster) : null;
  
  // Calculate aspect ratio padding for responsive container
  // Uses padding-bottom trick: padding-bottom = (1 / aspectRatio) * 100%
  const posterAspectRatio = poster?.dimensions?.aspectRatio;
  const aspectRatioPadding = posterAspectRatio 
    ? `${(1 / posterAspectRatio) * 100}%`
    : width && height
    ? `${(height / width) * 100}%`
    : '100%'; // Default to square if no aspect ratio

  // Handle video play
  const handlePlay = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    try {
      await videoElement.play();
      onPlay?.(videoElement);
    } catch (error) {
      // Silently handle play errors (autoplay restrictions, etc.)
    }
  }, [onPlay]);

  // Handle video pause
  const handlePause = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.pause();
    onPause?.(videoElement);
  }, [onPause]);

  // Handle video errors
  const handleError = useCallback((event) => {
    const videoElement = event.target;
    const error = videoElement.error;
    
    // Handle video errors silently, show fallback
    setHasError(true);
    onError?.(event);
  }, [onError]);

  // Play when visible on screen, pause when not
  useEffect(() => {
    if (priority) {
      setShouldPreload(true);
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          const intersectionRatio = entry.intersectionRatio;
          const wasVisible = isVisibleRef.current;
          const isVisible = isIntersecting && intersectionRatio >= 0.5;
          isVisibleRef.current = isVisible;

          // Start loading when visible (check current state, don't depend on it)
          if (isVisible && !priority) {
            setShouldPreload((prev) => {
              if (!prev) return true;
              return prev;
            });
          }

          // Play when visible, pause when not visible
          if (isVisible) {
            // Video is visible - play when ready
            if (videoElement.readyState >= 2) {
              if (videoElement.paused) {
                handlePlay();
              }
            } else if (!wasVisible) {
              // Just became visible, wait for video to load then play
              const playWhenReady = () => {
                if (isVisibleRef.current && videoElement.readyState >= 2 && videoElement.paused) {
                  handlePlay();
                }
              };
              videoElement.addEventListener('loadedmetadata', playWhenReady, { once: true });
              videoElement.addEventListener('canplay', playWhenReady, { once: true });
            }
          } else {
            // Video is not visible - pause
            if (!videoElement.paused) {
              handlePause();
            }
          }
        });
      },
      {
        rootMargin: priority ? '0px' : '50px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    observer.observe(videoElement);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      isVisibleRef.current = false;
    };
  }, [priority, handlePlay, handlePause]);

  // Cleanup on unmount
  useEffect(() => {
    const videoElement = videoRef.current;
    const observer = observerRef.current;
    
    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (videoElement && typeof videoElement.pause === 'function') {
        videoElement.pause();
        videoElement.src = '';
        videoElement.load();
      }
    };
  }, []);

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    onLoad?.(videoRef.current);
  }, [onLoad]);

  // Validate video URL
  if (!videoUrl) {
    return null;
  }

  if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
    return null;
  }

  const currentPreload = shouldPreload ? (priority ? 'auto' : preload) : 'none';

  // If video has error, show poster as fallback
  if (hasError && poster) {
    return (
      <SanityImage
        image={poster}
        alt={alt || 'Video poster'}
        width={width}
        height={height}
        className={fallbackClassName}
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
        preload={currentPreload}
        muted={muted}
        playsInline={playsInline}
        controls={controls}
        loop={loop}
        aria-label={alt || 'Video'}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={onPlay}
        onPause={onPause}
        onError={handleError}
      >
        {currentPreload !== 'none' && <source src={videoUrl} type={videoMimeType} />}
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
