import { describe, expect, it } from 'vitest';
import { cameraScaleForAspect, clampDelta } from '../src/game/Game';

describe('clampDelta', () => {
  it('limits long frame gaps', () => {
    expect(clampDelta(2, 1 / 30)).toBe(1 / 30);
  });

  it('keeps a normal frame delta unchanged', () => {
    expect(clampDelta(1 / 60, 1 / 30)).toBe(1 / 60);
  });
});

describe('cameraScaleForAspect', () => {
  it('keeps the configured camera distance on a wide screen', () => {
    expect(cameraScaleForAspect(1.5)).toBe(1);
  });

  it('moves the camera farther away on a portrait screen', () => {
    expect(cameraScaleForAspect(0.45)).toBe(2);
  });
});
