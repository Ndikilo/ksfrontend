import { Component, type ReactNode } from 'react';

import { logger } from '@/utils';

import { ErrorState } from './ErrorState';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

/**
 * Catches render-time crashes anywhere below it and shows a recoverable UI
 * instead of a white screen. Wrap the app root (and optionally risky subtrees).
 * Must be a class — React only supports error boundaries as classes.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    logger.error('ErrorBoundary', error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorState
            error="An unexpected error occurred. Please restart the screen."
            onRetry={this.reset}
          />
        )
      );
    }
    return this.props.children;
  }
}
