import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
} from 'three';

export interface PaddleOptions {
  width: number;
  height: number;
  depth: number;
  position: Vector3;
  color: number;
}

export interface PaddleMovementBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class Paddle {
  public readonly mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  public readonly width: number;
  public readonly depth: number;
  public readonly velocity = new Vector2();

  private readonly previousPosition = new Vector2();

  public constructor(options: PaddleOptions) {
    this.width = options.width;
    this.depth = options.depth;

    const geometry = new BoxGeometry(
      options.width,
      options.height,
      options.depth,
    );
    const material = new MeshStandardMaterial({ color: options.color });
    this.mesh = new Mesh(geometry, material);
    this.mesh.position.copy(options.position);
    this.previousPosition.set(options.position.x, options.position.z);
  }

  public setPosition(
    x: number,
    z: number,
    bounds: PaddleMovementBounds,
  ): void {
    const halfWidth = this.width / 2;
    this.mesh.position.x = Math.min(
      bounds.maxX - halfWidth,
      Math.max(bounds.minX + halfWidth, x),
    );
    this.mesh.position.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, z));
  }

  public move(
    deltaX: number,
    deltaZ: number,
    bounds: PaddleMovementBounds,
  ): void {
    this.setPosition(
      this.mesh.position.x + deltaX,
      this.mesh.position.z + deltaZ,
      bounds,
    );
  }

  public updateVelocity(delta: number, maxSpeed: number): void {
    const currentX = this.mesh.position.x;
    const currentZ = this.mesh.position.z;

    if (delta <= 0) {
      this.velocity.set(0, 0);
    } else {
      this.velocity
        .set(
          (currentX - this.previousPosition.x) / delta,
          (currentZ - this.previousPosition.y) / delta,
        )
        .clampLength(0, maxSpeed);
    }

    this.previousPosition.set(currentX, currentZ);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
