import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Clock,
  Color,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { gameConfig } from '../config/gameConfig';
import { BrickBurst } from '../effects/BrickBurst';
import { KeyboardInput } from '../input/KeyboardInput';
import { PointerInput } from '../input/PointerInput';
import { Ball } from '../objects/Ball';
import { BrickField } from '../objects/BrickField';
import { Paddle, type PaddleMovementBounds } from '../objects/Paddle';
import { CollisionSystem } from '../systems/CollisionSystem';
import {
  GameState,
  type GameSnapshot,
} from '../systems/GameState';

export function clampDelta(delta: number, maxDelta: number): number {
  return Math.min(delta, maxDelta);
}

export function cameraScaleForAspect(aspect: number): number {
  const safeAspect = Math.max(aspect, 0.01);
  return Math.max(1, 0.9 / safeAspect);
}

export type ViewMode = '2d' | '3d';
export type GameStateListener = (snapshot: GameSnapshot) => void;

export class Game {
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly clock = new Clock(false);
  private readonly ball: Ball;
  private readonly brickField: BrickField;
  private readonly brickBurst: BrickBurst;
  private readonly paddle: Paddle;
  private readonly collisionSystem: CollisionSystem;
  private readonly gameState = new GameState(gameConfig.initialLives);
  private readonly stateListeners = new Set<GameStateListener>();
  private readonly keyboardInput: KeyboardInput;
  private readonly pointerInput: PointerInput;
  private readonly paddleBounds: PaddleMovementBounds;
  private readonly arenaMeshes: Mesh<BufferGeometry, MeshStandardMaterial>[] = [];
  private readonly grid: GridHelper;
  private viewMode: ViewMode = '3d';
  private animationFrameId: number | null = null;

