# Three.js 3D Brick Breaker Prototype Design

## 목적

`games/brick-breaker-3d`에 모바일 웹에서 실행되는 학습용 3D 브릭 브레이커 프로토타입을 만든다. 완성형 게임이나 콘텐츠 제작보다, Three.js의 핵심 객체와 게임 루프·입력·충돌 구조를 파일별로 읽고 수정하기 쉽게 보여주는 것이 우선이다.

## 성공 기준

- Vite와 strict TypeScript로 빌드되는 독립적인 pnpm 워크스페이스 앱이다.
- React, Vue, 물리 엔진, 외부 모델, 외부 이미지 없이 Three.js 기본 Geometry만 사용한다.
- 원근 카메라가 비스듬히 내려다보는 3D 경기장에 바닥, 좌우 벽, 뒤쪽 경계벽, 공, 패들이 보인다.
- 공은 자동으로 X/Z 평면을 이동하고 벽 및 패들과 충돌하면 진행 방향이 바뀐다.
- 공이 화면 아래쪽 경계를 벗어나면 시작 위치와 시작 속도로 재설정된다.
- 패들은 마우스와 모바일 터치 드래그로 좌우 이동하며 경기장 범위를 벗어나지 않는다.
- 화면 크기와 기기 픽셀 비율 변화에 대응한다.
- 타입 검사, 자동 테스트, 프로덕션 빌드가 통과하고 실제 브라우저 콘솔에 오류가 없다.
- README가 각 파일 역할, Three.js 객체 생성 위치, 게임 루프와 delta time, 공 속도 및 패들 크기 조정 위치, 모바일 입력 방식, 연습 과제 5개를 설명한다.

## 범위

### 포함

- 공 한 개와 패들 한 개
- 바닥, 좌우 벽, 뒤쪽 경계벽
- 직접 작성한 단순 충돌 계산
- 마우스·터치를 통합한 Pointer Events 입력
- 모바일 전체 화면 레이아웃과 resize 대응
- 충돌과 경계 계산을 검증하는 단위 테스트

### 제외

- 파괴 가능한 벽돌, 점수, 목숨, 레벨, 사운드, 메뉴
- 실제 중력이나 물리 엔진
- 텍스처, 이미지, 외부 3D 모델
- 멀티플레이와 저장 기능

이 첫 프로토타입에서 “브릭 브레이커”는 공·패들·벽 충돌의 핵심 루프를 뜻한다. 파괴 가능한 벽돌은 학습용 후속 연습으로 추가할 수 있도록 범위에서 의도적으로 제외한다.

## 기술 및 프로젝트 구성

- Node.js 20 이상
- pnpm 10 워크스페이스
- Vite
- TypeScript `strict: true`
- Three.js
- Vitest

```text
games/brick-breaker-3d/
├── index.html
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── main.ts
│   ├── game/Game.ts
│   ├── objects/Ball.ts
│   ├── objects/Paddle.ts
│   ├── systems/CollisionSystem.ts
│   ├── input/PointerInput.ts
│   ├── config/gameConfig.ts
│   └── style.css
└── tests/
    └── CollisionSystem.test.ts
```

루트 `package.json`에는 `dev:brick-breaker` 명령을 추가한다. 게임 패키지는 자체 `dev`, `typecheck`, `test`, `build`, `preview` 명령을 제공한다.

## 공간과 시각 구성

경기장은 X/Z 평면에 놓이고 Y가 높이 축이다. 공의 중심과 패들은 바닥보다 약간 위에 고정되므로, 게임 규칙은 이해하기 쉬운 2차원 계산을 사용하면서 표현은 Three.js의 3D 원근감을 유지한다.

- 바닥: `PlaneGeometry`, X/Z 경기 영역 표시
- 벽: `BoxGeometry`, 좌우와 먼 쪽 경계를 시각화
- 공: `SphereGeometry`
- 패들: `BoxGeometry`
- 카메라: `PerspectiveCamera`, 가까운 쪽 위에서 경기장을 비스듬히 내려다봄
- 조명: `AmbientLight`와 `DirectionalLight`
- 렌더러: 안티앨리어싱을 켠 `WebGLRenderer`

장식보다 구조가 잘 보이도록 색상과 그림자는 최소한으로 사용한다. UI에는 짧은 조작 안내만 HTML 오버레이로 제공한다.

## 책임 분리

### `src/main.ts`

스타일을 불러오고 DOM 루트 요소를 확인한 뒤 `Game`을 생성해 시작한다. 앱 조립만 담당한다.

### `src/game/Game.ts`

`Scene`, `PerspectiveCamera`, `WebGLRenderer`, 조명, 바닥과 벽을 생성한다. `Ball`, `Paddle`, `CollisionSystem`, `PointerInput`을 조립하고 게임 루프, resize 처리, 자원 해제를 관리한다.

### `src/objects/Ball.ts`

공의 `Mesh`, 속도 벡터, 반지름과 시작 상태를 소유한다. delta time을 받아 위치를 적분하고 `reset()`으로 위치와 속도를 복원한다.

### `src/objects/Paddle.ts`

패들의 `Mesh`와 크기를 소유한다. 목표 X 위치를 경기장 내부로 제한해 적용한다.

### `src/systems/CollisionSystem.ts`

공과 좌우·뒤쪽 벽의 충돌, 공과 패들의 충돌, 아래쪽 이탈을 판정한다. 충돌 시 공이 경계 안으로 되돌아오도록 위치를 보정한 후 속도 성분을 반전해 프레임 간 중복 충돌을 줄인다.

