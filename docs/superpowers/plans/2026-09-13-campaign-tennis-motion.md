# Campaign Tennis Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the campaign tennis prototype around a readable sports character, one-swipe aiming, and a synchronized serve sequence whose hand, ball, racket, and follow-through move naturally together.

**Architecture:** Keep React responsible for campaign UI and PixiJS responsible for the real-time game. Replace the split Matter.js/height simulation with deterministic TypeScript systems for aiming, motion timing, ball flight, and court projection; the Pixi view consumes snapshots from those systems instead of owning gameplay timing.

**Tech Stack:** TypeScript 5.9, React 19, PixiJS 8, GSAP 3, Vite 7, Node test runner through `tsx`

**Spec:** `docs/superpowers/specs/2026-09-13-campaign-tennis-motion-design.md`

## Global Constraints

- Modify only `games/tennis-visual-2d`; leave `games/tennis-3d` and `games/tennis-playcanvas` unchanged.
- A serve is initiated with one pointer drag and release; the user does not press separately for toss and contact.
- A normal match lasts 30–60 seconds and ends at five points.
- Support 390x844 portrait, 844x390 landscape, and 1440x900 desktop layouts without clipping either character.
- Use custom deterministic ball flight; do not add Rapier, Havok, Matter.js, or another rigid-body engine.
- Keep final brand illustration and sound files out of scope; build a polished articulated vector character whose renderer can later be replaced.
- Keep per-frame game state outside React.
- Preserve unrelated uncommitted work and stage only files listed by the active task.

---

### Task 1: Deterministic Ball Simulation

**Files:**
- Modify: `games/tennis-visual-2d/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `games/tennis-visual-2d/src/game/BallSimulation.ts`
- Create: `games/tennis-visual-2d/src/game/BallSimulation.test.ts`
- Delete after integration in Task 5: `games/tennis-visual-2d/src/game/TennisPhysics.ts`

**Interfaces:**
- Consumes: `Side` from `src/game/types.ts`
- Produces: `BallSimulation`, `BallSnapshot`, `BallStepResult`, `CourtVector3`

- [ ] **Step 1: Record the existing visual prototype as the scoped baseline**

The target app is currently an untracked user-created prototype. Commit only that app before replacing its internals; do not stage the other prototypes or root README changes:

```bash
git status --short -- games/tennis-visual-2d
git add games/tennis-visual-2d
git commit -m "feat: add visual tennis prototype"
```

Expected: the commit contains only files below `games/tennis-visual-2d` and gives later task commits a reviewable baseline.

- [ ] **Step 2: Add the TypeScript test runner**

Update the package scripts and development dependencies:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "tsx --test src/**/*.test.ts",
    "preview": "vite preview"
  },
  "devDependencies": {
    "tsx": "^4.20.5"
  }
}
```

Merge the `tsx` entry into the existing development dependencies, then run:

```bash
pnpm install
```

Expected: `pnpm --filter @web-games/tennis-visual-2d test` starts the Node test runner. Keep Matter.js until Task 5 removes the old `TennisPhysics.ts` import.

- [ ] **Step 3: Write failing ball-flight tests**

Create `BallSimulation.test.ts` with concrete assertions for the landing target, net crossing, and one-shot bounce event:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { BallSimulation } from './BallSimulation';

test('hitTo lands within five centimeters of its target', () => {
  const ball = new BallSimulation();
  ball.place({ x: 0.3, y: 0.78, z: 0.82 });
  ball.hitTo('player', { x: -0.55, y: -0.72 }, 0.92, 0.08);
  let bounce;
  for (let index = 0; index < 240 && !bounce; index += 1) {
    const result = ball.step(1 / 120);
    if (result.bounced) bounce = { x: ball.snapshot.x, y: ball.snapshot.y };
  }
  assert.ok(bounce);
  assert.ok(Math.hypot(bounce.x + 0.55, bounce.y + 0.72) < 0.05);
});

