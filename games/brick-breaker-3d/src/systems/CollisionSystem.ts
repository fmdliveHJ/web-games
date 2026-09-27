import type { Ball } from '../objects/Ball';
import type { Brick } from '../objects/Brick';
import type { Paddle } from '../objects/Paddle';

export interface ArenaBounds {
  minX: number;
  maxX: number;
  backZ: number;
  resetZ: number;
  maxBallSpeed: number;
  forwardBoost: number;
  lateralTransfer: number;
}

export type CollisionEvent =
  | { type: 'side-wall' }
  | { type: 'back-wall' }
  | { type: 'paddle' }
  | { type: 'brick'; brick: Brick }
  | { type: 'reset' };

export class CollisionSystem {
  public constructor(private readonly bounds: ArenaBounds) {}

  public update(
    ball: Ball,
    paddle: Paddle,
    bricks: readonly Brick[] = [],
  ): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    this.resolveSideWalls(ball, events);
    this.resolveBackWall(ball, events);
    this.resolveBrick(ball, bricks, events);
    this.resolvePaddle(ball, paddle, events);

    if (ball.mesh.position.z - ball.radius > this.bounds.resetZ) {
      ball.reset();
      events.push({ type: 'reset' });
    }

    return events;
  }

  private resolveSideWalls(ball: Ball, events: CollisionEvent[]): void {
    const { position } = ball.mesh;

    if (position.x + ball.radius > this.bounds.maxX) {
      position.x = this.bounds.maxX - ball.radius;
      ball.velocity.x = -Math.abs(ball.velocity.x);
      events.push({ type: 'side-wall' });
    } else if (position.x - ball.radius < this.bounds.minX) {
      position.x = this.bounds.minX + ball.radius;
      ball.velocity.x = Math.abs(ball.velocity.x);
      events.push({ type: 'side-wall' });
    }
  }

  private resolveBackWall(ball: Ball, events: CollisionEvent[]): void {
    if (ball.mesh.position.z - ball.radius < this.bounds.backZ) {
      ball.mesh.position.z = this.bounds.backZ + ball.radius;
      ball.velocity.z = Math.abs(ball.velocity.z);
      events.push({ type: 'back-wall' });
    }
  }

  private resolvePaddle(
    ball: Ball,
    paddle: Paddle,
    events: CollisionEvent[],
  ): void {
    if (ball.velocity.z <= 0) {
      return;
    }

    const ballPosition = ball.mesh.position;
    const paddlePosition = paddle.mesh.position;
    const halfWidth = paddle.width / 2;
    const halfDepth = paddle.depth / 2;
    const closestX = Math.max(
      paddlePosition.x - halfWidth,
      Math.min(ballPosition.x, paddlePosition.x + halfWidth),
    );
    const closestZ = Math.max(
      paddlePosition.z - halfDepth,
      Math.min(ballPosition.z, paddlePosition.z + halfDepth),
    );
    const distanceX = ballPosition.x - closestX;
    const distanceZ = ballPosition.z - closestZ;

    if (distanceX ** 2 + distanceZ ** 2 > ball.radius ** 2) {
      return;
    }

    ballPosition.z = paddlePosition.z - halfDepth - ball.radius;
    const hitOffset =
      (ballPosition.x - paddlePosition.x) / (paddle.width / 2);
    const currentBallSpeed = ball.velocity.length();
    const paddleForwardSpeed = Math.max(0, -paddle.velocity.y);
    const nextBallSpeed = Math.min(
      this.bounds.maxBallSpeed,
      currentBallSpeed + paddleForwardSpeed * this.bounds.forwardBoost,
    );
    const transferredX = paddle.velocity.x * this.bounds.lateralTransfer;

    ball.velocity
      .set(
        hitOffset * currentBallSpeed * 0.75 + transferredX,
        0,
        -currentBallSpeed,
      )
      .normalize()
      .multiplyScalar(nextBallSpeed);
    events.push({ type: 'paddle' });
  }

  private resolveBrick(
    ball: Ball,
    bricks: readonly Brick[],
    events: CollisionEvent[],
  ): void {
    const ballPosition = ball.mesh.position;

    for (const brick of bricks) {
      if (!brick.active) {
        continue;
      }

      const brickPosition = brick.mesh.position;
      const halfWidth = brick.width / 2;
      const halfDepth = brick.depth / 2;
      const closestX = Math.max(
        brickPosition.x - halfWidth,
        Math.min(ballPosition.x, brickPosition.x + halfWidth),
      );
      const closestZ = Math.max(
        brickPosition.z - halfDepth,
        Math.min(ballPosition.z, brickPosition.z + halfDepth),
      );
      const distanceX = ballPosition.x - closestX;
      const distanceZ = ballPosition.z - closestZ;

      if (distanceX ** 2 + distanceZ ** 2 > ball.radius ** 2) {
        continue;
      }

      const centerDeltaX = ballPosition.x - brickPosition.x;
      const centerDeltaZ = ballPosition.z - brickPosition.z;
      const penetrationX = halfWidth + ball.radius - Math.abs(centerDeltaX);
      const penetrationZ = halfDepth + ball.radius - Math.abs(centerDeltaZ);

      if (penetrationX < penetrationZ) {
        const side = centerDeltaX === 0 ? -Math.sign(ball.velocity.x) : Math.sign(centerDeltaX);
        ballPosition.x = brickPosition.x + side * (halfWidth + ball.radius);
        ball.velocity.x *= -1;
      } else {
        const side = centerDeltaZ === 0 ? -Math.sign(ball.velocity.z) : Math.sign(centerDeltaZ);
        ballPosition.z = brickPosition.z + side * (halfDepth + ball.radius);
        ball.velocity.z *= -1;
      }

      events.push({ type: 'brick', brick });
      return;
    }
  }
}
