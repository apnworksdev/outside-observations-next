'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from '@app/_assets/layout/nav.module.css';
import { getLocalStorage, setLocalStorage } from '@/app/_helpers/storage/localStorage';

const STORAGE_KEY = 'outside-observations-archive-thumb-size-fluid';

const DESKTOP_RANGE = [70, 620];
const MOBILE_RANGE = [90, 360];
const DEFAULT_POSITION = 28;
const MOBILE_QUERY = '(max-width: 768px)';
const DEFAULT_PER_ROW_DESKTOP = 6;
const DEFAULT_PER_ROW_MOBILE = 2;

function clampPosition(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_POSITION;
  }
  return Math.min(100, Math.max(0, parsed));
}

function widthFor([min, max], position) {
  return Math.round(min + ((max - min) * position) / 100);
}

function positionFor([min, max], width) {
  return Math.min(100, Math.max(0, ((width - min) / (max - min)) * 100));
}

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
