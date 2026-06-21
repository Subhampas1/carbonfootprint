/**
 * ErrorBoundary — React class component for catching render-phase errors.
 *
 * Provides an accessible error UI with:
 *   - aria-live="assertive" to immediately announce the error to screen readers
 *   - A retry button that resets the error state
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="min-h-screen flex items-center justify-center p-8 bg-gray-50"
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4" aria-hidden="true">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-2">An unexpected error occurred in the application.</p>
            {this.state.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mb-6 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="
                bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold
                hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
                focus:ring-offset-2 transition-colors duration-200
              "
              aria-label="Retry loading the application"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
