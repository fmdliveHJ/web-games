# 테니스 캠페인형 3D 벽돌깨기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 Three.js 프로토타입을 벽돌, 점수, 목숨, 시작·승리·게임오버 흐름을 갖춘 한 레벨의 테니스 캠페인형 게임으로 완성한다.

**Architecture:** `Brick`과 `BrickField`가 벽돌의 생성과 수명을 담당하고, `GameState`가 UI와 분리된 게임 상태를 관리한다. `CollisionSystem`은 충돌 결과를 이벤트로 반환하며 `Game`이 점수·목숨·효과·UI 알림을 조립한다.

**Tech Stack:** Vite, TypeScript strict, Three.js, HTML, CSS

**Spec:** `docs/superpowers/specs/2026-09-27-tennis-campaign-brick-breaker-design.md`

## Global Constraints

- React, Vue, 물리 엔진, 외부 이미지, 외부 3D 모델을 사용하지 않는다.
- 라코스테 로고나 상표를 복제하지 않고 테니스 캠페인의 색상과 분위기만 참고한다.
- 파워업, 멀티볼, 레이저, 실드, 여러 레벨, 온라인 순위표는 구현하지 않는다.
- 기존 키보드·모바일 터치·2D/3D 전환·패들 운동량 기능을 유지한다.
- 사용자 요청에 따라 테스트 파일과 테스트 의존성을 추가하지 않는다.
- 각 기능 단위는 strict 타입 검사와 프로덕션 빌드 후 한글 커밋으로 남긴다.
- 기존 `.gitignore` 변경은 커밋하지 않는다.

## Review Focus

- 같은 프레임에 여러 벽돌과 겹칠 때 하나의 벽돌만 제거되고 속도가 한 번만 반전되어야 한다.
- 마지막 벽돌을 제거한 프레임에 승리 상태가 한 번만 발생해야 한다.
- 마지막 목숨을 잃으면 공이 다시 움직이지 않고 게임오버 화면이 나타나야 한다.
- 다시 시작하면 점수·목숨·벽돌·공 속도·파편이 모두 초기화되어야 한다.
- 좁은 모바일 화면에서도 HUD, 시점 버튼, 게임 오버레이가 서로 가리지 않아야 한다.

---

### Task 1: 벽돌 객체와 벽돌 필드

**Files:**
- Create: `games/brick-breaker-3d/src/objects/Brick.ts`
- Create: `games/brick-breaker-3d/src/objects/BrickField.ts`
- Modify: `games/brick-breaker-3d/src/config/gameConfig.ts`

**Interfaces:**
- Produces: `Brick`, `BrickField`, `BrickField.activeBricks`, `BrickField.remaining`, `BrickField.remove(brick)`, `BrickField.reset()`, `BrickField.dispose()`
- Consumes: Three.js `Scene`, `Vector3`, `Mesh`, `BoxGeometry`, `MeshStandardMaterial`

- [ ] **Step 1: 벽돌 설정 추가**

`gameConfig.bricks`에 `rows: 4`, `columns: 7`, `width: 1.8`, `height: 0.7`, `depth: 0.9`, `gap: 0.25`, `startZ: -7`, `score: 100`, 행별 색상 배열을 추가한다.

- [ ] **Step 2: Brick 구현**

`Brick`은 Mesh, width, depth, score, active를 제공한다. `deactivate()`는 한 번만 `true`를 반환하고 이후에는 `false`를 반환한다. `dispose()`는 Geometry와 Material을 해제한다.

- [ ] **Step 3: BrickField 구현**

행·열의 전체 폭을 계산해 X축 중앙에 배치하고 Z축으로 행을 쌓는다. `remove()`는 비활성화된 Mesh를 Scene에서 제거하고, `reset()`은 기존 벽돌을 정리한 뒤 전체 배열을 다시 만든다.

- [ ] **Step 4: 검증**

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck && pnpm --filter @web-games/brick-breaker-3d build && git diff --check`

Expected: 세 명령 모두 exit code 0.

- [ ] **Step 5: 커밋**

```bash
git add games/brick-breaker-3d/src/objects/Brick.ts games/brick-breaker-3d/src/objects/BrickField.ts games/brick-breaker-3d/src/config/gameConfig.ts
git commit -m "기능: 3D 벽돌 필드 추가"
```

### Task 2: 벽돌 충돌과 파괴 효과

**Files:**
- Create: `games/brick-breaker-3d/src/effects/BrickBurst.ts`
- Modify: `games/brick-breaker-3d/src/systems/CollisionSystem.ts`
- Modify: `games/brick-breaker-3d/src/game/Game.ts`

**Interfaces:**
- Consumes: `BrickField.activeBricks`, `BrickField.remove(brick)`, 기존 `Ball`
- Produces: `CollisionEvent`의 `{ type: 'brick'; brick: Brick }`, `BrickBurst.spawn(position, color)`, `BrickBurst.update(delta)`, `BrickBurst.clear()`, `BrickBurst.dispose()`

- [ ] **Step 1: 충돌 이벤트 구조화**

문자열 이벤트를 `CollisionEvent` 판별 유니온으로 바꾸고 벽·패들·리셋 이벤트를 객체로 반환한다. 기존 Game 소비 코드를 새 이벤트 형태에 맞춘다.

- [ ] **Step 2: 공-벽돌 충돌 추가**

활성 벽돌을 순회하면서 원-사각형 최근접점 충돌을 계산한다. 충돌한 첫 벽돌만 반환하고 X/Z 침투량 중 작은 축의 공 속도를 반전한다.

- [ ] **Step 3: BrickBurst 구현 및 연결**

충돌 위치에 8개의 작은 BoxGeometry 조각을 생성한다. 각 조각은 0.45초 동안 이동, 회전, 투명화되며 종료 즉시 Scene과 GPU 자원에서 제거한다.

- [ ] **Step 4: 브라우저 검증**

게임을 임시로 자동 시작시켜 공이 벽돌을 제거하는지, 같은 충돌에서 여러 벽돌이 사라지지 않는지, 콘솔 오류가 없는지 확인한 뒤 임시 자동 시작 코드는 제거한다.

- [ ] **Step 5: 정적 검증과 커밋**

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck && pnpm --filter @web-games/brick-breaker-3d build && git diff --check`

