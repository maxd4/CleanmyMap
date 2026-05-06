"use client";

import { Component, ReactNode } from "react";
import { ServerErrorCard } from "@/components/ui/server-error-card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: (Error & { digest?: string }) | null;
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
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[220px] items-center justify-center p-6">
          <ServerErrorCard
            className="w-full max-w-2xl"
            onRetry={this.reset}
            title="Un composant a rencontré un problème."
            message="Le reste de la page reste utilisable. Vous pouvez réessayer maintenant ou revenir au tableau de bord."
            referenceCode={this.state.error?.digest}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackProps?: Partial<ErrorBoundaryProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...fallbackProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
