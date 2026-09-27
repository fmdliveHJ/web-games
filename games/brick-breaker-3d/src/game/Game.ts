import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Clock,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { gameConfig } from '../config/gameConfig';
import { PointerInput } from '../input/PointerInput';
import { Ball } from '../objects/Ball';
import { Paddle } from '../objects/Paddle';
import { CollisionSystem } from '../systems/CollisionSystem';

export function clampDelta(delta: number, maxDelta: number): number {
  return Math.min(delta, maxDelta);
}

export class Game {
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly clock = new Clock(false);
  private readonly ball: Ball;
  private readonly paddle: Paddle;
  private readonly collisionSystem: CollisionSystem;
  private readonly pointerInput: PointerInput;
  private readonly arenaMeshes: Mesh<BufferGeometry, MeshStandardMaterial>[] = [];
  private animationFrameId: number | null = null;

  public constructor(private readonly root: HTMLElement) {
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    const { arena, camera, colors } = gameConfig;
    const minX = -arena.width / 2;
    const maxX = arena.width / 2;

    this.scene = new Scene();
    this.scene.background = new Color(colors.background);

    this.camera = new PerspectiveCamera(
      camera.fov,
      width / height,
      camera.near,
      camera.far,
    );
    this.camera.position.set(...camera.position);
    this.camera.lookAt(...camera.lookAt);

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    root.append(this.renderer.domElement);

    this.addLights();
    this.addArena();

    this.ball = new Ball({
      radius: gameConfig.ball.radius,
      speed: gameConfig.ball.speed,
      startPosition: new Vector3(...gameConfig.ball.startPosition),
      startDirection: new Vector3(...gameConfig.ball.startDirection),
      color: colors.ball,
    });
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
    this.scene.add(this.paddle.mesh);

    this.collisionSystem = new CollisionSystem({
      minX,
      maxX,
      backZ: arena.backZ,
      resetZ: arena.frontZ,
    });
    this.pointerInput = new PointerInput(
      this.renderer.domElement,
      this.camera,
      0,
      (x) => this.paddle.setX(x, minX, maxX),
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

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.resize);
    this.pointerInput.dispose();
    this.ball.dispose();
    this.paddle.dispose();

    for (const mesh of this.arenaMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly frame = (): void => {
    const delta = clampDelta(this.clock.getDelta(), gameConfig.maxDelta);
    this.ball.update(delta);
    this.collisionSystem.update(this.ball, this.paddle);
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.frame);
  };

  private readonly resize = (): void => {
    const width = Math.max(1, this.root.clientWidth);
    const height = Math.max(1, this.root.clientHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private addLights(): void {
    this.scene.add(new AmbientLight(0xffffff, 1.5));

    const keyLight = new DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-6, 12, 8);
    this.scene.add(keyLight);
  }

  private addArena(): void {
    const { arena, colors } = gameConfig;
    const arenaCenterZ = (arena.backZ + arena.frontZ) / 2;
    const floorGeometry = new PlaneGeometry(arena.width, arena.depth);
    const floorMaterial = new MeshStandardMaterial({ color: colors.floor });
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = arenaCenterZ;
    this.addArenaMesh(floor);

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
  }

  private addArenaMesh(
    mesh: Mesh<BufferGeometry, MeshStandardMaterial>,
  ): void {
    this.arenaMeshes.push(mesh);
    this.scene.add(mesh);
  }
}
