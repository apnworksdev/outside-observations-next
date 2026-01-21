'use client';

import { useCallback, useEffect, useRef } from 'react';

import styles from '@app/_assets/archive/unexpected.module.css';

function setGlobalPrimaryMediaHeight(value) {
  if (typeof document !== 'undefined') {
    if (value) {
      document.documentElement.style.setProperty('--unexpected-primary-media-height', `${value}px`);
    } else {
      document.documentElement.style.removeProperty('--unexpected-primary-media-height');
    }
  }
}

export default function UnexpectedConnectionsEmpty({ message }) {
  const sectionRef = useRef(null);
  const measurementFrameRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const measure = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (measurementFrameRef.current != null) {
      window.cancelAnimationFrame(measurementFrameRef.current);
    }
    measurementFrameRef.current = window.requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (!el) return;
      const { height } = el.getBoundingClientRect();
      if (height > 0) {
        setGlobalPrimaryMediaHeight(Math.round(height * 10) / 10);
      }
      measurementFrameRef.current = null;
    });
  }, []);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const el = sectionRef.current;
    if (!el || !window.ResizeObserver) return undefined;
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    resizeObserverRef.current = new ResizeObserver(measure);
    resizeObserverRef.current.observe(el);
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [measure]);

  useEffect(() => {
    return () => {
      if (measurementFrameRef.current != null) {
        window.cancelAnimationFrame(measurementFrameRef.current);
      }
      setGlobalPrimaryMediaHeight(null);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.unexpectedConnectionsEmpty} data-state="empty">
      <p className={styles.unexpectedConnectionsEmptyMessage}>{message}</p>
    </section>
  );
}
