'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import styles from '@app/_assets/layout/nav.module.css';

/**
 * Generic header dropdown (used by "OO Laboratory").
 * Items are either links or buttons, so the moodboard visualizer can open a
 * panel while Unexpected Connections navigates to its own page.
 */
const VIEWPORT_MARGIN = 10;

export default function NavDropdown({ label = '', items = [], className = '', isActive = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  /**
   * The menu is absolutely positioned under its trigger, so on narrow screens
   * (or with a large font size) it can run past the right edge. Shift it back
   * by however much it overflows instead of letting the layout reflow.
   */
  const clampIntoViewport = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    menu.style.transform = '';
    // On mobile the panel is in the flow and already width-constrained; nudging
    // it would shift it off the drawer's left edge.
    if (window.getComputedStyle(menu).position !== 'absolute') {
      return;
    }
    const overflow = menu.getBoundingClientRect().right - (window.innerWidth - VIEWPORT_MARGIN);
    if (overflow > 0) {
      menu.style.transform = `translateX(-${Math.ceil(overflow)}px)`;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (menuRef.current) {
        menuRef.current.style.transform = '';
      }
      return undefined;
    }

    clampIntoViewport();
    window.addEventListener('resize', clampIntoViewport);
    return () => window.removeEventListener('resize', clampIntoViewport);
  }, [isOpen, clampIntoViewport]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <li
      className={`${styles.navLi} ${styles.navDropdown} ${className}`}
      ref={containerRef}
      data-open={isOpen}
      data-active={isActive ? 'true' : 'false'}
    >
      <button
        type="button"
        className={`${styles.navLink} ${styles.navBubble} ${styles.navDropdownTrigger}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {label}
        <span className={styles.navDropdownChevron} aria-hidden="true" />
      </button>
      <ul className={styles.navDropdownMenu} id={menuId} ref={menuRef} hidden={!isOpen}>
        {items.map((item) => (
          <li key={item.label} className={styles.navDropdownItem}>
            {item.href ? (
              <a
                href={item.href}
                className={styles.navBubble}
                data-transition={item.external ? undefined : 'nav'}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
              >
                {item.label}
              </a>
            ) : (
              <button
                type="button"
                className={styles.navBubble}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}
