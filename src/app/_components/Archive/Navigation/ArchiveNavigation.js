'use client';

import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';

import styles from '@app/_assets/archive/archive-navigation.module.css';

const DEFAULT_LABEL = 'Explore';

export default function ArchiveNavigation({
  isOpen = false,
  onOpenChange = () => {},
  onItemSelect = () => {},
  items = [],
  activeItemId = null,
  panelId = null,
  isPanelOpen = false,
  isHidden = false,
}) {
  const hasLabelAppearedRef = useRef(false);
  const labelFadeTimeoutRef = useRef(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [labelState, dispatchLabelState] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'RESET':
          return {
            ...state,
            active: DEFAULT_LABEL,
            pending: null,
            isVisible: true,
            shouldDelay: !hasLabelAppearedRef.current,
          };
        case 'OPEN':
          return {
            ...state,
            isVisible: true,
            shouldDelay: !hasLabelAppearedRef.current,
          };
        case 'REQUEST_CHANGE': {
          const { nextLabel } = action.payload;
          if (nextLabel === state.active && state.isVisible) {
            return state;
          }

          if (!hasLabelAppearedRef.current) {
            return {
              ...state,
              active: nextLabel,
              pending: null,
              shouldDelay: false,
            };
          }

          return {
            ...state,
            pending: nextLabel,
            isVisible: false,
            shouldDelay: false,
          };
        }
        case 'FADE_IN': {
          if (!state.isVisible) {
            hasLabelAppearedRef.current = true;
            return {
              ...state,
              active: state.pending ?? DEFAULT_LABEL,
              pending: null,
              isVisible: true,
              shouldDelay: false,
            };
          }

          hasLabelAppearedRef.current = true;
          return state;
        }
        case 'FORCE_FADE_IN': {
          hasLabelAppearedRef.current = true;
          return {
            ...state,
            active: state.pending ?? DEFAULT_LABEL,
            pending: null,
            isVisible: true,
            shouldDelay: false,
          };
        }
        default:
          return state;
      }
    },
    {
      active: DEFAULT_LABEL,
      pending: null,
      isVisible: true,
      shouldDelay: true,
    }
  );
  const menuId = useId();
  const resolvedMenuId = isHydrated ? menuId : undefined;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      dispatchLabelState({ type: 'RESET' });
      return;
    }

    dispatchLabelState({ type: 'OPEN' });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      hasLabelAppearedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const clearLabelFadeTimeout = useCallback(() => {
    if (labelFadeTimeoutRef.current !== null) {
      window.clearTimeout(labelFadeTimeoutRef.current);
      labelFadeTimeoutRef.current = null;
    }
  }, []);

  const scheduleForcedFadeIn = useCallback(() => {
    clearLabelFadeTimeout();
    labelFadeTimeoutRef.current = window.setTimeout(() => {
      dispatchLabelState({ type: 'FORCE_FADE_IN' });
    }, 300);
  }, [clearLabelFadeTimeout, dispatchLabelState]);

  const requestLabelChange = (label) => {
    if (!isOpen || isHidden) {
      return;
    }

    const nextLabel = label ?? DEFAULT_LABEL;

    dispatchLabelState({
      type: 'REQUEST_CHANGE',
      payload: { nextLabel },
    });
  };

  const handleLabelTransitionEnd = (event) => {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== 'opacity' ||
      !isOpen ||
      isHidden
    ) {
      return;
    }

    clearLabelFadeTimeout();
    dispatchLabelState({ type: 'FADE_IN' });
  };

  useEffect(() => {
    if (!isOpen) {
      clearLabelFadeTimeout();
      return;
    }

    if (!labelState.isVisible) {
      scheduleForcedFadeIn();
      return;
    }

    clearLabelFadeTimeout();
  }, [isOpen, labelState.isVisible, clearLabelFadeTimeout, scheduleForcedFadeIn]);

  useEffect(() => {
    return () => {
      clearLabelFadeTimeout();
    };
  }, [clearLabelFadeTimeout]);

  return (
    <nav
      className={styles.archiveNavigation}
      data-state={isOpen ? 'open' : 'closed'}
      data-presence={isHidden ? 'hidden' : 'visible'}
      aria-label="Archive navigation"
      aria-hidden={isHidden}
    >
      <button
        type="button"
        className={styles.archiveNavigationToggle}
        aria-expanded={isOpen}
        aria-controls={resolvedMenuId}
        aria-label={isOpen ? 'Collapse archive navigation' : 'Expand archive navigation'}
        onClick={() => onOpenChange(!isOpen)}
      />
      <div
        id={resolvedMenuId}
        role="group"
        aria-label="Browse archive by category"
        className={styles.archiveNavigationButtons}
        data-state={isOpen ? 'open' : 'closed'}
        aria-hidden={!isOpen}
      >
        {items.map(({ id, label, className, href }) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            className={`${styles.archiveNavigationButton} ${className}`}
            disabled={!isOpen}
            data-item={id}
            aria-pressed={activeItemId === id ? 'true' : 'false'}
            aria-controls={panelId ?? undefined}
            aria-expanded={activeItemId === id && isPanelOpen ? 'true' : 'false'}
            onMouseEnter={() => requestLabelChange(label)}
            onMouseLeave={() => requestLabelChange(DEFAULT_LABEL)}
            onFocus={() => requestLabelChange(label)}
            onBlur={() => requestLabelChange(DEFAULT_LABEL)}
            onClick={() => onItemSelect(id, href)}
          />
        ))}
      </div>
      <p
        className={styles.archiveNavigationLabel}
        aria-hidden={!isOpen}
        data-visibility={
          isHydrated ? (labelState.isVisible ? 'visible' : 'hidden') : 'visible'
        }
        data-delay={
          isHydrated ? (labelState.shouldDelay ? 'true' : 'false') : 'true'
        }
        onTransitionEnd={handleLabelTransitionEnd}
      >
        {labelState.active}
      </p>
    </nav>
  );
}