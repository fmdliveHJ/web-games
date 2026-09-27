import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import {
  PointerInput,
  clientToNdc,
  type PointerSurface,
} from '../src/input/PointerInput';

type PointerHandler = (event: PointerEvent) => void;

function rectangle(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return { left, top, width, height } as DOMRect;
}

describe('clientToNdc', () => {
  it('maps the canvas center to NDC origin', () => {
    const rect = rectangle(10, 20, 200, 100);

    expect(clientToNdc(110, 70, rect).toArray()).toEqual([0, 0]);
  });

  it('returns the NDC origin for a zero-sized canvas', () => {
    const rect = rectangle(0, 0, 0, 0);

    expect(clientToNdc(10, 10, rect).toArray()).toEqual([0, 0]);
  });
});

describe('PointerInput', () => {
  it('tracks only the captured pointer and stops after cancellation', () => {
    const handlers = new Map<string, PointerHandler>();
    const captured: number[] = [];
    const released: number[] = [];
    const canvas: PointerSurface = {
      addEventListener: (type, handler) => handlers.set(type, handler),
      removeEventListener: (type) => {
        handlers.delete(type);
      },
      setPointerCapture: (pointerId) => captured.push(pointerId),
      releasePointerCapture: (pointerId) => released.push(pointerId),
      getBoundingClientRect: () => rectangle(0, 0, 200, 100),
    };
    const xPositions: number[] = [];
    const camera = new PerspectiveCamera(45, 2, 0.1, 100);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const input = new PointerInput(canvas, camera, 0, (x) => {
      xPositions.push(x);
    });

    handlers.get('pointerdown')?.({
      pointerId: 7,
      clientX: 100,
      clientY: 50,
    } as PointerEvent);
    expect(xPositions).toHaveLength(1);

    handlers.get('pointermove')?.({
      pointerId: 8,
      clientX: 150,
      clientY: 50,
    } as PointerEvent);
    expect(xPositions).toHaveLength(1);

    handlers.get('pointercancel')?.({ pointerId: 7 } as PointerEvent);
    handlers.get('pointermove')?.({
      pointerId: 7,
      clientX: 150,
      clientY: 50,
    } as PointerEvent);

    expect(captured).toEqual([7]);
    expect(released).toEqual([7]);
    expect(xPositions).toHaveLength(1);

    input.dispose();
    expect(handlers).toHaveLength(0);
  });
});
