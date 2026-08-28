'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from '@app/_assets/layout/nav.module.css';
import { getLocalStorage, setLocalStorage } from '@/app/_helpers/storage/localStorage';

// Suffixed: the previous slider stored levels 1-4, which would be read back as
// positions of 1-4% and shrink the thumbnails to nothing for returning visitors.
const STORAGE_KEY = 'outside-observations-archive-thumb-size-fluid';

/**
 * Fluid sizing. The slider drives the *minimum* width of a thumbnail and the
 * grid fits as many columns as that allows (auto-fill), so the images scale
 * continuously instead of jumping between whole grid spans.
 *
 * The stored value is a 0-100 position rather than a width, so a size chosen on
 * desktop stays meaningful on mobile: the same position maps into a narrower
 * range there, where 620px would never fit.
 */
const DESKTOP_RANGE = [70, 620];
const MOBILE_RANGE = [90, 360];
const DEFAULT_POSITION = 28;
const MOBILE_QUERY = '(max-width: 768px)';
// The layout the site had before the slider existed, and the size a first-time
// visitor should land on: 6 thumbnails per row, 2 on mobile.
const DEFAULT_PER_ROW_DESKTOP = 6;
const DEFAULT_PER_ROW_MOBILE = 2;

function clampPosition(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_POSITION;
  }
  return Math.min(100, Math.max(0, parsed));
}

// Rounded to whole pixels: the slider's 0.1 steps span half a pixel, so this is
// the real granularity -- one pixel of growth per step, which reads as smooth.
function widthFor([min, max], position) {
  return Math.round(min + ((max - min) * position) / 100);
}

function positionFor([min, max], width) {
  return Math.min(100, Math.max(0, ((width - min) / (max - min)) * 100));
}

/**
 * Default position, derived from the viewport rather than hardcoded: a width in
 * pixels means a different number of thumbnails per row on a 13" laptop and on
 * a 27" display, so the fallback is expressed as a count and converted here.
 */
function defaultPosition() {
  const isMobile = window.matchMedia(MOBILE_QUERY).matches;
  const perRow = isMobile ? DEFAULT_PER_ROW_MOBILE : DEFAULT_PER_ROW_DESKTOP;
  const range = isMobile ? MOBILE_RANGE : DESKTOP_RANGE;
  const width = document.documentElement.clientWidth / perRow;
  return Number.isFinite(width) && width > 0 ? positionFor(range, width) : DEFAULT_POSITION;
}

export default function ArchiveThumbnailSizer() {
  const [position, setPosition] = useState(DEFAULT_POSITION);

  const applyWidth = useCallback((value) => {
    const root = document.documentElement;
    root.style.setProperty('--archive-thumb-min', `${widthFor(DESKTOP_RANGE, value)}px`);
    root.style.setProperty('--archive-thumb-min-mobile', `${widthFor(MOBILE_RANGE, value)}px`);
  }, []);

  useEffect(() => {
    const stored = getLocalStorage(STORAGE_KEY);
    const next = clampPosition(stored ?? defaultPosition());
    setPosition(next);
    applyWidth(next);
  }, [applyWidth]);

  const handleChange = (event) => {
    const next = clampPosition(event.target.value);
    setPosition(next);
    applyWidth(next);
    setLocalStorage(STORAGE_KEY, String(next));
  };

  return (
    <div className={`${styles.thumbSizer} ${styles.navBubble}`}>
      <label className={styles.thumbSizerLabel} htmlFor="archive-thumb-size">
        Size
      </label>
      <input
        id="archive-thumb-size"
        className={styles.thumbSizerInput}
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={position}
        onChange={handleChange}
        aria-label="Thumbnail size"
      />
    </div>
  );
}
