"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Catches render-time exceptions from anything in the children tree and
// shows an inline fallback instead of blanking the whole app. Doesn't catch
// async errors, event handlers, or server-side errors — those still need
// per-call try/catch or toast surfaces.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaced in the dev server log; production should ship to a real
    // tracking service (Sentry, etc.) — out of scope for the hackathon.
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full rounded-xl border border-red-100 bg-red-50/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Something went wrong on this view
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <Button
                onClick={this.reset}
                size="sm"
                variant="outline"
                className="mt-3 h-7 text-xs"
              >
                <RotateCw className="w-3 h-3 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
