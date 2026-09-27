# Three.js 3D Brick Breaker Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly, learning-oriented 3D brick-breaker core loop as an independent Vite + strict TypeScript + Three.js workspace app.

**Architecture:** `Game` owns the Three.js scene and animation lifecycle, while `Ball`, `Paddle`, `CollisionSystem`, and `PointerInput` each expose a small focused API. Gameplay stays on the X/Z plane so collision math is readable, while a perspective camera and basic geometries provide a true 3D presentation.

**Tech Stack:** Node.js 20+, pnpm 10 workspace, Vite 7, TypeScript 5.9 strict mode, Three.js, Vitest

**Spec:** `docs/superpowers/specs/2026-09-27-threejs-brick-breaker-design.md`

## Global Constraints

- Create the app at `games/brick-breaker-3d` with package name `@web-games/brick-breaker-3d`.
- Use React, Vue, physics engines, external models, external images, and textures nowhere in the app.
- Use only Three.js basic geometries for the floor, three walls, ball, and paddle.
- Keep `strict: true`; do not use `any`, non-null assertions, or suppressed TypeScript errors.
- Keep game rules on the X/Z plane; Y is visual height only.
- Limit renderer pixel ratio to 2 and frame delta to `1 / 30` seconds.
- Preserve the user's existing staged `.gitignore` change. Every task commit must use `git commit --only` with explicit task paths.
- Do not add bricks, score, lives, sound, menus, persistence, or extra game systems.

## Review Focus

- A frame that crosses both a side wall and the back wall must reflect both velocity axes; Task 3 tests a corner collision.
- A ball already moving away from the paddle must not bounce a second time; Task 3 tests the direction guard.
- Pointer movement outside the canvas must still work while captured and stop on cancel; Task 4 tests pointer ownership and cancellation.
- A zero-sized canvas rectangle must not produce `Infinity` or `NaN`; Task 4 tests the coordinate fallback.
- A very large animation gap must not tunnel through boundaries; Task 5 exposes and tests the `clampDelta` helper used by the loop.

---

### Task 1: Scaffold the workspace app and test runner

**Files:**
- Create: `games/brick-breaker-3d/package.json`
- Create: `games/brick-breaker-3d/tsconfig.json`
- Create: `games/brick-breaker-3d/index.html`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: root pnpm workspace pattern `games/*`.
- Produces: package scripts `dev`, `typecheck`, `test`, `build`, `preview`; DOM root `#app`; root script `dev:brick-breaker`.

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "@web-games/brick-breaker-3d",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.180.0"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "vite": "^7.1.5",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create strict TypeScript configuration**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create the HTML shell**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Three.js Brick Breaker</title>
  </head>
  <body>
    <main id="app">
      <p class="instructions">드래그해서 패들을 움직이세요</p>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Add the root development script and install dependencies**

Add this entry to root `package.json`:

```json
"dev:brick-breaker": "pnpm --filter @web-games/brick-breaker-3d dev"
```

Run: `pnpm install`

Expected: `pnpm-lock.yaml` gains a `games/brick-breaker-3d` importer and installation exits 0.

- [ ] **Step 5: Verify the empty scaffold fails for the expected missing entry point**

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck`

Expected: FAIL because `src/main.ts` does not exist yet or no source input is found. This establishes the initial red state before production source is added.

- [ ] **Step 6: Commit only scaffold files**

```bash
git add games/brick-breaker-3d/package.json games/brick-breaker-3d/tsconfig.json games/brick-breaker-3d/index.html package.json pnpm-lock.yaml
git commit --only games/brick-breaker-3d/package.json games/brick-breaker-3d/tsconfig.json games/brick-breaker-3d/index.html package.json pnpm-lock.yaml -m "chore: scaffold Three.js brick breaker"
```

---

### Task 2: Add centralized configuration and renderable game objects

**Files:**
- Create: `games/brick-breaker-3d/src/config/gameConfig.ts`
- Create: `games/brick-breaker-3d/src/objects/Ball.ts`
- Create: `games/brick-breaker-3d/src/objects/Paddle.ts`
- Create: `games/brick-breaker-3d/tests/objects.test.ts`

**Interfaces:**
- Consumes: Three.js `Mesh`, `Vector3`, `SphereGeometry`, `BoxGeometry`, `MeshStandardMaterial`.
- Produces: `gameConfig`; `Ball.mesh`, `Ball.velocity`, `Ball.radius`, `Ball.speed`, `Ball.update(delta)`, `Ball.reset()`, `Ball.dispose()`; `Paddle.mesh`, `Paddle.width`, `Paddle.depth`, `Paddle.setX(x, minX, maxX)`, `Paddle.dispose()`.

- [ ] **Step 1: Write object behavior tests**

```ts
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Ball } from '../src/objects/Ball';
import { Paddle } from '../src/objects/Paddle';

