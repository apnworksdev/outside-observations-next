'use client';

import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { urlForImage } from '@/sanity/lib/image';
import styles from '@app/_assets/archive/archive-entry.module.css';

// Format time as MM:SS (always 2 digits for minutes and seconds)
const formatTime = (seconds) => {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Play/Pause button - only re-renders when play state changes
const PlayPauseButton = memo(({ isPlaying, onTogglePlayPause }) => {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onTogglePlayPause();
  }, [onTogglePlayPause]);

  return (
    <div>
      <button onClick={handleClick}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
});
PlayPauseButton.displayName = 'PlayPauseButton';

// Progress bar - smooth continuous updates like YouTube
const ProgressBar = ({ videoRef }) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateProgress = () => {
      if (videoElement.duration && videoElement.duration > 0) {
        const newProgress = (videoElement.currentTime / videoElement.duration) * 100;
        setProgress(newProgress);
      }
      // Always continue the loop for smooth updates (like YouTube)
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    // Start continuous animation frame loop
    rafRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [videoRef]);

  return (
    <div className={styles.archiveEntryVideoProgress}>
      <div 
        className={styles.archiveEntryVideoProgressBar}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// Duration display - only re-renders when duration loads
const DurationDisplay = memo(({ videoRef }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateDuration = () => {
      if (videoElement.duration && isFinite(videoElement.duration)) {
        setDuration(videoElement.duration);
      }
    };

    videoElement.addEventListener('loadedmetadata', updateDuration);
    videoElement.addEventListener('durationchange', updateDuration);

    // Check if already loaded
    if (videoElement.duration && isFinite(videoElement.duration)) {
      setDuration(videoElement.duration);
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', updateDuration);
      videoElement.removeEventListener('durationchange', updateDuration);
    };
  }, [videoRef]);

  return <div>{formatTime(duration)}</div>;
});
DurationDisplay.displayName = 'DurationDisplay';

/**
 * ArchiveEntryVideo - Simple video player for archive entry pages
 * Click to play/pause
 */
export default function ArchiveEntryVideo({ video, poster, alt }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFull, setIsFull] = useState(false);

  const videoUrl = video?.asset?.url;
  const videoMimeType = video?.asset?.mimeType || 'video/mp4';
  const posterUrl = poster ? urlForImage(poster) : null;

  // Shared play/pause toggle function (must be before any early returns)
  const handleTogglePlayPause = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (videoElement.paused) {
      // play() returns a promise that can be rejected
      videoElement.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          // Handle play promise rejection (e.g., autoplay policies, network errors)
          console.error('Error playing video:', error);
          setIsPlaying(false);
        });
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleToggleFull = useCallback((e) => {
    e.stopPropagation();
    setIsFull((prev) => !prev);
  }, []);

  // Add/remove full class on video element (must be before any early returns)
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isFull) {
      videoElement.classList.add(styles.archiveEntryVideoFull);
    } else {
      videoElement.classList.remove(styles.archiveEntryVideoFull);
    }
  }, [isFull]);

  // Calculate aspect ratio padding from poster dimensions
  const posterAspectRatio = poster?.dimensions?.aspectRatio;
  const aspectRatioPadding = posterAspectRatio 
    ? `${(1 / posterAspectRatio) * 100}%`
    : '100%';

  // Validate video URL
  if (!videoUrl) {
    return null;
  }

  if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
    return null;
  }

  const handleVideoClick = (e) => {
    // Don't trigger if clicking on controls
    if (e.target.closest(`.${styles.archiveEntryVideoControls}`)) {
      return;
    }
    handleTogglePlayPause();
  };

  return (
    <div
      className={styles.archiveEntryVideoContainer}
      style={{
        '--video-aspect-ratio-padding': aspectRatioPadding,
      }}
      onClick={handleVideoClick}
    >
      <video
        ref={videoRef}
        poster={posterUrl || undefined}
        preload="auto"
        playsInline
        controls={false}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          const videoElement = videoRef.current;
          if (videoElement) {
            videoElement.currentTime = 0;
          }
        }}
        onError={(e) => {
          console.error('Video error:', e);
          setIsPlaying(false);
        }}
        aria-label={alt || 'Video'}
        className={styles.archiveEntryVideo}
      >
        <source src={videoUrl} type={videoMimeType} />
      </video>
      <div 
        className={styles.archiveEntryVideoControls}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.archiveEntryVideoControlBubble} ${styles.archiveEntryVideoControlBubblePlayPause}`}>
          <PlayPauseButton 
            isPlaying={isPlaying} 
            onTogglePlayPause={handleTogglePlayPause}
          />
        </div>
        <div className={`${styles.archiveEntryVideoControlBubble} ${styles.archiveEntryVideoControlBubbleProgressBar}`}>
          <ProgressBar videoRef={videoRef} />
        </div>
        <div className={`${styles.archiveEntryVideoControlBubble} ${styles.archiveEntryVideoControlBubbleDuration}`}>
          <DurationDisplay videoRef={videoRef} />
        </div>
        <div className={`${styles.archiveEntryVideoControlBubble} ${styles.archiveEntryVideoControlBubbleFull}`}>
          <button onClick={handleToggleFull}>
            {isFull ? 'Back' : 'Full'}
          </button>
        </div>
      </div>
    </div>
  );
}
