'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_OPTIONS = {
  typingSpeed: 45,
  loadingSpeed: 280,
  loadingFrames: ['.', '..', '...', ''],
  isLoading: false,
};

export default function useTypewriter(targetText = '', options = {}) {
  const { typingSpeed, loadingSpeed, loadingFrames, isLoading } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const frames = useMemo(
    () => (loadingFrames.length > 0 ? loadingFrames : ['.', '..', '...', '']),
    [loadingFrames]
  );

  const [displayText, setDisplayText] = useState('');
  const targetRef = useRef(targetText ?? '');
  const typingTimeoutRef = useRef(null);
  const loadingIntervalRef = useRef(null);

  useEffect(() => {
    targetRef.current = targetText ?? '';
  }, [targetText]);

  useEffect(() => {
    if (!isLoading) {
      if (loadingIntervalRef.current !== null) {
        window.clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      return;
    }

    if (loadingIntervalRef.current !== null) {
      window.clearInterval(loadingIntervalRef.current);
    }

    let frameIndex = 0;
    setDisplayText(frames[frameIndex]);

    loadingIntervalRef.current = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      setDisplayText(frames[frameIndex]);
    }, loadingSpeed);

    return () => {
      if (loadingIntervalRef.current !== null) {
        window.clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [isLoading, frames, loadingSpeed]);

  useEffect(() => {
    if (isLoading) {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    const fullText = targetRef.current ?? '';
    if (!fullText) {
      setDisplayText('');
      return undefined;
    }

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    let index = 0;

    function typeNext() {
      setDisplayText(fullText.slice(0, index));

      if (index < fullText.length) {
        index += 1;
        typingTimeoutRef.current = window.setTimeout(typeNext, typingSpeed);
      }
    }

    setDisplayText('');
    typeNext();

    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [isLoading, typingSpeed, targetText]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (loadingIntervalRef.current !== null) {
        window.clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);

  return displayText;
}