Expected: 세 명령 모두 exit code 0.

```bash
git add games/brick-breaker-3d/src/effects/BrickBurst.ts games/brick-breaker-3d/src/systems/CollisionSystem.ts games/brick-breaker-3d/src/game/Game.ts
git commit -m "기능: 벽돌 충돌과 파괴 효과 구현"
```

### Task 3: 점수·목숨·게임 상태와 UI

**Files:**
- Create: `games/brick-breaker-3d/src/systems/GameState.ts`
- Modify: `games/brick-breaker-3d/src/game/Game.ts`
- Modify: `games/brick-breaker-3d/src/objects/Paddle.ts`
- Modify: `games/brick-breaker-3d/index.html`
- Modify: `games/brick-breaker-3d/src/main.ts`
- Modify: `games/brick-breaker-3d/src/style.css`

**Interfaces:**
- Produces: `GamePhase = 'ready' | 'playing' | 'won' | 'game-over'`, `GameSnapshot`, `GameState.start()`, `GameState.addScore(points)`, `GameState.loseLife()`, `GameState.win()`, `GameState.reset()`
- Produces: `Game.startRound()`, `Game.restart()`, `Game.onStateChange(listener)`

- [ ] **Step 1: GameState 구현**

초기 목숨 3, 점수 0, 상태 ready로 시작한다. 모든 변경 메서드는 새 스냅샷을 반환하고 상태 전이를 벗어나는 호출은 현재 스냅샷을 유지한다.

- [ ] **Step 2: Game에 상태 흐름 연결**

playing일 때만 이동·충돌을 실행한다. reset 이벤트에서 목숨을 줄이고 ready 또는 game-over로 전환한다. brick 이벤트에서 100점을 더하고 남은 벽돌이 0이면 won으로 전환한다. `restart()`는 벽돌·파편·공·패들·상태를 모두 초기화한다.

- [ ] **Step 3: HUD와 오버레이 마크업 추가**

`index.html`에 점수, 하트 3개, 제목, 설명, 시작/다시 시작 버튼을 추가한다. 점수 영역은 `aria-live="polite"`, 오버레이는 상태에 따라 `hidden`을 사용한다.

- [ ] **Step 4: main.ts UI 연결**

Game 상태 콜백에서 점수, 하트, 제목, 설명, 버튼 문구를 갱신한다. ready의 버튼은 `startRound()`, won/game-over의 버튼은 `restart()` 후 `startRound()`를 호출한다.

- [ ] **Step 5: 전체 상태 검증**

브라우저에서 첫 시작, 벽돌 제거와 점수 증가, 공 유실과 목숨 감소, 마지막 목숨 후 게임오버, 다시 시작 초기화, 마지막 벽돌 후 승리 화면을 확인한다.

- [ ] **Step 6: 정적 검증과 커밋**

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck && pnpm --filter @web-games/brick-breaker-3d build && git diff --check`

Expected: 세 명령 모두 exit code 0.

```bash
git add games/brick-breaker-3d/src/systems/GameState.ts games/brick-breaker-3d/src/game/Game.ts games/brick-breaker-3d/src/objects/Paddle.ts games/brick-breaker-3d/index.html games/brick-breaker-3d/src/main.ts games/brick-breaker-3d/src/style.css
git commit -m "기능: 점수와 목숨 및 게임 상태 UI 추가"
```

### Task 4: 테니스 캠페인 시각 디자인과 문서

**Files:**
- Modify: `games/brick-breaker-3d/src/game/Game.ts`
- Modify: `games/brick-breaker-3d/src/config/gameConfig.ts`
- Modify: `games/brick-breaker-3d/src/style.css`
- Modify: `games/brick-breaker-3d/README.md`

**Interfaces:**
- Consumes: 기존 Arena와 2D/3D 카메라
- Produces: 크림색 코트 라인 Mesh와 캠페인형 HUD 스타일

- [ ] **Step 1: 코트 색상과 라인 추가**

배경·바닥·벽·격자를 테니스 그린 계열로 조정하고 PlaneGeometry 또는 얇은 BoxGeometry로 베이스라인, 서비스 라인, 센터 라인을 만든다. 라인은 바닥보다 Y축으로 0.02 높게 둔다.

- [ ] **Step 2: HUD와 오버레이 시각 마감**

크림색 카드, 녹색 버튼, 반응형 간격, safe area, 모바일 44px 이상 버튼, 시점 선택기와 겹치지 않는 배치를 적용한다.

- [ ] **Step 3: README 갱신**

새 파일 역할, 상태 흐름, 벽돌 설정, 점수·목숨, 파괴 효과와 수정 연습을 문서화한다.

- [ ] **Step 4: 최종 검증**

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck && pnpm --filter @web-games/brick-breaker-3d build && git diff --check`

브라우저에서 데스크톱 3D, 데스크톱 2D, 모바일 크기, 전체 게임 흐름, 콘솔 오류·경고를 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add games/brick-breaker-3d/src/game/Game.ts games/brick-breaker-3d/src/config/gameConfig.ts games/brick-breaker-3d/src/style.css games/brick-breaker-3d/README.md
git commit -m "디자인: 테니스 캠페인형 게임 화면 완성"
```
