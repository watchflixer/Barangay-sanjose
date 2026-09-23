import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HazardSync ErrorBoundary caught:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.removeItem('san-jose-alerts');
      localStorage.removeItem('san-jose-live-url');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white p-4 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">HazardSync has recovered</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                A temporary error was recorded (such as a storage limit or rate limit), but the app was protected from crashing.
              </p>
              {this.state.errorMessage && (
                <div className="mt-3 p-2.5 bg-slate-900/80 rounded border border-slate-700/60 font-mono text-[11px] text-amber-300 break-words">
                  {this.state.errorMessage}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Page
              </button>
              <button
                onClick={this.handleResetStorage}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                title="Clear the cached data if storage is full"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
