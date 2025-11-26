'use client';

import Link from 'next/link';
import styles from '@app/_assets/error.module.css';

/**
 * ErrorDisplay - Reusable error message component
 * Displays user-friendly error messages with optional actions
 */
export default function ErrorDisplay({
  title = 'Something went wrong',
  message = 'We encountered an error. Please try again.',
  error = null,
  onRetry = null,
  retryLabel = 'Try again',
  showHomeLink = true,
  className = '',
}) {
  return (
    <div
      className={`${styles.container} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      
      {error && process.env.NODE_ENV === 'development' && (
        <details className={styles.details}>
          <summary className={styles.summary}>
            Error details (development only)
          </summary>
          <pre className={styles.pre}>
            {typeof error === 'string' ? error : error?.message || JSON.stringify(error, null, 2)}
          </pre>
        </details>
      )}

      <div className={styles.actions}>
        {onRetry && (
          <button
            onClick={onRetry}
            className={styles.button}
            type="button"
          >
            {retryLabel}
          </button>
        )}
        {showHomeLink && (
          <Link
            href="/"
            className={styles.link}
          >
            Go home
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * InlineError - Smaller inline error message
 */
export function InlineError({ message, className = '' }) {
  if (!message) return null;

  return (
    <div
      className={`${styles.inlineError} ${className}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

/**
 * LoadingError - Error state for loading failures
 */
export function LoadingError({ onRetry, message = 'Failed to load content. Please try again.' }) {
  return (
    <ErrorDisplay
      title="Unable to load content"
      message={message}
      onRetry={onRetry}
      retryLabel="Retry"
    />
  );
}

