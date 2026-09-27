import {
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';

type PointerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel';

type PointerHandler = (event: PointerEvent) => void;

export interface PointerSurface {
  addEventListener(type: PointerEventType, handler: PointerHandler): void;
  removeEventListener(type: PointerEventType, handler: PointerHandler): void;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
  getBoundingClientRect(): DOMRect;
}

export function clientToNdc(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): Vector2 {
  if (rect.width <= 0 || rect.height <= 0) {
    return new Vector2(0, 0);
  }

  return new Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
}

export class PointerInput {
  private readonly raycaster = new Raycaster();
  private readonly floorPlane: Plane;
  private readonly intersection = new Vector3();
  private activePointerId: number | null = null;

  public constructor(
    private readonly canvas: PointerSurface,
    private readonly camera: PerspectiveCamera,
    floorY: number,
    private readonly onMove: (x: number) => void,
  ) {
    this.floorPlane = new Plane(new Vector3(0, 1, 0), -floorY);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerEnd);
    this.canvas.addEventListener('pointercancel', this.handlePointerEnd);
  }

  public dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerEnd);
    this.canvas.removeEventListener('pointercancel', this.handlePointerEnd);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    this.updateTarget(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.updateTarget(event);
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.canvas.releasePointerCapture(event.pointerId);
    this.activePointerId = null;
  };

  private updateTarget(event: PointerEvent): void {
    const ndc = clientToNdc(
      event.clientX,
      event.clientY,
      this.canvas.getBoundingClientRect(),
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    if (this.raycaster.ray.intersectPlane(this.floorPlane, this.intersection)) {
      this.onMove(this.intersection.x);
    }
  }
}
