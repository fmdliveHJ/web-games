import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
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

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
