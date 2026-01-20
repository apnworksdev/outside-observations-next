'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from '@app/_assets/archive/unexpected.module.css';
import TypewriterMessage from '@/app/_components/Home/TypewriterMessage';

const initialState = {
  status: 'idle',
  data: null,
  error: null,
};

function RefreshIcon() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.unexpectedConnectionsRefreshIcon}>
      <path d="M4.85948 2.04346C3.1883 1.53702 1.42299 2.48123 0.916546 4.15241C0.410106 5.82359 1.35432 7.5889 3.0255 8.09534C4.69668 8.60178 6.46199 7.65757 6.96843 5.98639C7.15266 5.37846 7.14493 4.75807 6.98006 4.19036" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M3.36899 0.455954L4.85396 2.04321L3.1723 3.46778" stroke="currentColor" strokeWidth="0.8"/>
    </svg>

  );
}

export default function UnexpectedConnectionsComparison({ postersPayload }) {
  const router = useRouter();
  const [{ status, data, error }, setState] = useState(initialState);
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    if (!postersPayload?.item1 || !postersPayload?.item2) {
      return;
    }

    setIsTypingDone(false);
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchComparison() {
      setState({ status: 'loading', data: null, error: null });

      try {
        const response = await fetch('/api/compare-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postersPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error ?? 'Failed to load comparison.');
        }

        const responseData = await response.json();
        const text =
          typeof responseData === 'string'
            ? responseData
            : responseData?.similarity ?? responseData?.analysis ?? null;

        if (!isCancelled) {
          setState({
            status: 'success',
            data: text,
            error: null,
          });
        }
      } catch (fetchError) {
        if (isCancelled || fetchError.name === 'AbortError') {
          return;
        }

        setState({
          status: 'error',
          data: null,
          error: fetchError.message ?? 'Failed to load comparison.',
        });
      }
    }

    fetchComparison();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [postersPayload]);

  const targetText = useMemo(() => {
    if (status === 'success' && data) {
      return data;
    }

    if (status === 'error') {
      return error ?? 'Failed to load comparison.';
    }

    return '';
  }, [status, data, error]);

  const isLoading = status === 'idle' || status === 'loading';

  const shouldRender =
    status === 'loading' ||
    status === 'error' ||
    (status === 'success' && Boolean(data));

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <div className={`${styles.unexpectedConnectionsItem} ${styles.unexpectedConnectionsComparisonItem}`}>
        <div
          className={styles.unexpectedConnectionsAnalysis}
          aria-live="polite"
          role={status === 'error' ? 'alert' : undefined}
        >
          <p>
            <TypewriterMessage
              text={targetText}
              isLoading={isLoading}
              typingSpeed={20}
              loadingSpeed={420}
              onComplete={() => setIsTypingDone(true)}
            />
          </p>
        </div>
      </div>
      {isTypingDone && (
        <button
          type="button"
          className={styles.unexpectedConnectionsRefreshBtn}
          onClick={() => router.refresh()}
          aria-label="Refresh"
        >
          <RefreshIcon />
          <span>Refresh</span>
        </button>
      )}
    </>
  );
}
