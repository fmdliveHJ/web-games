import type { Ball } from '../objects/Ball';
import type { Paddle } from '../objects/Paddle';

export interface ArenaBounds {
  minX: number;
  maxX: number;
  backZ: number;
  resetZ: number;
}

export type CollisionEvent =
  | 'side-wall'
  | 'back-wall'
  | 'paddle'
  | 'reset';

export class CollisionSystem {
  public constructor(private readonly bounds: ArenaBounds) {}

  public update(ball: Ball, paddle: Paddle): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    this.resolveSideWalls(ball, events);
    this.resolveBackWall(ball, events);
    this.resolvePaddle(ball, paddle, events);

    if (ball.mesh.position.z - ball.radius > this.bounds.resetZ) {
      ball.reset();
      events.push('reset');
    }

    return events;
  }

  private resolveSideWalls(ball: Ball, events: CollisionEvent[]): void {
    const { position } = ball.mesh;

    if (position.x + ball.radius > this.bounds.maxX) {
      position.x = this.bounds.maxX - ball.radius;
      ball.velocity.x = -Math.abs(ball.velocity.x);
      events.push('side-wall');
    } else if (position.x - ball.radius < this.bounds.minX) {
      position.x = this.bounds.minX + ball.radius;
      ball.velocity.x = Math.abs(ball.velocity.x);
      events.push('side-wall');
    }
  }

  private resolveBackWall(ball: Ball, events: CollisionEvent[]): void {
    if (ball.mesh.position.z - ball.radius < this.bounds.backZ) {
      ball.mesh.position.z = this.bounds.backZ + ball.radius;
      ball.velocity.z = Math.abs(ball.velocity.z);
      events.push('back-wall');
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
    ball.velocity
      .set(hitOffset * ball.speed * 0.75, 0, -ball.speed)
      .normalize()
      .multiplyScalar(ball.speed);
    events.push('paddle');
  }
}