describe('Ball', () => {
  it('moves by velocity multiplied by delta time', () => {
    const ball = new Ball({ radius: 0.4, speed: 10, startPosition: new Vector3(1, 0.4, 2), startDirection: new Vector3(0.6, 0, -0.8), color: 0xffffff });
    ball.update(0.5);
    expect(ball.mesh.position.x).toBeCloseTo(4);
    expect(ball.mesh.position.z).toBeCloseTo(-2);
  });

  it('restores its original position and velocity', () => {
    const ball = new Ball({ radius: 0.4, speed: 10, startPosition: new Vector3(1, 0.4, 2), startDirection: new Vector3(0.6, 0, -0.8), color: 0xffffff });
    ball.update(1);
    ball.reset();
    expect(ball.mesh.position.toArray()).toEqual([1, 0.4, 2]);
    expect(ball.velocity.toArray()).toEqual([6, 0, -8]);
  });
});

describe('Paddle', () => {
  it('clamps its center so its edges remain inside the arena', () => {
    const paddle = new Paddle({ width: 4, height: 0.5, depth: 0.8, position: new Vector3(0, 0.25, 8), color: 0xffffff });
    paddle.setX(99, -8, 8);
    expect(paddle.mesh.position.x).toBe(6);
    paddle.setX(-99, -8, 8);
    expect(paddle.mesh.position.x).toBe(-6);
  });
});
```

- [ ] **Step 2: Run the tests and verify red**

Run: `pnpm --filter @web-games/brick-breaker-3d test -- tests/objects.test.ts`

Expected: FAIL because `Ball`, `Paddle`, and `gameConfig` do not exist.

- [ ] **Step 3: Implement configuration**

Export an `as const` `gameConfig` containing:

```ts
export const gameConfig = {
  arena: { width: 16, depth: 22, wallThickness: 0.5, wallHeight: 1.2, backZ: -10, frontZ: 11 },
  ball: { radius: 0.4, speed: 9, startPosition: [0, 0.4, 4] as const, startDirection: [0.55, 0, -1] as const },
  paddle: { width: 3.8, height: 0.55, depth: 0.8, z: 8.5 },
  camera: { fov: 48, near: 0.1, far: 100, position: [0, 18, 18] as const, lookAt: [0, 0, 0] as const },
  colors: { background: 0x07131f, floor: 0x10283b, wall: 0x2b6685, ball: 0xffd166, paddle: 0x7ef9c6 },
  maxDelta: 1 / 30,
} as const;
```

- [ ] **Step 4: Implement `Ball` and `Paddle` minimally**

Use typed constructor option interfaces. `Ball` normalizes `startDirection`, multiplies it by `speed`, stores cloned start vectors, integrates with `mesh.position.addScaledVector(velocity, delta)`, and disposes its geometry/material. `Paddle.setX` uses:

```ts
const halfWidth = this.width / 2;
this.mesh.position.x = Math.min(maxX - halfWidth, Math.max(minX + halfWidth, x));
```

- [ ] **Step 5: Run object tests and the package typecheck**

Run: `pnpm --filter @web-games/brick-breaker-3d test -- tests/objects.test.ts`

Expected: 3 tests pass.

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck`

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 6: Commit object code and tests**

