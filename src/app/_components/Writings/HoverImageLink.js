'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import styles from '@app/_assets/writings/writings-article.module.css';
import SanityImage from '@/sanity/components/SanityImage';

/**
 * Text that reveals its image while hovered. The image normally sits above the
 * text; when the link is too close to the top of the window it flips below, so
 * the image is never cut off by the edge of the screen.
 */
const MAX_WIDTH = 460;
const MAX_HEIGHT_RATIO = 0.5;

export default function HoverImageLink({ image, caption, children }) {
  const [placement, setPlacement] = useState('above');
  // Touch devices have no hover: there, a tap opens the image as a centred
  // overlay and a second tap (or a tap outside) closes it.
  const [isOpen, setIsOpen] = useState(false);
  const linkRef = useRef(null);
  const ratio = image?.dimensions?.aspectRatio || 1;

  // Size is handled in CSS from the aspect ratio, so a portrait image shrinks
  // instead of overflowing even before this runs. Here we only decide whether
  // there is room above the text, and flip the image below when there is not.
  const choosePlacement = useCallback(() => {
    const node = linkRef.current;
    if (!node) {
      return;
    }

    const width = Math.min(MAX_WIDTH, window.innerHeight * MAX_HEIGHT_RATIO * ratio);
    const neededAbove = width / ratio + 40;
    setPlacement(node.getBoundingClientRect().top < neededAbove ? 'below' : 'above');
  }, [ratio]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeIfOutside = (event) => {
      if (!linkRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeIfOutside);
    return () => document.removeEventListener('pointerdown', closeIfOutside);
  }, [isOpen]);

  const toggle = useCallback(
    (event) => {
      event.preventDefault();
      choosePlacement();
      setIsOpen((open) => !open);
    },
    [choosePlacement]
  );

  return (
    <span
      ref={linkRef}
      className={styles.hoverImageLink}
      tabIndex={0}
      role="button"
      aria-expanded={isOpen}
      data-open={isOpen}
      onMouseEnter={choosePlacement}
      onFocus={choosePlacement}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          toggle(event);
        }
      }}
    >
      {children}
      <span
        className={styles.hoverImageFigure}
        data-placement={placement}
        style={{ '--hover-image-ratio': ratio }}
        aria-hidden="true"
      >
        {caption ? <span className={styles.hoverImageCaption}>{caption}</span> : null}
        <SanityImage
          image={image}
          alt={caption || ''}
          width={900}
          height={ratio ? Math.round(900 / ratio) : 900}
          sizes="(max-width: 768px) 80vw, 460px"
          placeholder={image?.lqip ? 'blur' : undefined}
          blurDataURL={image?.lqip || undefined}
        />
      </span>
    </span>
  );
}
