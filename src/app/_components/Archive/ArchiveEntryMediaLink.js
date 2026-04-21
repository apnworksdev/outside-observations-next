'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePrefetchOnHover } from '@/app/_hooks/usePrefetchOnHover';
import { useContentWarningConsent } from '@/app/_contexts/ContentWarningConsentContext';
import { useArchiveEntryVisited } from '@/app/_hooks/useArchiveEntryVisited';
import { trackArchiveEntryClickFromEntry } from '@/app/_helpers/gtag';
import { saveArchiveScrollPosition } from '@/app/_hooks/useArchiveScrollPosition';
import { useArchiveEntries } from './ArchiveEntriesProvider';
import ArchiveVisualEssay from '@/app/_components/Archive/ArchiveVisualEssay';
import SanityVideo from '@/sanity/components/SanityVideo';
import SanityImage from '@/sanity/components/SanityImage';
import { ProtectedMediaWrapper } from '@/app/_components/Archive/ProtectedMediaWrapper';
import styles from '@app/_assets/archive/archive-page.module.css';

const POSTER_WIDTH = 300;

export default function ArchiveEntryMediaLink({ entry, onImageLoad, index = 0 }) {
  const slug = entry.metadata?.slug || entry.slug;
  const hasSlug = slug?.current;
  const slugValue = slug?.current || null;
  const isVisualEssay = entry.mediaType === 'visualEssay';
  const [currentImage, setCurrentImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const href = hasSlug
    ? `/archive/entry/${slug.current}${isVisualEssay ? `?image=${currentImageIndex}` : ''}`
    : null;
  const prefetchHandlers = usePrefetchOnHover(href, 300);
  const isPriority = index < 4;
  const isVideo = entry.mediaType === 'video';
  const posterHeight = entry?.poster?.dimensions?.aspectRatio
    ? Math.round(POSTER_WIDTH / entry.poster.dimensions.aspectRatio)
    : POSTER_WIDTH;

  const isVisited = useArchiveEntryVisited(slugValue);

  const { hasConsent } = useContentWarningConsent();
  const hasContentWarning = entry.metadata?.contentWarning === true;

  const { view, searchStatus } = useArchiveEntries();

  const prepareNavigationRestore = () => {
    if (view) {
      try {
        saveArchiveScrollPosition(view);
      } catch {
        // Ignore storage errors
      }
    }
  };

  const handleMouseDown = () => {
    prepareNavigationRestore();
    trackArchiveEntryClickFromEntry(entry, view ?? 'images', searchStatus ?? {});
  };

  const handleClick = () => {
    prepareNavigationRestore();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      prepareNavigationRestore();
    }
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      prepareNavigationRestore();
    }
  };

  const overlayMeta = isVisualEssay && currentImage?.metadata
    ? currentImage.metadata
    : entry.metadata;
  const overlayYear = overlayMeta?.year?.value ?? entry.year ?? '';
  const overlaySource = overlayMeta?.source || entry.source || '';
  const overlayArtName = overlayMeta?.artName || entry.artName || '';

  const hasYear = String(overlayYear ?? '').trim() !== '';
  const hasSource = String(overlaySource ?? '').trim() !== '';
  const hasArtName = String(overlayArtName ?? '').trim() !== '';

  const shouldShowMetadataOverlay = !hasContentWarning || hasConsent;
  const shouldShowOverlayContent = shouldShowMetadataOverlay && !isVisualEssay;

  const content = (
    <div className={styles.archiveEntryImageWrapper}>
      {isVisualEssay ? (
        <ArchiveVisualEssay
          entry={entry}
          width={POSTER_WIDTH}
          contentWarning={entry.metadata?.contentWarning}
          priority={isPriority}
          onCurrentImageChange={(img, idx) => {
            setCurrentImage(img);
            if (typeof idx === 'number') setCurrentImageIndex(idx);
          }}
        />
      ) : isVideo && (entry.video?.asset?.url || entry.vimeoUrl || entry.videoExcerptUrl) ? (
        <ProtectedMediaWrapper
          contentWarning={entry.metadata?.contentWarning}
        >
          <SanityVideo
            video={entry.video}
            poster={entry.poster}
            vimeoUrl={entry.videoExcerptUrl || entry.vimeoUrl}
            alt={entry.metadata?.artName || entry.artName || 'Archive entry video'}
            className={styles.archiveEntryVideo}
            fallbackClassName={styles.archiveEntryImage}
            width={POSTER_WIDTH}
            height={posterHeight}
            priority={isPriority}
            preload={isPriority ? 'metadata' : 'none'}
            muted
            playsInline
            onLoad={onImageLoad}
          />
        </ProtectedMediaWrapper>
      ) : (
        <ProtectedMediaWrapper
          contentWarning={entry.metadata?.contentWarning}
        >
          <SanityImage
            image={entry.poster}
            alt={entry.metadata?.artName || entry.artName || 'Archive entry poster'}
            className={styles.archiveEntryImage}
            width={POSTER_WIDTH}
            height={posterHeight}
            priority={isPriority}
            loading={isPriority ? undefined : 'lazy'}
            placeholder={entry?.poster?.lqip ? 'blur' : undefined}
            blurDataURL={entry?.poster?.lqip || undefined}
            quality={isPriority ? 70 : 60}
            onLoad={onImageLoad}
          />
        </ProtectedMediaWrapper>
      )}
      {shouldShowMetadataOverlay && (
        <div className={styles.archiveEntryImageOverlay}>
          {shouldShowOverlayContent && (
            <div className={styles.archiveEntryImageOverlayContent}>
              {hasYear && (
                <div className={styles.archiveEntryImageOverlayContentItem}><p>{overlayYear}</p></div>
              )}
              {hasSource && (
                <div className={styles.archiveEntryImageOverlayContentItem}><p>{overlaySource}</p></div>
              )}
              {hasArtName && (
                <div className={styles.archiveEntryImageOverlayContentItem}><p>{overlayArtName}</p></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const linkProps = {
    className: styles.archiveEntryImageLink,
    'data-visited': isVisited ? 'true' : 'false',
  };

  const isLinkDisabled = hasContentWarning && !hasConsent;
  const shouldRenderLink = hasSlug && !isLinkDisabled;

  return (
    <div className={styles.archiveEntryImageContainer}>
      {shouldRenderLink ? (
        <Link
          href={href}
          scroll={false}
          {...linkProps}
          {...prefetchHandlers}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
        >
          {content}
        </Link>
      ) : (
        <div {...linkProps}>
          {content}
        </div>
      )}
    </div>
  );
}
