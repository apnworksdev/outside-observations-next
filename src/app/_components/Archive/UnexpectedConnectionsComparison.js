'use client';

import { useEffect, useMemo, useState } from 'react';

import styles from '@app/_assets/archive/unexpected.module.css';
import TypewriterMessage from '@/app/_components/Home/TypewriterMessage';

const initialState = {
  status: 'idle',
  data: null,
  error: null,
};

export default function UnexpectedConnectionsComparison({ postersPayload }) {
  const [{ status, data, error }, setState] = useState(initialState);

  useEffect(() => {
    if (!postersPayload?.item1 || !postersPayload?.item2) {
      return;
    }

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
        />
      </p>
    </div>
  );
}
