import * as React from "react";

import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
  componentStack: string | null;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    componentStack: null,
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // This prints a React component stack which usually pinpoints the offending component.
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Caught error:", error);
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Component stack:", errorInfo.componentStack);

    this.setState({ componentStack: errorInfo.componentStack });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error, componentStack } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Something crashed while rendering</h1>
            <p className="text-sm text-muted-foreground">
              This is a debug screen so we can locate the exact component that triggers
              <code className="mx-1 rounded bg-muted px-1 py-0.5">React.Children.only</code>.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="font-medium">Error</div>
            <pre className="mt-2 whitespace-pre-wrap break-words">{String(error.message || error)}</pre>
          </div>

          {componentStack && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="font-medium">Component stack</div>
              <pre className="mt-2 whitespace-pre-wrap break-words">{componentStack}</pre>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={this.handleReload}>
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
