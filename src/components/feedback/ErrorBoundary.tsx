import { Component, type ReactNode } from 'react';

import i18n from '@/i18n';

import { reportError } from '@/utils/sentry';

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
    // Sentry (when configured) + the local log — one report, both sinks.
    reportError(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          // Class component — no useTranslation hook; resolved at crash-render
          // time from the active locale.
          <ErrorState error={i18n.t('errorBoundary.message')} onRetry={this.reset} />
        )
      );
    }
    return this.props.children;
  }
}
