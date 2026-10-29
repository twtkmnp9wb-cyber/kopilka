import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/ui/shared/components/States';

interface State {
  readonly error: unknown;
}

/** Последний рубеж: вместо белого экрана — понятное сообщение и кнопка перезагрузки. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Необработанная ошибка интерфейса', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16 }}>
          <ErrorState error={this.state.error} onRetry={() => window.location.reload()} />
        </div>
      );
    }
    return this.props.children;
  }
}
