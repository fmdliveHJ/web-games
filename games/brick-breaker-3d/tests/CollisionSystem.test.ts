import { Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Ball } from '../src/objects/Ball';
import { Paddle } from '../src/objects/Paddle';
import { CollisionSystem } from '../src/systems/CollisionSystem';

describe('CollisionSystem', () => {
  let ball: Ball;
  let paddle: Paddle;
  let system: CollisionSystem;

  beforeEach(() => {
    ball = new Ball({
      radius: 0.4,
      speed: 9,
      startPosition: new Vector3(0, 0.4, 4),
      startDirection: new Vector3(0.55, 0, -1),
      color: 0xffffff,
    });
    paddle = new Paddle({
      width: 3.8,
      height: 0.55,
      depth: 0.8,
      position: new Vector3(0, 0.275, 8.5),
      color: 0xffffff,
    });
    system = new CollisionSystem({
      minX: -8,
      maxX: 8,
      backZ: -10,
      resetZ: 11,
    });
  });

  afterEach(() => {
    ball.dispose();
    paddle.dispose();
  });

  it('reflects both axes at a back corner', () => {
    ball.mesh.position.set(7.8, 0.4, -9.8);
    ball.velocity.set(5, 0, -5);

    expect(system.update(ball, paddle)).toEqual(['side-wall', 'back-wall']);
    expect(ball.velocity.x).toBeLessThan(0);
    expect(ball.velocity.z).toBeGreaterThan(0);
  });

  it('resets after the ball fully crosses the front boundary', () => {
    ball.mesh.position.z = 11.5;

    expect(system.update(ball, paddle)).toContain('reset');
    expect(ball.mesh.position.toArray()).toEqual([0, 0.4, 4]);
  });

  it('sends a center hit toward the back wall', () => {
    ball.mesh.position.set(0, 0.4, 8.2);
    ball.velocity.set(0, 0, 9);

    expect(system.update(ball, paddle)).toContain('paddle');
    expect(ball.velocity.z).toBeLessThan(0);
  });

  it('adds positive horizontal velocity on a right-edge hit', () => {
    ball.mesh.position.set(1.6, 0.4, 8.2);
    ball.velocity.set(0, 0, 9);

    system.update(ball, paddle);

    expect(ball.velocity.x).toBeGreaterThan(0);
    expect(ball.velocity.length()).toBeCloseTo(ball.speed);
  });

  it('does not collide again while moving away from the paddle', () => {
    ball.mesh.position.set(0, 0.4, 8.2);
    ball.velocity.set(0, 0, -9);

    expect(system.update(ball, paddle)).not.toContain('paddle');
  });
});