```bash
git add games/brick-breaker-3d/src/config/gameConfig.ts games/brick-breaker-3d/src/objects/Ball.ts games/brick-breaker-3d/src/objects/Paddle.ts games/brick-breaker-3d/tests/objects.test.ts
git commit --only games/brick-breaker-3d/src/config/gameConfig.ts games/brick-breaker-3d/src/objects/Ball.ts games/brick-breaker-3d/src/objects/Paddle.ts games/brick-breaker-3d/tests/objects.test.ts -m "feat: add brick breaker game objects"
```

---

### Task 3: Implement manual wall, paddle, and reset collisions

**Files:**
- Create: `games/brick-breaker-3d/src/systems/CollisionSystem.ts`
- Create: `games/brick-breaker-3d/tests/CollisionSystem.test.ts`

**Interfaces:**
- Consumes: `Ball` and `Paddle` APIs from Task 2; `ArenaBounds { minX: number; maxX: number; backZ: number; resetZ: number }`.
- Produces: `new CollisionSystem(bounds)`, `CollisionSystem.update(ball, paddle): CollisionEvent[]`, and union type `CollisionEvent = 'side-wall' | 'back-wall' | 'paddle' | 'reset'`.

- [ ] **Step 1: Write failing wall and reset tests**

Build real `Ball` and `Paddle` instances in the test, then assert:

```ts
it('reflects both axes at a back corner', () => {
  ball.mesh.position.set(7.8, 0.4, -9.8);
  ball.velocity.set(5, 0, -5);
  expect(system.update(ball, paddle)).toEqual(['side-wall', 'back-wall']);
  expect(ball.velocity.x).toBeLessThan(0);
  expect(ball.velocity.z).toBeGreaterThan(0);
});

it('resets after the ball fully crosses the front boundary', () => {
  ball.mesh.position.z = 11.5;
  expect(system.update(ball, paddle)).toContain('reset');
  expect(ball.mesh.position.toArray()).toEqual([0, 0.4, 4]);
});
```

- [ ] **Step 2: Write failing paddle tests**

```ts
it('sends a center hit toward the back wall', () => {
  ball.mesh.position.set(0, 0.4, 8.2);
  ball.velocity.set(0, 0, 9);
  expect(system.update(ball, paddle)).toContain('paddle');
  expect(ball.velocity.z).toBeLessThan(0);
});

it('adds positive horizontal velocity on a right-edge hit', () => {
  ball.mesh.position.set(1.6, 0.4, 8.2);
  ball.velocity.set(0, 0, 9);
  system.update(ball, paddle);
  expect(ball.velocity.x).toBeGreaterThan(0);
  expect(ball.velocity.length()).toBeCloseTo(ball.speed);
});

it('does not collide again while moving away from the paddle', () => {
  ball.mesh.position.set(0, 0.4, 8.2);
  ball.velocity.set(0, 0, -9);
  expect(system.update(ball, paddle)).not.toContain('paddle');
});
```

- [ ] **Step 3: Run collision tests and verify red**

Run: `pnpm --filter @web-games/brick-breaker-3d test -- tests/CollisionSystem.test.ts`

Expected: FAIL because `CollisionSystem` does not exist.

- [ ] **Step 4: Implement collision resolution**

For side/back walls, correct penetration before changing the velocity sign. For paddle collision, find the closest X/Z point on the paddle rectangle and compare squared distance with `radius ** 2`. Only accept `velocity.z > 0`, move the ball to `paddleZ - paddle.depth / 2 - ball.radius`, compute:

```ts
const hitOffset = (ball.mesh.position.x - paddle.mesh.position.x) / (paddle.width / 2);
ball.velocity.set(hitOffset * ball.speed * 0.75, 0, -ball.speed).normalize().multiplyScalar(ball.speed);
```