  public constructor(private readonly root: HTMLElement) {
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    const { arena, camera, colors } = gameConfig;
    const minX = -arena.width / 2;
    const maxX = arena.width / 2;
    this.paddleBounds = {
      minX,
      maxX,
      minZ: gameConfig.paddle.minZ,
      maxZ: gameConfig.paddle.maxZ,
    };

    this.scene = new Scene();
    this.scene.background = new Color(colors.background);

    this.camera = new PerspectiveCamera(
      camera.fov,
      width / height,
      camera.near,
      camera.far,
    );
    this.updateCameraPosition(width / height);

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    root.append(this.renderer.domElement);

    this.addLights();
    this.grid = this.addArena();
    this.brickField = new BrickField(this.scene, gameConfig.bricks);
    this.brickBurst = new BrickBurst(this.scene);

    this.ball = new Ball({
      radius: gameConfig.ball.radius,
      speed: gameConfig.ball.speed,
      startPosition: new Vector3(...gameConfig.ball.startPosition),
      startDirection: new Vector3(...gameConfig.ball.startDirection),
      color: colors.ball,
    });
    this.ball.mesh.castShadow = true;
    this.scene.add(this.ball.mesh);

    this.paddle = new Paddle({
      width: gameConfig.paddle.width,
      height: gameConfig.paddle.height,
      depth: gameConfig.paddle.depth,
      position: new Vector3(
        0,
        gameConfig.paddle.height / 2,
        gameConfig.paddle.z,
      ),
      color: colors.paddle,
    });
    this.paddle.mesh.castShadow = true;
    this.paddle.mesh.receiveShadow = true;
    this.scene.add(this.paddle.mesh);

    this.collisionSystem = new CollisionSystem({
      minX,
      maxX,
      backZ: arena.backZ,
      resetZ: arena.frontZ,
      maxBallSpeed: gameConfig.ball.maxSpeed,
      forwardBoost: gameConfig.paddle.forwardBoost,
      lateralTransfer: gameConfig.paddle.lateralTransfer,
    });
    this.keyboardInput = new KeyboardInput(window);
    this.pointerInput = new PointerInput(
      this.renderer.domElement,
      this.camera,
      0,
      (x, z) => this.paddle.setPosition(x, z, this.paddleBounds),
    );

    window.addEventListener('resize', this.resize);
  }

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.clock.start();
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.updateCameraPosition(this.camera.aspect);
  }

  public startRound(): void {
    this.emitState(this.gameState.start());
  }

  public restart(): void {
    this.brickBurst.clear();
    this.brickField.reset();
    this.ball.reset();
    this.resetPaddle();
    this.emitState(this.gameState.reset());
  }

  public onStateChange(listener: GameStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.gameState.snapshot);
    return () => this.stateListeners.delete(listener);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.resize);
    this.keyboardInput.dispose();
    this.pointerInput.dispose();
    this.brickField.dispose();
    this.brickBurst.dispose();
    this.ball.dispose();
    this.paddle.dispose();

    for (const mesh of this.arenaMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    this.grid.geometry.dispose();
    if (Array.isArray(this.grid.material)) {
      this.grid.material.forEach((material) => material.dispose());
    } else {
      this.grid.material.dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.stateListeners.clear();
  }

  private readonly frame = (): void => {
    const delta = clampDelta(this.clock.getDelta(), gameConfig.maxDelta);
    if (this.gameState.snapshot.phase === 'playing') {
      this.updatePlaying(delta);
    }
    this.brickBurst.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.frame);
  };

  private updatePlaying(delta: number): void {
    const paddleDirection = this.keyboardInput.getDirection();
    this.paddle.move(
      paddleDirection.x * gameConfig.paddle.keyboardSpeed * delta,
      paddleDirection.y * gameConfig.paddle.keyboardSpeed * delta,
      this.paddleBounds,
    );
    this.paddle.updateVelocity(delta, gameConfig.paddle.maxTrackedSpeed);
    this.ball.update(delta);

    const collisionEvents = this.collisionSystem.update(
      this.ball,
      this.paddle,
      this.brickField.activeBricks,
    );

    for (const event of collisionEvents) {
      if (event.type === 'brick' && this.brickField.remove(event.brick)) {
        this.brickBurst.spawn(
          event.brick.mesh.position,
          event.brick.mesh.material.color.getHex(),
        );
        this.emitState(this.gameState.addScore(event.brick.score));
        if (this.brickField.remaining === 0) {
          this.emitState(this.gameState.win());
        }
      } else if (event.type === 'reset') {
        this.resetPaddle();
        this.emitState(this.gameState.loseLife());
      }
    }
  }

  private resetPaddle(): void {
    this.paddle.reset(
      new Vector3(0, gameConfig.paddle.height / 2, gameConfig.paddle.z),
    );
  }

  private emitState(snapshot: GameSnapshot): void {
    for (const listener of this.stateListeners) {
      listener(snapshot);
    }
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.root.clientWidth);
    const height = Math.max(1, this.root.clientHeight);

    this.camera.aspect = width / height;
    this.updateCameraPosition(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private addLights(): void {
    this.scene.add(new AmbientLight(0xffffff, 1.5));

    const keyLight = new DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-6, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    this.scene.add(keyLight);
  }

  private updateCameraPosition(aspect: number): void {
    const scale = cameraScaleForAspect(aspect);
    const cameraMode = gameConfig.camera.modes[this.viewMode];
    const [x, y, z] = cameraMode.position;
    const [lookAtX, lookAtY, lookAtZ] = cameraMode.lookAt;
    this.camera.up.set(
      0,
      this.viewMode === '2d' ? 0 : 1,
      this.viewMode === '2d' ? -1 : 0,
    );
    this.camera.position.set(x * scale, y * scale, z * scale);
    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
    this.camera.updateProjectionMatrix();
  }

  private addArena(): GridHelper {
    const { arena, colors } = gameConfig;
    const arenaCenterZ = (arena.backZ + arena.frontZ) / 2;
    const floorGeometry = new PlaneGeometry(arena.width, arena.depth);
    const floorMaterial = new MeshStandardMaterial({ color: colors.floor });
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = arenaCenterZ;
    floor.receiveShadow = true;
    this.addArenaMesh(floor);

    const grid = new GridHelper(arena.depth, 22, colors.grid, colors.grid);
    grid.position.set(0, 0.012, arenaCenterZ);
    grid.scale.x = arena.width / arena.depth;
    const gridMaterials = Array.isArray(grid.material)
      ? grid.material
      : [grid.material];
    for (const material of gridMaterials) {
      material.transparent = true;
      material.opacity = 0.22;
    }
    this.scene.add(grid);

    const lineMaterial = (): MeshStandardMaterial =>
      new MeshStandardMaterial({
        color: colors.courtLine,
        roughness: 0.8,
      });
    const addCourtLine = (
      width: number,
      depth: number,
      x: number,
      z: number,
    ): void => {
      const line = new Mesh(
        new BoxGeometry(width, 0.035, depth),
        lineMaterial(),
      );
      line.position.set(x, 0.025, z);
      line.receiveShadow = true;
      this.addArenaMesh(line);
    };

    addCourtLine(arena.width - 1, 0.12, 0, arena.backZ + 0.65);
    addCourtLine(arena.width - 1, 0.12, 0, arena.frontZ - 0.65);
    addCourtLine(0.12, arena.depth - 1.3, -arena.width / 2 + 0.5, arenaCenterZ);
    addCourtLine(0.12, arena.depth - 1.3, arena.width / 2 - 0.5, arenaCenterZ);
    addCourtLine(arena.width - 1, 0.1, 0, 0.5);
    addCourtLine(0.1, 8.1, 0, -3.55);

    const sideWallGeometry = (): BoxGeometry =>
      new BoxGeometry(
        arena.wallThickness,
        arena.wallHeight,
        arena.depth + arena.wallThickness,
      );
    const leftWall = new Mesh(
      sideWallGeometry(),
      new MeshStandardMaterial({ color: colors.wall }),
    );
    leftWall.position.set(
      -arena.width / 2 - arena.wallThickness / 2,
      arena.wallHeight / 2,
      arenaCenterZ,
    );
    this.addArenaMesh(leftWall);

    const rightWall = new Mesh(
      sideWallGeometry(),
      new MeshStandardMaterial({ color: colors.wall }),
    );
    rightWall.position.set(
      arena.width / 2 + arena.wallThickness / 2,
      arena.wallHeight / 2,
      arenaCenterZ,
    );
    this.addArenaMesh(rightWall);

    const backWall = new Mesh(
      new BoxGeometry(
        arena.width + arena.wallThickness * 2,
        arena.wallHeight,
        arena.wallThickness,
      ),
      new MeshStandardMaterial({ color: colors.wall }),
    );
    backWall.position.set(
      0,
      arena.wallHeight / 2,
      arena.backZ - arena.wallThickness / 2,
    );
    this.addArenaMesh(backWall);

    return grid;
  }

  private addArenaMesh(
    mesh: Mesh<BufferGeometry, MeshStandardMaterial>,
  ): void {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.arenaMeshes.push(mesh);
    this.scene.add(mesh);
  }
}
