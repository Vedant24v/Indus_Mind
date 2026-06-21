"use client";

import { useEffect, type ReactNode } from "react";

interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

function ErrorFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 max-w-md">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="bg-secondary hover:bg-secondary/80 text-sm font-medium px-4 py-2 rounded-lg border border-border transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export function ClientErrorBoundary({
  children,
  fallback: _fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  // Note: React 18 error boundaries must be class components.
  // For App Router, use the error.tsx convention instead.
  // This component is kept for inline error display.
  return <>{children}</>;
}

// App Router error boundary page component
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
  }, [error]);

  return <ErrorFallback error={error} reset={reset} />;
}
