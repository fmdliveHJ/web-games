import Phaser from 'phaser';
import type { Side } from '../types/game';

export class Ball extends Phaser.GameObjects.Container {
  private ball: Phaser.GameObjects.Arc;
  private shadow: Phaser.GameObjects.Ellipse;
  velocity = new Phaser.Math.Vector2(150, 250);
  height = 28;
  verticalVelocity = 160;
  lastHitBy: Side = 'ai';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.shadow = scene.add.ellipse(0, 6, 18, 8, 0x00120a, 0.35);
    this.ball = scene.add.circle(0, -this.height, 8, 0xdfff42).setStrokeStyle(2, 0xffffff);
    this.add([this.shadow, this.ball]);
  }

  update(delta: number): boolean {
    const dt = delta / 1000;
    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;
    this.height += this.verticalVelocity * dt;
    this.verticalVelocity -= 430 * dt;

    let bounced = false;
    if (this.height <= 0) {
      this.height = 0;
      this.verticalVelocity = 250;
      bounced = true;
    }
    this.ball.y = -this.height;
    const shadowScale = Phaser.Math.Clamp(1 - this.height / 250, 0.45, 1);
    this.shadow.setScale(shadowScale);
    return bounced;
  }

  hit(from: Side, targetX: number, targetY: number): void {
    this.lastHitBy = from;
    this.velocity.set(targetX - this.x, targetY - this.y).normalize().scale(420);
    this.height = Math.max(this.height, 20);
    this.verticalVelocity = 280;
  }
}
