import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

export interface BallOptions {
  radius: number;
  speed: number;
  startPosition: Vector3;
  startDirection: Vector3;
  color: number;
}

export class Ball {
  public readonly mesh: Mesh<SphereGeometry, MeshStandardMaterial>;
  public readonly velocity: Vector3;
  public readonly radius: number;
  public readonly speed: number;

  private readonly startPosition: Vector3;
  private readonly startVelocity: Vector3;

  public constructor(options: BallOptions) {
    this.radius = options.radius;
    this.speed = options.speed;
    this.startPosition = options.startPosition.clone();
    this.startVelocity = options.startDirection
      .clone()
      .normalize()
      .multiplyScalar(options.speed);
    this.velocity = this.startVelocity.clone();

    const geometry = new SphereGeometry(options.radius, 32, 16);
    const material = new MeshStandardMaterial({ color: options.color });
    this.mesh = new Mesh(geometry, material);
    this.mesh.position.copy(this.startPosition);
  }

  public update(delta: number): void {
    this.mesh.position.addScaledVector(this.velocity, delta);
  }

  public reset(): void {
    this.mesh.position.copy(this.startPosition);
    this.velocity.copy(this.startVelocity);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
