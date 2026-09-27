# Three.js 3D 브릭 브레이커 프로토타입

Three.js의 기본 객체와 게임 구조를 코드로 학습하기 위한 모바일 웹 프로토타입입니다. 공·패들·벽 충돌의 핵심 루프에 집중했으며, 파괴 가능한 벽돌과 점수 시스템은 연습 과제로 남겨 두었습니다.

## 실행하기

저장소 루트에서 실행합니다.

```bash
pnpm install
pnpm dev:brick-breaker
```

터미널에 표시된 주소를 브라우저로 연 뒤 방향키나 WASD로 조작하세요. 모바일에서는 손가락으로 드래그할 수 있습니다.

게임 패키지만 검사하려면 다음 명령을 사용합니다.

```bash
pnpm --filter @web-games/brick-breaker-3d typecheck
pnpm --filter @web-games/brick-breaker-3d build
```

## 먼저 읽을 순서

다음 순서로 읽으면 상수에서 시작해 전체 게임 조립까지 자연스럽게 이어집니다.

1. `src/config/gameConfig.ts`
2. `src/objects/Ball.ts`, `src/objects/Paddle.ts`
3. `src/systems/CollisionSystem.ts`
4. `src/input/KeyboardInput.ts`, `src/input/PointerInput.ts`
5. `src/game/Game.ts`
6. `src/main.ts`

## 각 파일의 역할

### `src/main.ts`

브라우저 진입점입니다. CSS를 불러오고 `#app` 요소를 찾은 뒤 `Game`을 생성해 시작합니다. 페이지가 닫힐 때 `dispose()`를 호출해 이벤트와 GPU 자원을 정리합니다.

### `src/game/Game.ts`

게임의 조립자이자 실행 관리자입니다. Scene, Camera, Renderer, 조명, 경기장을 만들고 `Ball`, `Paddle`, `CollisionSystem`, `KeyboardInput`, `PointerInput`을 연결합니다. 게임 루프와 화면 크기 변경도 이 파일에서 처리합니다.

### `src/objects/Ball.ts`

공의 `SphereGeometry` Mesh, 위치, 속도, 반지름, 시작 상태를 관리합니다. `update(delta)`가 공을 이동시키고 `reset()`이 시작 위치와 속도를 복원합니다.

### `src/objects/Paddle.ts`

패들의 `BoxGeometry` Mesh와 크기를 관리합니다. `setPosition()`과 `move()`는 패들을 X/Z 방향으로 이동시키면서 허용된 영역을 통과하지 않도록 제한합니다.

### `src/systems/CollisionSystem.ts`

공과 좌우 벽, 뒤쪽 벽, 패들의 충돌을 직접 계산합니다. 충돌 뒤 위치를 경계 안으로 보정하고 속도 방향을 바꿉니다. 공이 아래쪽 경계를 완전히 벗어나면 `Ball.reset()`을 호출합니다.

### `src/input/KeyboardInput.ts`

방향키와 WASD의 눌림 상태를 관리합니다. 좌우와 위아래 입력을 `Vector2` 방향으로 반환하며, 대각선 속도가 더 빨라지지 않도록 정규화합니다.

### `src/input/PointerInput.ts`

모바일 터치와 펜 입력을 처리합니다. 마우스 입력은 무시합니다. 화면 좌표를 Three.js의 NDC 좌표로 바꾸고, Raycaster가 바닥 평면과 만나는 X/Z 좌표를 패들에 전달합니다.

### `src/config/gameConfig.ts`

경기장, 공, 패들, 카메라, 색상과 최대 delta time을 한곳에 모읍니다. 게임 감각이나 화면 구성을 바꿀 때 가장 먼저 확인할 파일입니다.

### `src/style.css`

canvas를 화면 전체에 맞추고 스크롤과 모바일 기본 제스처를 막습니다. 조작 안내 오버레이와 safe area 여백도 정의합니다.

## Scene, Camera, Renderer, Mesh는 어디에서 생성될까?

- `Scene`: `src/game/Game.ts`의 `Game` 생성자
- `PerspectiveCamera`: `src/game/Game.ts`의 `Game` 생성자
- `WebGLRenderer`: `src/game/Game.ts`의 `Game` 생성자
- 바닥과 좌우·뒤쪽 벽 Mesh: `src/game/Game.ts`의 `addArena()`
- 공 Mesh: `src/objects/Ball.ts`의 `Ball` 생성자
- 패들 Mesh: `src/objects/Paddle.ts`의 `Paddle` 생성자

`Game`은 객체를 만든 뒤 `scene.add(...)`로 Scene 그래프에 연결합니다. Renderer는 Camera가 바라보는 Scene을 매 프레임 canvas에 그립니다.

## 게임 루프와 delta time