test('crossing below net height reports a net hit once', () => {
  const ball = new BallSimulation();
  ball.place({ x: 0, y: 0.2, z: 0.08 });
  ball.setVelocity({ x: 0, y: -1.5, z: 0 });
  const events = Array.from({ length: 30 }, () => ball.step(1 / 120));
  assert.equal(events.filter((event) => event.hitNet).length, 1);
});
```

- [ ] **Step 4: Run the ball tests and confirm the expected failure**

Run:

```bash
pnpm --filter @web-games/tennis-visual-2d exec tsx --test src/game/BallSimulation.test.ts
```

Expected: FAIL because `./BallSimulation` does not exist.

- [ ] **Step 5: Implement the simulation with one coordinate model**

Implement these exact public types and methods:

```ts
export interface CourtVector3 { x: number; y: number; z: number }
export interface BallSnapshot extends CourtVector3 {
  mode: 'held' | 'toss' | 'flight' | 'dead';
  lastHitBy: Side;
}
export interface BallStepResult {
  bounced: boolean;
  crossedNet: boolean;
  hitNet: boolean;
}

export class BallSimulation {
  readonly snapshot: BallSnapshot;
  place(position: CourtVector3, mode: BallSnapshot['mode'] = 'held'): void;
  setVelocity(velocity: CourtVector3): void;
  toss(origin: CourtVector3, upwardVelocity: number): void;
  attachTo(position: CourtVector3): void;
  hitTo(side: Side, target: { x: number; y: number }, flightTime: number, arcBoost?: number): void;
  step(deltaSeconds: number): BallStepResult;
}
```

Use `GRAVITY = 5.9`, `NET_HEIGHT = 0.25`, `BALL_RADIUS = 0.035`, and a maximum internal step of `1 / 120`. `hitTo` must solve the initial `x`, `y`, and `z` velocities from the requested target and flight time. `step` must reset event booleans on every call so each crossing and bounce is reported once.

- [ ] **Step 6: Run the tests and build**

Run:

```bash
pnpm --filter @web-games/tennis-visual-2d test
pnpm --filter @web-games/tennis-visual-2d build
```

Expected: all ball tests PASS; build may still use `TennisPhysics` until Task 5 but must compile.

- [ ] **Step 7: Commit the simulation**

```bash
git add games/tennis-visual-2d/package.json pnpm-lock.yaml games/tennis-visual-2d/src/game/BallSimulation.ts games/tennis-visual-2d/src/game/BallSimulation.test.ts
git commit -m "feat: add deterministic tennis ball flight"
```

### Task 2: Responsive Court Projection and Swipe Aiming

**Files:**
- Create: `games/tennis-visual-2d/src/game/CourtProjection.ts`
- Create: `games/tennis-visual-2d/src/game/CourtProjection.test.ts`
- Create: `games/tennis-visual-2d/src/game/AimController.ts`
- Create: `games/tennis-visual-2d/src/game/AimController.test.ts`
- Delete after integration in Task 5: `games/tennis-visual-2d/src/game/Projection.ts`

**Interfaces:**
- Consumes: `CourtPoint`, `ProjectedPoint` from `types.ts`
- Produces: `CourtLayout`, `createCourtLayout`, `projectCourt`, `AimShot`, `AimController`

- [ ] **Step 1: Extend the shared game types**

Add:

```ts
export interface CourtPoint { x: number; y: number }
export interface ProjectedPoint { x: number; y: number; scale: number }
```

Keep `ProjectedPoint` defined only once.

- [ ] **Step 2: Write failing projection and aiming tests**

Cover all three required viewport sizes and pointer cancellation:

```ts
test('portrait projection keeps the near player inside the safe area', () => {
  const layout = createCourtLayout(390, 844);
  const point = projectCourt(layout, { x: 0, y: 0.86 }, 0);
  assert.ok(point.y > 560 && point.y < 790);
  assert.ok(point.x > 90 && point.x < 300);
});

test('upward swipe maps to the far service box and clamps power', () => {
  const aim = aimFromDrag({ x: 195, y: 720 }, { x: 245, y: 410 }, { width: 390, height: 844 });
  assert.ok(aim.target.y < 0);
  assert.ok(aim.target.x > 0);
  assert.ok(aim.power >= 0.35 && aim.power <= 1);
});

