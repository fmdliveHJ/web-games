import { Scene, Vector3 } from 'three';
import { Brick } from './Brick';

export interface BrickFieldOptions {
  rows: number;
  columns: number;
  width: number;
  height: number;
  depth: number;
  gap: number;
  startZ: number;
  score: number;
  rowColors: readonly number[];
}

export class BrickField {
  private bricks: Brick[] = [];

  public constructor(
    private readonly scene: Scene,
    private readonly options: BrickFieldOptions,
  ) {
    this.createBricks();
  }

  public get activeBricks(): readonly Brick[] {
    return this.bricks.filter((brick) => brick.active);
  }

  public get remaining(): number {
    return this.bricks.reduce(
      (count, brick) => count + Number(brick.active),
      0,
    );
  }

  public remove(brick: Brick): boolean {
    if (!this.bricks.includes(brick) || !brick.deactivate()) {
      return false;
    }

    this.scene.remove(brick.mesh);
    return true;
  }

  public reset(): void {
    this.clear();
    this.createBricks();
  }

  public dispose(): void {
    this.clear();
  }

  private createBricks(): void {
    const { columns, depth, gap, height, rowColors, rows, score, startZ, width } =
      this.options;
    const fieldWidth = columns * width + (columns - 1) * gap;
    const firstX = -fieldWidth / 2 + width / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const brick = new Brick({
          width,
          height,
          depth,
          position: new Vector3(
            firstX + column * (width + gap),
            height / 2,
            startZ + row * (depth + gap),
          ),
          color: rowColors[row % rowColors.length] ?? rowColors[0] ?? 0xffffff,
          score,
        });
        this.bricks.push(brick);
        this.scene.add(brick.mesh);
      }
    }
  }

  private clear(): void {
    for (const brick of this.bricks) {
      this.scene.remove(brick.mesh);
      brick.dispose();
    }
    this.bricks = [];
  }
}