`src/game/Game.ts`의 `frame()`은 다음 순서로 반복됩니다.

```text
requestAnimationFrame
  → Clock.getDelta()
  → clampDelta()
  → 키보드 방향으로 패들 이동
  → Ball.update(delta)
  → CollisionSystem.update(...)
  → renderer.render(scene, camera)
  → 다음 requestAnimationFrame 예약
```

`Clock.getDelta()`는 직전 프레임 이후 흐른 시간을 초 단위로 반환합니다. 공의 이동은 다음 개념으로 계산됩니다.

```ts
position += velocity * delta;
```

따라서 60Hz와 120Hz 화면에서도 초당 이동 거리는 거의 같습니다. 브라우저 탭을 오래 벗어났다가 돌아왔을 때 공이 한 번에 벽을 통과하지 않도록 `clampDelta()`가 delta를 최대 `1 / 30`초로 제한합니다.

## 공 속도 변경하기

`src/config/gameConfig.ts`의 다음 값을 바꿉니다.

```ts
ball: {
  speed: 9,
}
```

값은 초당 월드 단위입니다. `12`로 바꾸면 공이 더 빠르게 이동합니다. `startDirection`은 시작 각도를 정하고, `Ball`이 이 벡터를 정규화한 뒤 `speed`를 곱합니다.

## 패들 크기 변경하기

`src/config/gameConfig.ts`의 다음 값을 바꿉니다.

```ts
paddle: {
  width: 3.8,
  height: 0.55,
  depth: 0.8,
}
```

- `width`: 좌우 길이와 맞히기 쉬운 정도
- `height`: 화면에서 보이는 높이
- `depth`: 공과 충돌하는 앞뒤 두께

`Paddle.setPosition()`이 `width / 2`를 고려하므로 폭을 바꿔도 패들이 벽을 뚫지 않습니다.

## 키보드 이동 범위와 속도 변경하기

`src/config/gameConfig.ts`의 `paddle` 설정에서 변경합니다.

```ts
paddle: {
  minZ: 3,
  maxZ: 9,
  keyboardSpeed: 10,
}
```

- `minZ`: 패들이 위쪽으로 갈 수 있는 최대 지점
- `maxZ`: 패들이 아래쪽으로 갈 수 있는 최대 지점
- `keyboardSpeed`: 초당 이동하는 월드 단위

방향키와 WASD를 함께 지원하며, 서로 반대인 키를 동시에 누르면 해당 축의 이동이 상쇄됩니다.

## 모바일 입력은 어떻게 처리할까?

1. canvas가 터치와 펜의 `pointerdown`, `pointermove`, `pointerup`, `pointercancel`을 받으며 마우스 포인터는 무시합니다.
2. `setPointerCapture(pointerId)`가 드래그 시작 포인터를 canvas 밖에서도 계속 추적합니다.
3. 다른 손가락이나 포인터의 이벤트는 활성 포인터 ID와 다르므로 무시합니다.
4. `clientToNdc()`가 브라우저 좌표를 -1부터 1 사이의 NDC 좌표로 바꿉니다.
5. `Raycaster.setFromCamera()`가 카메라에서 포인터 방향으로 광선을 만듭니다.
6. 광선과 Y=0인 바닥 평면의 교점 X/Z를 패들의 목표 위치로 사용합니다.
7. CSS의 `touch-action: none`이 드래그 중 페이지 스크롤이나 확대 제스처가 개입하는 것을 막습니다.

터치와 펜 입력은 같은 Pointer Events 흐름을 사용하며, 데스크톱에서는 `KeyboardInput`이 키 상태를 게임 루프에 제공합니다.

## 직접 수정해 볼 연습 5개

1. **색상 변경:** `gameConfig.colors`를 바꿔 바닥, 벽, 공, 패들의 대비를 실험합니다.
2. **공 속도 변경:** `gameConfig.ball.speed`를 `6`, `12`, `18`로 바꾸고 난이도와 delta time의 관계를 관찰합니다.
3. **패들 크기 변경:** `gameConfig.paddle.width`를 줄이거나 늘리고 경계 제한과 충돌 범위가 함께 바뀌는지 확인합니다.
4. **파괴 가능한 벽돌 추가:** `Brick.ts`를 만들고 여러 BoxGeometry Mesh를 배치한 뒤 `CollisionSystem`에 공-벽돌 충돌과 제거 로직을 추가합니다.
5. **목숨 또는 점수 UI 추가:** 리셋 횟수나 벽돌 제거 횟수를 상태로 저장하고 HTML 오버레이에 표시합니다.

연습할 때는 한 번에 하나의 설정이나 동작만 바꾸고, 브라우저에서 변화가 어떻게 나타나는지 비교해 보세요.
