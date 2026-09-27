import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';

export interface BrickOptions {
  width: number;
  height: number;
  depth: number;
  position: Vector3;
  color: number;
  score: number;
}

export class Brick {
  public readonly mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  public readonly width: number;
  public readonly depth: number;
  public readonly score: number;
  public active = true;

  public constructor(options: BrickOptions) {
    this.width = options.width;
    this.depth = options.depth;
    this.score = options.score;

    this.mesh = new Mesh(
      new BoxGeometry(options.width, options.height, options.depth),
      new MeshStandardMaterial({
        color: options.color,
        roughness: 0.48,
        metalness: 0.03,
      }),
    );
    this.mesh.position.copy(options.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  public deactivate(): boolean {
    if (!this.active) {
      return false;
    }

    this.active = false;
    return true;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