패들 반사는 단순 Z 반전만 하지 않고 충돌 지점의 중심 오프셋을 X 방향에 반영한다. 따라서 패들 가장자리로 공을 맞히면 더 큰 좌우 각도로 튀어 학습과 조작 피드백이 분명해진다.

### `src/input/PointerInput.ts`

렌더러 canvas의 `pointerdown`, `pointermove`, `pointerup`, `pointercancel`을 처리한다. 드래그 중인 포인터 하나만 추적하고 `setPointerCapture()`를 사용한다. 화면 좌표를 NDC로 바꾼 뒤 카메라 Raycaster와 바닥 평면의 교점을 계산하여 패들의 목표 X 좌표를 전달한다. `touch-action: none`으로 브라우저 스크롤과 제스처 충돌을 막는다.

### `src/config/gameConfig.ts`

경기장 크기, 공 반지름과 속도, 패들 크기, 시작 위치, 카메라 파라미터, 색상을 한곳에 모은다. 학습자가 게임 감각을 바꿀 때 가장 먼저 수정할 파일이다.

## 프레임 흐름과 delta time

`Game.start()`가 `requestAnimationFrame` 루프를 시작한다. 각 프레임은 다음 순서를 따른다.

1. `THREE.Clock.getDelta()`로 지난 프레임 이후의 초 단위 시간을 구한다.
2. 탭 복귀나 일시적인 정지로 큰 값이 들어오지 않도록 delta를 최대 `1 / 30`초로 제한한다.
3. 포인터가 지정한 목표 X를 패들에 반영한다.
4. `Ball.update(delta)`가 `position += velocity * delta`로 공을 이동한다.
5. `CollisionSystem.resolve(...)`가 벽·패들 충돌과 이탈을 처리한다.
6. `renderer.render(scene, camera)`로 화면을 그린다.

속도는 초당 월드 단위이므로 화면 주사율과 무관하게 거의 같은 이동 속도를 유지한다.

## 충돌 규칙

- 좌우 벽: 공 중심이 벽 내부 경계를 반지름만큼 침범하면 X 위치를 보정하고 X 속도의 부호를 바꾼다.
- 뒤쪽 벽: 공 중심이 먼 쪽 경계를 침범하면 Z 위치를 보정하고 Z 속도를 가까운 쪽으로 바꾼다.
- 패들: 공이 가까운 쪽으로 이동 중일 때만 원-사각형 교차를 판정한다. 충돌 시 공을 패들 앞쪽에 배치하고 Z 속도를 먼 쪽으로 바꾼다. 중심 오프셋으로 X 속도를 조정한 뒤 전체 속력을 설정값으로 정규화한다.
- 아래쪽 이탈: 공 전체가 가까운 쪽 리셋 경계를 넘으면 `Ball.reset()`을 호출한다.
- 한 프레임에서 여러 경계를 침범할 수 있으므로 X 벽과 Z 경계를 독립적으로 처리한다.

## 화면 크기 변경

초기화와 `resize` 이벤트에서 다음을 갱신한다.

- `camera.aspect`
- `camera.updateProjectionMatrix()`
- `renderer.setSize(width, height, false)`
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`

CSS는 `html`, `body`, 앱 루트, canvas를 화면 전체 크기로 유지하고 스크롤을 막는다.

## 오류 처리와 수명 주기

- 필수 DOM 루트가 없으면 `main.ts`가 명확한 오류를 발생시킨다.
- WebGL 초기화 오류는 브라우저가 콘솔에 원인을 노출하도록 숨기지 않는다.
- `Game.dispose()`는 animation frame, resize 이벤트, Pointer Events 리스너, Geometry, Material, Renderer를 정리한다.
- 개발 서버의 정상적인 Vite 로그 외 경고와 오류가 없도록 확인한다.

## 테스트와 검증

자동 테스트는 렌더링 세부 구현보다 순수한 게임 규칙을 검증한다.

- 좌우 벽 충돌 시 위치 보정 및 X 방향 반전
- 뒤쪽 벽 충돌 시 Z 방향 반전
- 패들 중앙 및 가장자리 충돌 시 반사 방향
- 패들에서 멀어지는 공은 다시 충돌하지 않음
- 아래쪽 이탈 시 리셋 판정
- 패들 목표 위치가 양쪽 경계에서 제한됨

완료 전 다음을 새로 실행한다.

1. `pnpm --filter @web-games/brick-breaker-3d typecheck`
2. `pnpm --filter @web-games/brick-breaker-3d test`
3. `pnpm --filter @web-games/brick-breaker-3d build`
4. 개발 서버를 실제 브라우저에서 열어 데스크톱 및 모바일 크기에서 렌더링과 드래그를 확인한다.
5. 브라우저 콘솔의 오류와 경고를 확인한다.

## 학습 문서

게임 폴더의 README는 다음을 코드 경로와 함께 설명한다.

1. 각 파일의 역할
2. Scene, Camera, Renderer, Mesh가 생성되는 위치
3. 게임 루프와 delta time의 흐름
4. 공 속도를 변경하는 설정
5. 패들 크기를 변경하는 설정
6. Pointer Events, pointer capture, Raycaster를 이용한 모바일 입력
7. 직접 수정할 연습 5개

연습은 색상 변경, 공 속도 변경, 패들 크기 변경, 벽돌과 제거 로직 추가, 목숨 또는 점수 UI 추가의 순서로 난이도를 높인다.
