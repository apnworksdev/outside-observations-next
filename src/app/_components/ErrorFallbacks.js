'use client';

import ErrorDisplay from './ErrorDisplay';

/**
 * Error Fallback Components
 * These are client components that can be passed to ErrorBoundary from server components
 */

export function ArchiveEntryErrorFallback({ error, reset }) {
  return (
    <ErrorDisplay
      title="Unable to display archive entry"
      message="There was an error loading this archive entry. Please try again."
      error={error}
      onRetry={reset}
      showHomeLink={true}
    />
  );
}

export function ArchiveErrorFallback({ error, reset }) {
  return (
    <ErrorDisplay
      title="Unable to load archive"
      message="There was an error loading the archive. Please try refreshing the page."
      error={error}
      onRetry={reset}
    />
  );
}

export function HomeErrorFallback({ error, reset }) {
  return (
    <ErrorDisplay
      title="Unable to load home page"
      message="There was an error loading the home page. Please try refreshing."
      error={error}
      onRetry={reset}
    />
  );
}

export function ChatErrorFallback({ error, reset }) {
  return (
    <ErrorDisplay
      title="Chat interface unavailable"
      message="The chat interface encountered an error. Please try refreshing the page."
      error={error}
      onRetry={reset}
    />
  );
}

export function ArchiveListErrorFallback({ error, reset }) {
  return (
    <ErrorDisplay
      title="Unable to display archive"
      message="There was an error loading the archive. Please try refreshing the page."
      error={error}
      onRetry={reset}
    />
  );
}

