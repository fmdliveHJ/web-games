import Phaser from 'phaser';

export class Player extends Phaser.GameObjects.Container {
  private bodyShape: Phaser.GameObjects.Arc;
  private racket: Phaser.GameObjects.Arc;
  private keys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly speed = 300;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, controls = false) {
    super(scene, x, y);
    scene.add.existing(this);

    this.bodyShape = scene.add.circle(0, 0, 18, color).setStrokeStyle(4, 0xffffff, 0.9);
    this.racket = scene.add.circle(25, -4, 12, 0xffffff, 0.15).setStrokeStyle(3, 0xffffff);
    this.add([this.bodyShape, this.racket]);

    if (controls && scene.input.keyboard) {
      this.keys = scene.input.keyboard.createCursorKeys();
      this.wasd = scene.input.keyboard.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    }
  }

  update(bounds: Phaser.Geom.Rectangle): void {
    if (!this.keys || !this.wasd) return;
    let dx = 0;
    let dy = 0;
    if (this.keys.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.keys.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.keys.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.keys.down.isDown || this.wasd.S.isDown) dy += 1;

    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.speed * this.scene.game.loop.delta / 1000);
    this.x = Phaser.Math.Clamp(this.x + direction.x, bounds.left, bounds.right);
    this.y = Phaser.Math.Clamp(this.y + direction.y, bounds.top, bounds.bottom);
  }

  swing(): void {
    this.scene.tweens.killTweensOf(this.racket);
    this.racket.setRotation(-0.8);
    this.scene.tweens.add({ targets: this.racket, rotation: 0.8, duration: 130, yoyo: true });
  }
}
