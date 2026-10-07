// src/adapters/RemoteErrorBoundary.tsx — class는 에러 경계에만 허용된 예외다. 메서드는 arrow 프로퍼티로 쓴다.
import { Component } from 'react';
import type { ReactNode } from 'react';
import { setFrameState } from '../instrumentation';
import { resetLoader } from './resetLoader';

interface Props { slot: string; children: ReactNode }
interface State { error: Error | null }

export class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError = (error: Error): State => ({ error });
  componentDidCatch = () => { setFrameState(this.props.slot, 'error'); };
  retry = () => {
    resetLoader(this.props.slot);          // 실패한 로더 캐시를 버린다 (SameTreeRemote·RemoteMount가 등록)
    setFrameState(this.props.slot, 'loading');
    this.setState({ error: null });
  };
  render = () => {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div data-testid={`error-${this.props.slot}`} role="alert" style={{ padding: 12 }}>
        <p>{error.message}</p>
        <button type="button" data-testid={`retry-${this.props.slot}`} onClick={this.retry}>retry</button>
      </div>
    );
  };
}