test('cancel clears an active pointer without firing a shot', () => {
  const controller = new AimController();
  controller.begin(7, { x: 100, y: 700 });
  assert.equal(controller.cancel(7), true);
  assert.equal(controller.end(7, { x: 120, y: 400 }, { width: 390, height: 844 }), undefined);
});
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```bash
pnpm --filter @web-games/tennis-visual-2d exec tsx --test src/game/CourtProjection.test.ts src/game/AimController.test.ts
```

Expected: FAIL because the new modules do not exist.

- [ ] **Step 4: Implement responsive projection**

Implement:

```ts
export interface CourtLayout {
  width: number;
  height: number;
  centerX: number;
  farY: number;
  nearY: number;
  farHalfWidth: number;
  nearHalfWidth: number;
  heightScale: number;
}

export function createCourtLayout(width: number, height: number): CourtLayout;
export function projectCourt(layout: CourtLayout, point: CourtPoint, height?: number): ProjectedPoint;
export function screenToCourt(layout: CourtLayout, point: { x: number; y: number }): CourtPoint;
```

Portrait uses `farY = height * 0.15`, `nearY = height * 0.82`, and near-half-width no larger than `width * 0.46`. Landscape uses `farY = height * 0.12` and `nearY = height * 0.88`. Clamp scale to `0.5..1.2`.

- [ ] **Step 5: Implement one-pointer aiming**

Implement:

```ts
export interface AimShot {
  target: CourtPoint;
  power: number;
  drag: { x: number; y: number };
}

export function aimFromDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  viewport: { width: number; height: number },
): AimShot;

export class AimController {
  begin(pointerId: number, point: { x: number; y: number }): boolean;
  move(pointerId: number, point: { x: number; y: number }, viewport: { width: number; height: number }): AimShot | undefined;
  end(pointerId: number, point: { x: number; y: number }, viewport: { width: number; height: number }): AimShot | undefined;
  cancel(pointerId: number): boolean;
}
```

Require a minimum drag of 24 CSS pixels. A shorter release returns a safe shot `{ target: { x: 0, y: -0.68 }, power: 0.55 }`. Clamp target `x` to `-0.82..0.82`, target `y` to `-0.84..-0.48`, and power to `0.35..1`.

- [ ] **Step 6: Run tests and commit**

```bash
pnpm --filter @web-games/tennis-visual-2d test
git add games/tennis-visual-2d/src/game/types.ts games/tennis-visual-2d/src/game/CourtProjection.ts games/tennis-visual-2d/src/game/CourtProjection.test.ts games/tennis-visual-2d/src/game/AimController.ts games/tennis-visual-2d/src/game/AimController.test.ts
git commit -m "feat: add responsive swipe aiming"
```

### Task 3: Natural Serve Timeline and Character Controller

**Files:**
- Create: `games/tennis-visual-2d/src/game/ServeTimeline.ts`
- Create: `games/tennis-visual-2d/src/game/ServeTimeline.test.ts`
- Create: `games/tennis-visual-2d/src/game/CharacterController.ts`
- Create: `games/tennis-visual-2d/src/game/CharacterController.test.ts`
- Modify: `games/tennis-visual-2d/src/game/types.ts`

**Interfaces:**
- Consumes: `AimShot`, `BallSimulation`, `BallSnapshot`, `CourtPoint`, `Side`
- Produces: `ServePose`, `ServeTimeline`, `CharacterSnapshot`, `CharacterController`

- [ ] **Step 1: Define motion states and snapshots**

Add to `types.ts`:

```ts
export type CharacterMotion =
  | 'serveReady' | 'serveAim' | 'serveToss' | 'serveLoad'
  | 'serveContact' | 'serveFollowThrough' | 'rallyReady'
  | 'moveToBall' | 'forehand' | 'backhand' | 'recover';

export interface CharacterSnapshot {
  courtX: number;
  courtY: number;
  motion: CharacterMotion;
  motionProgress: number;
  facing: -1 | 1;
}
```

- [ ] **Step 2: Write failing timeline tests**

Use exact event counts rather than checking only the final state:

