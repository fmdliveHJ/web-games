import { Vector2 } from 'three';

type KeyboardSurfaceEvent = 'keydown' | 'keyup' | 'blur';
type KeyboardSurfaceHandler = (event: KeyboardEvent) => void;

export interface KeyboardSurface {
  addEventListener(
    type: KeyboardSurfaceEvent,
    handler: KeyboardSurfaceHandler,
  ): void;
  removeEventListener(
    type: KeyboardSurfaceEvent,
    handler: KeyboardSurfaceHandler,
  ): void;
}

const movementCodes = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyS',
]);

export class KeyboardInput {
  private readonly pressedCodes = new Set<string>();

  public constructor(private readonly surface: KeyboardSurface) {
    this.surface.addEventListener('keydown', this.handleKeyDown);
    this.surface.addEventListener('keyup', this.handleKeyUp);
    this.surface.addEventListener('blur', this.handleBlur);
  }

  public getDirection(): Vector2 {
    const x =
      Number(this.isPressed('ArrowRight', 'KeyD')) -
      Number(this.isPressed('ArrowLeft', 'KeyA'));
    const z =
      Number(this.isPressed('ArrowDown', 'KeyS')) -
      Number(this.isPressed('ArrowUp', 'KeyW'));
    const direction = new Vector2(x, z);

    return direction.lengthSq() > 1 ? direction.normalize() : direction;
  }

  public dispose(): void {
    this.surface.removeEventListener('keydown', this.handleKeyDown);
    this.surface.removeEventListener('keyup', this.handleKeyUp);
    this.surface.removeEventListener('blur', this.handleBlur);
    this.pressedCodes.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!movementCodes.has(event.code)) {
      return;
    }

    event.preventDefault?.();
    this.pressedCodes.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!movementCodes.has(event.code)) {
      return;
    }

    event.preventDefault?.();
    this.pressedCodes.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.pressedCodes.clear();
  };

  private isPressed(primary: string, alternative: string): boolean {
    return this.pressedCodes.has(primary) || this.pressedCodes.has(alternative);
  }
}
