/**
 * React Error Boundary (Production-Ready)
 * 
 * Catches React component errors and displays fallback UI
 * Logs errors to appropriate destination (console or CloudWatch)
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { ApplicationError, ErrorCode, ErrorSeverity } from '../errors/ApplicationError';
import { logger } from '../errors/ErrorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create ApplicationError with context
    const appError = new ApplicationError(
      ErrorCode.UNKNOWN_ERROR,
      `React component error: ${error.message}`,
      ErrorSeverity.ERROR,
      error,
      {
        component: this.props.componentName || 'Unknown',
        action: 'render',
        metadata: {
          componentStack: errorInfo.componentStack
        }
      }
    );
    
    // Log to appropriate destination
    logger.log(appError);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Įvyko klaida
            </h1>
            
            <p className="text-gray-600 mb-6">
              Atsiprašome, programoje įvyko nenumatyta klaida. 
              Pabandykite atnaujinti puslapį arba susisiekite su palaikymo komanda.
            </p>
            
            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-xs text-red-800 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Atnaujinti puslapį
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Grįžti atgal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