After collision resolution, reset when `ball.mesh.position.z - ball.radius > resetZ`.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm --filter @web-games/brick-breaker-3d test`

Expected: all object and collision tests pass with no warnings.

- [ ] **Step 6: Commit collision behavior**

```bash
git add games/brick-breaker-3d/src/systems/CollisionSystem.ts games/brick-breaker-3d/tests/CollisionSystem.test.ts
git commit --only games/brick-breaker-3d/src/systems/CollisionSystem.ts games/brick-breaker-3d/tests/CollisionSystem.test.ts -m "feat: add brick breaker collisions"
```

---

### Task 4: Add unified mouse and touch drag input

**Files:**
- Create: `games/brick-breaker-3d/src/input/PointerInput.ts`
- Create: `games/brick-breaker-3d/tests/PointerInput.test.ts`

**Interfaces:**
- Consumes: `HTMLCanvasElement`, `PerspectiveCamera`, Three.js `Plane`, `Raycaster`, `Vector2`, `Vector3`.
- Produces: exported `PointerSurface = Pick<HTMLCanvasElement, 'addEventListener' | 'removeEventListener' | 'setPointerCapture' | 'releasePointerCapture' | 'getBoundingClientRect'>`; `clientToNdc(clientX, clientY, rect): Vector2`; `new PointerInput(canvas: PointerSurface, camera, floorY, onMove)`; `PointerInput.dispose()`.

- [ ] **Step 1: Write coordinate conversion and pointer lifecycle tests**

```ts
it('maps the canvas center to NDC origin', () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 } as DOMRect;
  expect(clientToNdc(110, 70, rect).toArray()).toEqual([0, 0]);
});

it('returns the NDC origin for a zero-sized canvas', () => {
  const rect = { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
  expect(clientToNdc(10, 10, rect).toArray()).toEqual([0, 0]);
});
```

Add this listener-backed canvas test double and lifecycle assertion (the implementation may type its canvas dependency as `Pick<HTMLCanvasElement, ...>` so the test uses no DOM emulator):

```ts
type PointerHandler = (event: PointerEvent) => void;

const handlers = new Map<string, PointerHandler>();
const captured: number[] = [];
const canvas = {
  addEventListener: (type: string, handler: EventListenerOrEventListenerObject) => {
    handlers.set(type, handler as PointerHandler);
  },
  removeEventListener: (type: string) => handlers.delete(type),
  setPointerCapture: (pointerId: number) => captured.push(pointerId),
  releasePointerCapture: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 } as DOMRect),
};

it('tracks only the captured pointer and stops after cancellation', () => {
  const xPositions: number[] = [];
  const camera = new PerspectiveCamera(45, 2, 0.1, 100);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const input = new PointerInput(canvas, camera, 0, (x) => xPositions.push(x));

  handlers.get('pointerdown')?.({ pointerId: 7, clientX: 100, clientY: 50 } as PointerEvent);
  handlers.get('pointermove')?.({ pointerId: 8, clientX: 150, clientY: 50 } as PointerEvent);
  const countBeforeCancel = xPositions.length;
  handlers.get('pointercancel')?.({ pointerId: 7 } as PointerEvent);
  handlers.get('pointermove')?.({ pointerId: 7, clientX: 150, clientY: 50 } as PointerEvent);

  expect(captured).toEqual([7]);
  expect(xPositions).toHaveLength(countBeforeCancel);
  input.dispose();
});
```

- [ ] **Step 2: Run input tests and verify red**

Run: `pnpm --filter @web-games/brick-breaker-3d test -- tests/PointerInput.test.ts`

Expected: FAIL because `PointerInput` and `clientToNdc` do not exist.

- [ ] **Step 3: Implement Pointer Events and ray-plane projection**

Register `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` on the canvas. On pointer down, store `event.pointerId`, call `canvas.setPointerCapture(event.pointerId)`, and immediately update. For active moves, convert to NDC, call `raycaster.setFromCamera(ndc, camera)`, intersect a horizontal plane created with `new Plane(new Vector3(0, 1, 0), -floorY)`, then call `onMove(intersection.x)`. Release ownership on up/cancel and remove all four listeners in `dispose()`.

- [ ] **Step 4: Run input tests and the full suite**

Run: `pnpm --filter @web-games/brick-breaker-3d test`

Expected: all tests pass, including zero-size and pointer-cancel cases.

- [ ] **Step 5: Commit input handling**

```bash
git add games/brick-breaker-3d/src/input/PointerInput.ts games/brick-breaker-3d/tests/PointerInput.test.ts
git commit --only games/brick-breaker-3d/src/input/PointerInput.ts games/brick-breaker-3d/tests/PointerInput.test.ts -m "feat: add pointer drag controls"
```

---

### Task 5: Compose the Three.js scene and frame loop

**Files:**
- Create: `games/brick-breaker-3d/src/game/Game.ts`
- Create: `games/brick-breaker-3d/src/main.ts`
- Create: `games/brick-breaker-3d/src/style.css`
- Create: `games/brick-breaker-3d/tests/Game.test.ts`

**Interfaces:**
- Consumes: `gameConfig`, `Ball`, `Paddle`, `CollisionSystem`, `PointerInput`, and DOM root `HTMLElement`.
- Produces: `clampDelta(delta, maxDelta): number`; `new Game(root)`, `Game.start()`, `Game.dispose()`; browser entry point.

- [ ] **Step 1: Write the delta clamp test**

```ts
import { describe, expect, it } from 'vitest';
import { clampDelta } from '../src/game/Game';

