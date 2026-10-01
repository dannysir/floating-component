# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행
- 커밋은 항상 사용자 사전 허락 후 진행

---

## 진행 예정

### PanelNode lock options (브랜치 `feat/panel-lock`)

특정 패널을 "고정 위치"(사이드바 등)로 만드는 옵션. 세 가지 독립 축:

| 옵션 | 의미 | 기본값 |
|---|---|---|
| `draggable` | 이 패널을 드래그로 들어올릴 수 있는가 | `true` |
| `droppable` | 다른 패널이 이 패널로 드롭될 수 있는가 | `true` |
| `resizable` | 인접 경계선의 resize에 참여하는가 | `true` |

#### 변경 대상 (예상)

- [src/tree/types.ts](../src/tree/types.ts) — `PanelNode` 타입 확장 (모두 옵셔널, 기본 true)
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx)
  - `draggable === false` → HTML5 `draggable` 끄기 (핸들 모드의 `panelRef.current.draggable = isHandle` 경로 포함)
  - `droppable === false` → `handleDragOver`/`handleDrop` early return
- [src/hooks/useTouchDrag.ts](../src/hooks/useTouchDrag.ts) — 터치 경로도 동일 규칙 적용
  - `draggable === false` → 롱프레스/핸들 드래그 시작 안 함
  - `droppable === false` → `elementFromPoint`로 찾은 anchor가 잠긴 패널이면 preview·drop 무시
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — 인접 두 자식 중 하나라도 `resizable === false`인 PanelNode이면 Resizer 미렌더
- 문서: README(.ko)·doc/API(.ko)·CHANGELOG(.ko)

#### 검토 포인트

- `droppable` 판정 위치: 렌더러 핸들러에서 막을지, `move.ts` 트리 연산 레벨에서도 막을지 (`setTree`/`movePanel` 직접 호출 경로)
- `resizable:false` 패널이 SplitNode 안쪽 깊이 있을 때 — 인접 판정은 직계 자식 PanelNode만 볼지

#### 검증

- 데모(데스크톱): `draggable:false` 안 들림 / `droppable:false` preview·drop 안 됨 / `resizable:false` 양 옆 Resizer 안 보임 / 사이드바 케이스(셋 다 false) 시각 확인
- 데모(모바일 에뮬레이션): 롱프레스·핸들 드래그에도 동일 규칙 적용

#### 커밋 메시지 (제안)

```
feat: PanelNode에 draggable/droppable/resizable 옵션 추가
```

---

## 남은 검증

코드는 머지·배포됐으나 데모 레포 브라우저 검증이 체크되지 않은 항목.

- [ ] **직렬화 (0.3.0)** — 저장→새로고침→복원 시 레이아웃+컴포넌트 복구 / 미등록 키 시 dev 경고+빈 패널 / DnD·split·insert 후 정상
- [ ] **패널 크기 제약 (0.4.0)** — `minWidth`/`maxWidth`(가로 split), `minHeight`/`maxHeight`(세로 split)가 윈도우 리사이즈·경계선 드래그 모두에서 같은 px로 지켜지는지 / 패널보다 큰 콘텐츠가 `overflow:auto`로 스크롤되는지

---

## 완료 기록

상세 내용은 [CHANGELOG](../CHANGELOG.ko.md)·[API 문서](./API.ko.md) 참고.

| 항목 | 버전 | 브랜치 | 요약 |
|---|---|---|---|
| 트리 직렬화 / persistence | 0.3.0 | `feat/component-store-serialization` | `ComponentStore` + `componentKey`로 교체 → 트리가 원시값만 담아 `JSON.stringify`/`parse`로 persistence |
| 패널 크기 제약 | 0.4.0 | `feat/panel-sizing` | `minSize`/`maxSize` → main-axis 전용 `minWidth`/`minHeight`/`maxWidth`/`maxHeight`(px) + wrapper `overflow:auto`. 초기 플랜(자식 CSS min 자동 보호)은 폐기 |
| 터치 지원 | 0.5.0 | `feat/touch-support` | 경계선 resize를 Pointer Events로 전환 + `useTouchDrag`(롱프레스 450ms·floating ghost·`elementFromPoint` 드롭) 하이브리드 경로 |
