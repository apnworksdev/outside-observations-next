'use client';

import { useLayoutEffect } from 'react';
import {
  VIEW_CHANGE_EVENT,
  isValidArchiveView,
  readArchiveViewFromStorage,
  writeArchiveViewToStorage,
} from '../archiveStorage';

export function useArchiveViewSync({ setViewState }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    setViewState((prev) => {
      const storedView = readArchiveViewFromStorage();
      if (isValidArchiveView(storedView) && storedView !== prev) {
        return storedView;
      }
      return prev;
    });

    const handleExternalViewChange = (event) => {
      const nextView = event?.detail?.view;
      if (!isValidArchiveView(nextView)) {
        return;
      }

      setViewState((prev) => {
        if (prev === nextView) {
          return prev;
        }

        writeArchiveViewToStorage(nextView);
        return nextView;
      });
    };

    window.addEventListener(VIEW_CHANGE_EVENT, handleExternalViewChange);
    return () => {
      window.removeEventListener(VIEW_CHANGE_EVENT, handleExternalViewChange);
    };
  }, [setViewState]);
}