describe('clampDelta', () => {
  it('limits long frame gaps', () => {
    expect(clampDelta(2, 1 / 30)).toBe(1 / 30);
  });

  it('keeps a normal frame delta unchanged', () => {
    expect(clampDelta(1 / 60, 1 / 30)).toBe(1 / 60);
  });
});
```

- [ ] **Step 2: Run the test and verify red**

Run: `pnpm --filter @web-games/brick-breaker-3d test -- tests/Game.test.ts`

Expected: FAIL because `Game.ts` does not exist.

- [ ] **Step 3: Implement the scene constructor**

In `Game` create and own:

```ts
this.scene = new Scene();
this.camera = new PerspectiveCamera(fov, width / height, near, far);
this.renderer = new WebGLRenderer({ antialias: true });
this.ball = new Ball(/* values from gameConfig.ball */);
this.paddle = new Paddle(/* values from gameConfig.paddle */);
this.collisionSystem = new CollisionSystem({ minX: -8, maxX: 8, backZ: -10, resetZ: 11 });
```

Add an `AmbientLight`, `DirectionalLight`, a rotated `PlaneGeometry` floor, and left/right/back `BoxGeometry` meshes. Append only `renderer.domElement` to the supplied root so the existing instruction element remains.

- [ ] **Step 4: Implement the frame loop and responsive resize**

Use an arrow-function frame callback so `this` remains bound:

```ts
private readonly frame = (): void => {
  const delta = clampDelta(this.clock.getDelta(), gameConfig.maxDelta);
  this.ball.update(delta);
  this.collisionSystem.update(this.ball, this.paddle);
  this.renderer.render(this.scene, this.camera);
  this.animationFrameId = requestAnimationFrame(this.frame);
};
```

`resize()` reads `root.clientWidth/clientHeight`, uses at least 1 for either dimension, updates camera aspect/projection, calls `renderer.setSize(width, height, false)`, and limits pixel ratio with `Math.min(window.devicePixelRatio, 2)`. `dispose()` cancels the frame, removes resize/input listeners, disposes all owned geometries/materials and calls `renderer.dispose()`.

- [ ] **Step 5: Implement main entry and mobile CSS**

`main.ts` imports `style.css`, gets `#app`, throws `new Error('Game root #app was not found')` when absent, creates `Game`, starts it, and disposes during `beforeunload`.

CSS must set full viewport sizing, `overflow: hidden`, `overscroll-behavior: none`, and `canvas { display: block; touch-action: none; }`. Style the instruction overlay with safe-area padding and `pointer-events: none`.

- [ ] **Step 6: Run tests, typecheck, and build**

Run: `pnpm --filter @web-games/brick-breaker-3d test`

Expected: all tests pass.

Run: `pnpm --filter @web-games/brick-breaker-3d typecheck`

Expected: exit 0 with no TypeScript errors.

Run: `pnpm --filter @web-games/brick-breaker-3d build`

