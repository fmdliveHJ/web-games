import { describe, expect, it } from 'vitest';
import { clampDelta } from '../src/game/Game';

describe('clampDelta', () => {
  it('limits long frame gaps', () => {
    expect(clampDelta(2, 1 / 30)).toBe(1 / 30);
  });

  it('keeps a normal frame delta unchanged', () => {
    expect(clampDelta(1 / 60, 1 / 30)).toBe(1 / 60);
  });
});
