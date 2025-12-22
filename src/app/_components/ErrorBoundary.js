'use client';

import { Component } from 'react';
import ErrorDisplay from './ErrorDisplay';
import styles from '@app/_assets/error.module.css';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (both dev and prod for debugging)
    // In production, these will appear in your hosting platform's logs
    console.error('ErrorBoundary caught an error:', {
      error: error?.toString(),
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });

    // TODO: Integrate error tracking service for production monitoring
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI - can be a component or a render function
      if (this.props.fallback) {
        // Render as component (all our fallbacks are components)
        // Always pass valid props to avoid destructuring errors
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error || null} reset={this.handleReset || (() => {})} />;
      }

      // Default fallback UI
      const errorDetails = process.env.NODE_ENV === 'development' && this.state.error
        ? {
            error: this.state.error,
            errorInfo: this.state.errorInfo,
          }
        : null;

      return (
        <ErrorDisplay
          title="Something went wrong"
          message="We encountered an unexpected error. Please try refreshing the page."
          error={errorDetails ? `${this.state.error.toString()}\n${this.state.errorInfo?.componentStack || ''}` : null}
          onRetry={this.handleReset}
          retryLabel="Try again"
          showHomeLink={true}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary(Component, fallback) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