```ts
test('serve emits release, contact, and completion exactly once', () => {
  const timeline = new ServeTimeline();
  timeline.start();
  const events = [];
  for (let index = 0; index < 240; index += 1) events.push(timeline.step(1 / 120));
  assert.equal(events.filter((event) => event.releasedBall).length, 1);
  assert.equal(events.filter((event) => event.contactedBall).length, 1);
  assert.equal(events.filter((event) => event.completed).length, 1);
});

test('contact occurs after the toss apex window begins', () => {
  const timeline = new ServeTimeline();
  timeline.start();
  let releaseTime = 0;
  let contactTime = 0;
  for (let index = 0; index < 240; index += 1) {
    const event = timeline.step(1 / 120);
    if (event.releasedBall) releaseTime = timeline.elapsed;
    if (event.contactedBall) contactTime = timeline.elapsed;
  }
  assert.ok(releaseTime > 0.12 && releaseTime < 0.3);
  assert.ok(contactTime > 0.72 && contactTime < 0.9);
});
```

- [ ] **Step 3: Run the timeline tests and confirm failure**

Run:

```bash
pnpm --filter @web-games/tennis-visual-2d exec tsx --test src/game/ServeTimeline.test.ts src/game/CharacterController.test.ts
```

Expected: FAIL because the timeline and controller modules do not exist.

- [ ] **Step 4: Implement the serve timeline**

Implement these public contracts:

```ts
export interface ServePose {
  motion: CharacterMotion;
  progress: number;
  crouch: number;
  torsoTurn: number;
  tossArm: number;
  racketArm: number;
  jump: number;
}

export interface ServeEvent {
  pose: ServePose;
  releasedBall: boolean;
  contactedBall: boolean;
  completed: boolean;
}

export class ServeTimeline {
  readonly elapsed: number;
  readonly active: boolean;
  start(): void;
  step(deltaSeconds: number): ServeEvent;
}
```

Use one 1.38-second sequence. Ball release occurs at `0.22s`, contact at `0.81s`, follow-through begins immediately after contact, and completion fires at `1.38s`. Clamp a single call's delta to `1 / 30` and subdivide internally so a dropped frame cannot skip an event.

- [ ] **Step 5: Implement the controller and its tests**

Implement:

```ts
export class CharacterController {
  readonly snapshot: CharacterSnapshot;
  beginAim(): void;
  cancelAim(): void;
  startServe(shot: AimShot): boolean;
  setIncomingBall(ball: BallSnapshot): void;
  step(deltaSeconds: number, ball: BallSimulation): { contacted: boolean; completed: boolean };
}
```

At release, call `ball.toss()` from the animator's left-hand court-space position. At contact, call `ball.attachTo(racketContact)` before `ball.hitTo('player', shot.target, lerp(1.04, 0.82, shot.power), lerp(0.2, 0.04, shot.power))`. The controller must reject a second `startServe` while the timeline is active. After completion set motion to `rallyReady` without resetting court position.

Add tests that assert the ball enters `toss` on release, enters `flight` on contact, and that a second serve cannot start while active.

- [ ] **Step 6: Run tests and commit**

```bash
pnpm --filter @web-games/tennis-visual-2d test
git add games/tennis-visual-2d/src/game/types.ts games/tennis-visual-2d/src/game/ServeTimeline.ts games/tennis-visual-2d/src/game/ServeTimeline.test.ts games/tennis-visual-2d/src/game/CharacterController.ts games/tennis-visual-2d/src/game/CharacterController.test.ts
git commit -m "feat: synchronize serve motion and ball contact"
```

### Task 4: Articulated Sports Character and Effects

**Files:**
- Create: `games/tennis-visual-2d/src/game/CharacterAnimator.ts`
- Rewrite: `games/tennis-visual-2d/src/game/CharacterView.ts`
- Create: `games/tennis-visual-2d/src/game/GameEffects.ts`
- Modify: `games/tennis-visual-2d/src/game/CourtView.ts`

**Interfaces:**
- Consumes: `CharacterSnapshot`, `ServePose`, `CourtLayout`, `ProjectedPoint`, `AimShot`
- Produces: `CharacterView.applySnapshot`, `CharacterView.handPosition`, `CharacterView.racketContact`, `GameEffects.showAim`, `GameEffects.hit`

- [ ] **Step 1: Replace the one-piece figure with an articulated hierarchy**

