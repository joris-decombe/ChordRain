"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--color-void)] text-[var(--color-text)] p-8">
          <div className="max-w-md text-center pixel-panel p-8">
            <div className="text-6xl mb-6 font-mono">:(</div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="pixel-text-muted mb-6">
              ChordRain encountered an unexpected error. This might be a temporary issue.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm pixel-text-subtle cursor-pointer hover:pixel-text-accent">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 pixel-inset text-xs pixel-text-muted overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 pixel-btn-primary font-bold"
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