Expected: Vite creates `games/brick-breaker-3d/dist` and exits 0.

- [ ] **Step 7: Commit the playable app**

```bash
git add games/brick-breaker-3d/src/game/Game.ts games/brick-breaker-3d/src/main.ts games/brick-breaker-3d/src/style.css games/brick-breaker-3d/tests/Game.test.ts
git commit --only games/brick-breaker-3d/src/game/Game.ts games/brick-breaker-3d/src/main.ts games/brick-breaker-3d/src/style.css games/brick-breaker-3d/tests/Game.test.ts -m "feat: compose Three.js brick breaker game"
```

---

### Task 6: Document the learning path and verify in a real browser

**Files:**
- Create: `games/brick-breaker-3d/README.md`
- Modify if browser verification finds a defect: the smallest owning file under `games/brick-breaker-3d/src/`

**Interfaces:**
- Consumes: final implementation and all commands from Tasks 1–5.
- Produces: Korean learning guide and fresh verification evidence for every required behavior.

- [ ] **Step 1: Write the Korean learning README**

Include exact code paths for:

1. The role of every source file.
2. Scene, camera, renderer creation in `src/game/Game.ts`; ball/paddle meshes in their object files; floor/wall meshes in `Game.ts`.
3. The `requestAnimationFrame` → `Clock.getDelta()` → clamp → update → collision → render flow.
4. Ball speed at `gameConfig.ball.speed`.
5. Paddle size at `gameConfig.paddle.width`, `height`, and `depth`.
6. Pointer Events, pointer capture, NDC conversion, Raycaster, and floor-plane intersection.
7. Five exercises in order: change colors, change ball speed, change paddle size, add destructible bricks, add lives or score UI.

Also include `pnpm dev:brick-breaker`, package-level test/typecheck/build commands, and a short “읽는 순서” section: config → objects → collision → input → Game → main.

- [ ] **Step 2: Run fresh automated verification**

Run: `pnpm --filter @web-games/brick-breaker-3d test && pnpm --filter @web-games/brick-breaker-3d typecheck && pnpm --filter @web-games/brick-breaker-3d build`

Expected: all tests pass, typecheck exits 0, and production build exits 0.

- [ ] **Step 3: Start the development server**

Run: `pnpm --filter @web-games/brick-breaker-3d dev --host 127.0.0.1`

Expected: Vite prints a local URL and stays running.

- [ ] **Step 4: Verify desktop behavior in Chromium**

Open the Vite URL with browser automation. Confirm visually that the perspective arena, floor, left/right/back walls, ball, and paddle render. Drag from the canvas center toward both horizontal edges and confirm the paddle follows but stays within walls. Observe long enough to see wall reflection, paddle reflection, and reset after a miss. Inspect the console and record zero errors and zero warnings attributable to the app.

- [ ] **Step 5: Verify mobile behavior and resize**

Resize the browser viewport to `390 × 844`. Repeat the drag interaction, confirm the canvas fills the viewport without scrolling, and confirm the camera framing still contains the arena. Resize back to desktop and verify rendering continues without console errors.

- [ ] **Step 6: Re-run verification after any browser-found fix**

If Steps 4–5 require a code change, first add a failing automated regression test where the behavior is testable, observe the expected failure, make the minimal fix, then repeat Steps 2–5. If the issue is visual-only, document the observed failure, make the minimal owning-file change, and repeat Steps 2–5.

- [ ] **Step 7: Commit documentation and any verified fix**

```bash
git add games/brick-breaker-3d/README.md games/brick-breaker-3d/src games/brick-breaker-3d/tests
git commit --only games/brick-breaker-3d/README.md games/brick-breaker-3d/src games/brick-breaker-3d/tests -m "docs: explain Three.js brick breaker structure"
```

- [ ] **Step 8: Review the final diff against the spec**

Run: `git diff 19deb96..HEAD -- games/brick-breaker-3d package.json pnpm-lock.yaml`

Check each required feature, confirm no excluded feature was added, confirm no unrelated file is in the diff, and report any unmet item explicitly rather than claiming completion.