Create the renderer boundary used by future sprite-sheet characters:

```ts
export interface CharacterAnimator {
  applySnapshot(snapshot: CharacterSnapshot, servePose?: ServePose): void;
  getHandPosition(): CourtVector3;
  getRacketContact(): CourtVector3;
}
```

Make `CharacterView extends Container implements CharacterAnimator`.

Build named Pixi containers with pivots at anatomical joints:

```ts
private body = new Container();
private torso = new Container();
private hips = new Container();
private head = new Container();
private tossUpperArm = new Container();
private tossForearm = new Container();
private racketUpperArm = new Container();
private racketForearm = new Container();
private leftThigh = new Container();
private leftShin = new Container();
private rightThigh = new Container();
private rightShin = new Container();
private racket = new Container();
```

Use a 5.5-head visual ratio: head radius `11`, shoulder width `34`, torso height `32`, thigh length `25`, shin length `24`. Draw filled limbs with a dark 3px outline rather than single stroked lines. Give Ace and Ruby different hair silhouettes, shirt panels, and ready-pose offsets; do not represent them only by cyan/pink color changes.

- [ ] **Step 2: Map controller progress to readable poses**

Expose:

```ts
applySnapshot(snapshot: CharacterSnapshot, servePose?: ServePose): void;
getHandPosition(): CourtVector3;
getRacketContact(): CourtVector3;
```

Use eased interpolation between pose keyframes. `serveLoad` must visibly bend both knees, rotate shoulders away from the net, extend the toss arm, and place the racket behind the head. `serveContact` must straighten the legs, lift the body, extend the racket arm, and move the racket contact above and slightly in front of the head. `serveFollowThrough` must carry the racket across the torso instead of snapping to ready.

- [ ] **Step 3: Add aim and hit feedback**

Implement:

```ts
export class GameEffects extends Container {
  consumeImpact(): number;
  showAim(origin: ProjectedPoint, shot: AimShot, layout: CourtLayout): void;
  hideAim(): void;
  hit(point: ProjectedPoint, color: number): void;
  bounce(point: ProjectedPoint): void;
  update(deltaSeconds: number): void;
}
```

Draw a curved dotted trajectory, a filled landing ring, and a power-colored arrow while aiming. `hit` produces 12 short speed streaks and returns all temporary graphics to a small pool after 400ms. Apply camera punch to `VisualTennisGame.world` in Task 5; `consumeImpact()` returns the current `0..1` impact once and resets it to zero.

- [ ] **Step 4: Restyle the court for character readability**

Update `CourtView` to accept `CourtLayout` and redraw on resize. Use a warm campaign background, a medium-value green court, off-white lines, and a net whose top band stays visible at both orientations. Keep sufficient contrast for both cyan and coral character clothing.

- [ ] **Step 5: Build and visually inspect the isolated views**

Keep the existing `place`, `updateMovement`, `follow`, `faceBall`, `swing`, and `serve` methods as temporary adapters that delegate to the new pose system. Task 5 removes these adapters after `VisualTennisGame` moves to the new controller contract.

Run:

```bash
pnpm --filter @web-games/tennis-visual-2d build
```

Expected: TypeScript compiles; the next task will connect the new view contracts to gameplay.

- [ ] **Step 6: Commit character and effects work**

```bash
git add games/tennis-visual-2d/src/game/CharacterAnimator.ts games/tennis-visual-2d/src/game/CharacterView.ts games/tennis-visual-2d/src/game/GameEffects.ts games/tennis-visual-2d/src/game/CourtView.ts
git commit -m "feat: redesign campaign tennis characters"
```

### Task 5: Game Integration, Assisted Rally, and Cleanup

**Files:**
- Rewrite: `games/tennis-visual-2d/src/game/VisualTennisGame.ts`
- Modify: `games/tennis-visual-2d/src/game/types.ts`
- Delete: `games/tennis-visual-2d/src/game/TennisPhysics.ts`
- Delete: `games/tennis-visual-2d/src/game/Projection.ts`

**Interfaces:**
- Consumes: all systems from Tasks 1–4
- Produces: a complete select → aim → serve → rally → point loop

- [ ] **Step 1: Replace the old game phases**

Use:

