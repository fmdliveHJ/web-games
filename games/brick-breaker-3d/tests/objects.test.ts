import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Ball } from '../src/objects/Ball';
import { Paddle } from '../src/objects/Paddle';

describe('Ball', () => {
  it('moves by velocity multiplied by delta time', () => {
    const ball = new Ball({
      radius: 0.4,
      speed: 10,
      startPosition: new Vector3(1, 0.4, 2),
      startDirection: new Vector3(0.6, 0, -0.8),
      color: 0xffffff,
    });

    ball.update(0.5);

    expect(ball.mesh.position.x).toBeCloseTo(4);
    expect(ball.mesh.position.z).toBeCloseTo(-2);
  });

  it('restores its original position and velocity', () => {
    const ball = new Ball({
      radius: 0.4,
      speed: 10,
      startPosition: new Vector3(1, 0.4, 2),
      startDirection: new Vector3(0.6, 0, -0.8),
      color: 0xffffff,
    });

    ball.update(1);
    ball.reset();

    expect(ball.mesh.position.toArray()).toEqual([1, 0.4, 2]);
    expect(ball.velocity.toArray()).toEqual([6, 0, -8]);
  });
});

describe('Paddle', () => {
  it('clamps its center so its edges remain inside the arena', () => {
    const paddle = new Paddle({
      width: 4,
      height: 0.5,
      depth: 0.8,
      position: new Vector3(0, 0.25, 8),
      color: 0xffffff,
    });

    paddle.setX(99, -8, 8);
    expect(paddle.mesh.position.x).toBe(6);

    paddle.setX(-99, -8, 8);
    expect(paddle.mesh.position.x).toBe(-6);
  });
});
