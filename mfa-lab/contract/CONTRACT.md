# Harbor 통합 계약 (CONTRACT)

- 계약 버전: **1** (`registry.json`의 `contract`와 같다. 런타임 검사는 `MountContext.contract`뿐이다)
- 소스: `mfa-lab/contract/src/` (`@harbor/contract` alias로 각 프로젝트가 직접 번들한다). React를 import하지 않는다.
- 내용의 기준은 [doc/qa/mfa/ARCHITECTURE.md](../../doc/qa/mfa/ARCHITECTURE.md) 「통합 계약」이다. 아래는 그 복사본이다.

## 계약 본문 (ARCHITECTURE.md 「통합 계약」에서 옮김)

계약 버전 1. 소스는 `mfa-lab/contract/src/`.

```ts
// index.ts — 타입
export interface HarborBus {
  publish: (topic: string, payload: unknown) => void;
  subscribe: (topic: string, fn: (payload: unknown) => void) => () => void;
}
export interface InspectableBus extends HarborBus {
  subscriberCount: (topic: string) => number;
}
export interface PanelProps { slot: string; bus: HarborBus; }                 // kind "same-tree"
export interface MountContext { slot: string; bus: HarborBus; contract: 1; }  // kind "mount"
export type Mount = (el: HTMLElement, ctx: MountContext) => void;
export type Unmount = (el: HTMLElement) => void;
export interface FrameMessage {                                               // kind "iframe"
  harbor: 1; slot: string; type: 'mfe:loaded';
  payload: { loads: number; docId: string };
}
export type ProbeKind = 'local' | 'same-tree' | 'mount' | 'iframe';
export interface ProbeMeta {
  remote: string;            // 내용 코드를 소유한 쪽: 'shell' | 'orders' | 'board' | 'billing' | 'telemetry'
  kind?: ProbeKind;          // 생략하면 기존 값 유지, 없으면 'same-tree'
  build: string;             // 이 코드를 번들한 빌드의 스탬프
  reactVersion?: string;
  reactSame?: boolean | null;
}
export interface Probe {
  readonly state: Record<string, unknown>;        // window.__mfe[slot]와 같은 객체를 가리킨다
  mounted: () => number;                          // mounts +1, instanceSeq +1. 새 instanceSeq 반환
  unmounted: () => void;                          // unmounts +1
  bump: (key: string, by?: number) => void;       // 숫자 필드 증감 (mountCalls, unmountCalls, rootsAlive, loads ...)
  set: (patch: Record<string, unknown>) => void;  // 그 밖의 필드 (dnd, seen, docId ...)
}
// 헬퍼
export const createProbe: (slot: string, meta: ProbeMeta) => Probe;   // probe.ts
export const createBus: () => InspectableBus;                         // bus.ts
export const ensureStyle: (id: string, css: string) => void;          // style.ts
```

헬퍼 규칙:

| 헬퍼 | 규칙 |
|---|---|
| `createProbe(slot, meta)` | `window.__mfe[slot]`의 유일한 구현. 슬롯당 한 번만 만들고 다시 부르면 같은 프로브를 돌려준다(카운터는 리마운트를 넘어 누적). 뒤에 온 `meta`는 정의된 필드만 덮어쓴다. 값이 바뀔 때마다 `window.dispatchEvent(new CustomEvent('harbor:probe', { detail: { slot } }))`를 보낸다. 갱신은 객체를 새로 만들어 `window.__mfe[slot]`에 다시 대입한다(직접 mutation 금지 규칙) |
| `createBus()` | 메모리 안의 pub/sub. `subscribe`는 해제 함수를 돌려준다 |
| `ensureStyle(id, css)` | `document.head`에 `<style data-harbor-style="<id>">`가 없을 때만 한 번 넣는다 |

카운터를 올리는 위치: 내용 컴포넌트의 `useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [])`. passive effect(`useEffect`)가 아니라 layout effect에 두어, 하네스가 `settle` 직후 읽어도 값이 확정돼 있게 한다. `reactVersion`·`reactSame`은 계약이 React를 모르므로 각 remote 코드가 계산해 `meta`로 넘긴다: `reactSame = window.__fc ? window.__fc.reactRef.createElement === React.createElement : null`. 모듈 네임스페이스 객체가 아니라 함수 참조를 비교한다.

## 프로브 표면 (CONTRACT.md에 고정)

모든 패널 내용은 아래 요소를 자기 코드로 그린다. 공유 React 위젯 키트는 두지 않는다. 컨테이너 유형이 달라도 같은 방법으로 상태 유실을 읽기 위한 것이다.

| 유형 | 필수 testid | 의미 |
|---|---|---|
| `local`, `same-tree`, `mount` | `<slot>-input` | 텍스트 input (값 유지 여부) |
| | `<slot>-scroll` | 100행 이상을 담은 스크롤 컨테이너 (scrollTop 유지 여부) |
| | `<slot>-counter` | 누를 때마다 수가 오르는 버튼 (컴포넌트 state 유지 여부) |
| `iframe` (프레임 문서 안) | `tele-input`, `tele-scroll`, `tele-loads` | 프레임 문서 안의 같은 역할. 카운터 버튼 대신 로드 수를 쓴다(문서가 다시 로드되면 모든 상태가 사라지므로) |

`bare-*`는 예외로 input(`bare-<n>-input`)과 마운트 수 표시만 가진다.

## 유형별 계약

| 유형 | remote가 내놓는 것 | host가 주는 것 |
|---|---|---|
| `same-tree` | `export const Panel: ComponentType<PanelProps>`를 `./Panel`로 노출 | `slot`, `bus` props |
| `mount` | ES 모듈의 `mount(el, ctx)`, `unmount(el)`. 같은 `el`에 `mount`를 두 번 부르면 두 번째는 무시(`mountCalls`만 증가). 모르는 `el`의 `unmount`는 무시. `ctx.contract !== 1`이면 예외 | `el`(어댑터가 소유한 div), `{ slot, bus, contract: 1 }` |
| `iframe` | `/?slot=<slot>&parent=<origin>` 페이지와 `mfe:loaded` 메시지 1종 | URL 하나. 버스는 넘기지 않는다 |

---