```ts
export type GamePhase = 'select' | 'serve-ready' | 'aiming' | 'serving' | 'rally' | 'point';
```

`start(character)` places the character, AI, and held ball, then emits `위로 스와이프해 서브하세요`. Remove the two-press `serve-toss` flow and all `Space` timing prompts.

Extend `UIState` with `result?: { winner: Side; playerScore: number; aiScore: number }` and add a public `restart(): void`. At five points, stop on the result state instead of immediately resetting so React can display the campaign result CTA.

- [ ] **Step 2: Connect pointer input**

In `bindInput`, calculate pointer coordinates relative to the canvas, call `setPointerCapture` on `pointerdown`, preview `AimShot` on `pointermove`, and start the serve or rally return on `pointerup`. Handle `pointercancel`, `lostpointercapture`, and `visibilitychange` without producing a shot.

Keep Space as a safe centered shot and arrow keys as aim adjustment for keyboard users.

- [ ] **Step 3: Integrate fixed-step gameplay**

Run gameplay at `1 / 120` seconds with a maximum of eight catch-up steps per rendered frame:

```ts
this.accumulator = Math.min(this.accumulator + deltaMs / 1000, 8 / 120);
while (this.accumulator >= 1 / 120) {
  this.stepGame(1 / 120);
  this.accumulator -= 1 / 120;
}
this.renderGame();
```

During the serve, the character controller owns ball release and contact. During flight, `BallSimulation.step` owns motion. Never advance both code paths in the same fixed step.

When `document.visibilityState === 'hidden'`, clear the accumulator and pause game advancement. When visible again, resume from the same simulation state so the ball cannot jump.

- [ ] **Step 4: Add assisted rally positioning**

Predict the player's incoming bounce from a copy of the current ball snapshot. Move the player toward `clamp(predictedX, -0.78, 0.78)` with ease-out motion and start the appropriate stroke early enough that contact occurs when the live ball enters a `0.18` court-unit radius. If the user has not aimed, return a safe center shot. AI uses the same predictor with a reaction delay of `0.18s` and target noise up to `0.12` court units.

Add `CharacterController.test.ts` cases for forehand selection to the racket side, backhand selection across the body, and no teleport larger than `0.04` court units in one 120Hz step.

- [ ] **Step 5: Connect effects and point rules**

Show aim preview only while dragging. At contact, apply a `70ms` hit stop to visual interpolation only, spawn the hit effect, and punch the world container by at most eight screen pixels. At bounce, show a dust ring. Preserve five-point match reset and prevent duplicate point awards with a single `point` phase guard.

- [ ] **Step 6: Remove superseded modules and run the full checks**

Delete `TennisPhysics.ts` and `Projection.ts`. Remove `matter-js` and `@types/matter-js` from `games/tennis-visual-2d/package.json`, then refresh the lockfile and run:

```bash
pnpm install
pnpm --filter @web-games/tennis-visual-2d test
pnpm --filter @web-games/tennis-visual-2d build
```

Expected: every test PASS; TypeScript and Vite build successfully; no import mentions `matter-js`, `TennisPhysics`, or `./Projection`.

- [ ] **Step 7: Commit the integrated game**

```bash
git add games/tennis-visual-2d/src/game
git commit -m "feat: integrate natural serve and assisted rally"
```

### Task 6: Campaign UI, Responsive QA, and Documentation

**Files:**
- Modify: `games/tennis-visual-2d/src/ui/App.tsx`
- Modify: `games/tennis-visual-2d/src/style.css`
- Modify: `games/tennis-visual-2d/README.md`

**Interfaces:**
- Consumes: `UIState` and the finished game loop
- Produces: campaign-ready instructions and verified responsive presentation

- [ ] **Step 1: Update campaign copy and character cards**

Replace desktop-only instructions with `드래그해서 조준 · 놓으면 스윙`. Give Ace and Ruby distinct CSS card portraits that mirror their in-game hair and clothing silhouettes. Do not claim gameplay stats that are not implemented.

- [ ] **Step 2: Make HUD and canvas responsive**

Set `touch-action: none` only on the game canvas. Use safe-area variables for the top score and bottom instruction. In portrait, keep brand and score on one compact row, move help text to the bottom, and avoid covering the near character. In landscape, preserve the current top-bar arrangement.

If either canvas dimension is below 280 CSS pixels, pause rendering and display `화면을 조금 더 크게 열어주세요`; resume and redraw the projection after the next valid resize.

- [ ] **Step 3: Add the result CTA**

When `ui.result` is present, show the final score, `승리!` or `다시 도전해보세요`, and a `다시 플레이` button that calls `game.current?.restart()`. Dispatch a non-bubbling `campaign-tennis-complete` event from `canvasRoot` with `{ winner, playerScore, aiScore }` in `detail` so the containing campaign page can attach analytics without putting analytics code inside the game.

- [ ] **Step 4: Add lifecycle cleanup**

Return cleanup from `App`'s effect:

```ts
useEffect(() => {
  const instance = new VisualTennisGame(canvasRoot, setUI);
  game.current = instance;
  void instance.init();
  return () => {
    instance.destroy();
    game.current = null;
  };
}, [canvasRoot]);
```

`VisualTennisGame.destroy()` must remove window listeners, cancel GSAP tweens owned by the game, destroy the Pixi application, and ignore late callbacks.

- [ ] **Step 5: Run automated verification**

```bash
pnpm --filter @web-games/tennis-visual-2d test
pnpm --filter @web-games/tennis-visual-2d build
pnpm build
```

Expected: all tests and all workspace builds PASS.

- [ ] **Step 6: Run browser QA at required sizes**

Start `pnpm dev`, then inspect 390x844, 844x390, and 1440x900. At each size:

1. Select both Ace and Ruby in separate runs.
2. Perform ten serves with short, medium, and long drags.
3. Confirm the ball visibly leaves the hand, meets the racket above the head, and never snaps backward at contact.
4. Confirm follow-through completes before rally-ready.
5. Confirm pointer cancellation does not fire a shot.
6. Confirm neither character nor the landing marker is clipped.
7. Confirm no browser console errors appear.
8. Reach five points, confirm the result CTA appears, and confirm `다시 플레이` resets to a fresh serve.

- [ ] **Step 7: Update the game README**

Document the one-swipe serve, assisted rally, keyboard fallback, test command, and the three verified viewport sizes. State that the vector rig is the replaceable campaign character renderer and that final brand sprites can plug into `CharacterAnimator` without changing ball logic.

- [ ] **Step 8: Commit UI and verification documentation**

```bash
git add games/tennis-visual-2d/src/ui/App.tsx games/tennis-visual-2d/src/style.css games/tennis-visual-2d/README.md
git commit -m "feat: finish responsive campaign tennis flow"
```

### Task 7: Final Scope and Regression Review

**Files:**
- Inspect: every file changed by Tasks 1–6
- Modify only when a review finding requires a focused correction

**Interfaces:**
- Consumes: completed implementation and spec acceptance criteria
- Produces: evidence that the delivered game matches the approved scope

- [ ] **Step 1: Confirm scope isolation**

Run:

```bash
git diff --name-only e79a4c9..HEAD
```

Expected: only the design/plan documents, `games/tennis-visual-2d`, root lockfile, and no files under `games/tennis-3d` or `games/tennis-playcanvas`.

- [ ] **Step 2: Review spec coverage**

Check every acceptance criterion in the spec against automated output or browser evidence. Record the exact commands and viewport checks in the final handoff; do not mark a requirement complete based only on code inspection.

- [ ] **Step 3: Run clean final verification**

```bash
pnpm --filter @web-games/tennis-visual-2d test
pnpm --filter @web-games/tennis-visual-2d build
pnpm build
git diff --check
git status --short
```

Expected: tests and builds PASS, `git diff --check` prints nothing, and `git status` contains only pre-existing unrelated user changes or explicitly documented implementation changes.

- [ ] **Step 4: Commit focused corrections if review found any**

Stage only the corrected implementation files and commit with a message that names the fixed behavior, for example:

```bash
git add games/tennis-visual-2d/src/game/ServeTimeline.ts games/tennis-visual-2d/src/game/ServeTimeline.test.ts
git commit -m "fix: keep serve contact synchronized after dropped frames"
```
