import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { Ball } from '../objects/Ball';
import { Player } from '../objects/Player';
import { ScoreSystem } from '../systems/ScoreSystem';
import type { Side } from '../types/game';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private ai!: Player;
  private ball!: Ball;
  private scoreText!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private score = new ScoreSystem();
  private space!: Phaser.Input.Keyboard.Key;
  private playerBounds = new Phaser.Geom.Rectangle(155, 365, 650, 205);
  private aiBounds = new Phaser.Geom.Rectangle(155, 70, 650, 205);
  private active = true;
  private lastBounceSide?: Side;

  constructor() { super('game'); }

  create(): void {
    this.drawCourt();
    this.player = new Player(this, GAME_WIDTH / 2, 510, 0x4ee7ff, true);
    this.ai = new Player(this, GAME_WIDTH / 2, 130, 0xff765f);
    this.ball = new Ball(this, GAME_WIDTH / 2, 270);

    this.scoreText = this.add.text(GAME_WIDTH / 2, 28, this.score.label(), {
      fontFamily: 'Black Han Sans', fontSize: '36px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(34, 26, 'WEB TENNIS', {
      fontFamily: 'Black Han Sans', fontSize: '24px', color: '#dfff42',
    });
    this.add.text(GAME_WIDTH - 34, 28, 'WASD / 방향키 · SPACE 스윙', {
      fontFamily: 'Inter', fontSize: '14px', color: '#b7d6ca',
    }).setOrigin(1, 0);
    this.message = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: 'Black Han Sans', fontSize: '38px', color: '#ffffff',
      backgroundColor: '#071913cc', padding: { x: 24, y: 14 }, align: 'center',
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    this.space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => this.tryPlayerHit());
  }

  update(_: number, delta: number): void {
    if (!this.active) return;
    this.player.update(this.playerBounds);
    if (Phaser.Input.Keyboard.JustDown(this.space)) this.tryPlayerHit();

    this.updateAI(delta);
    const bounced = this.ball.update(delta);
    if (bounced) this.handleBounce();
    this.tryAIHit();

    if (this.ball.x < 125 || this.ball.x > 835 || this.ball.y < 45 || this.ball.y > 595) {
      this.awardPoint(this.ball.lastHitBy === 'player' ? 'ai' : 'player');
    }
  }

  private tryPlayerHit(): void {
    this.player.swing();
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.ball.x, this.ball.y) < 88 && this.ball.height < 95) {
      const targetX = Phaser.Math.Clamp(this.input.activePointer.worldX, 180, 780);
      this.ball.hit('player', targetX, 125);
      this.lastBounceSide = undefined;
    }
  }

  private updateAI(delta: number): void {
    const targetX = Phaser.Math.Clamp(this.ball.x, this.aiBounds.left, this.aiBounds.right);
    const amount = Math.min(1, delta / 1000 * 3.2);
    this.ai.x = Phaser.Math.Linear(this.ai.x, targetX, amount);
  }

  private tryAIHit(): void {
    if (this.ball.velocity.y >= 0) return;
    if (Phaser.Math.Distance.Between(this.ai.x, this.ai.y, this.ball.x, this.ball.y) < 82 && this.ball.height < 95) {
      this.ai.swing();
      this.ball.hit('ai', Phaser.Math.Between(230, 730), 525);
      this.lastBounceSide = undefined;
    }
  }

  private handleBounce(): void {
    const side: Side = this.ball.y > GAME_HEIGHT / 2 ? 'player' : 'ai';
    if (this.lastBounceSide === side) {
      this.awardPoint(side === 'player' ? 'ai' : 'player');
      return;
    }
    this.lastBounceSide = side;
  }

  private awardPoint(winner: Side): void {
    if (!this.active) return;
    this.active = false;
    const matchWinner = this.score.point(winner);
    this.scoreText.setText(this.score.label());
    this.message.setText(matchWinner ? `${matchWinner === 'player' ? 'YOU WIN!' : 'AI WINS'}\n다시 시작합니다` : `${winner === 'player' ? 'YOUR' : 'AI'} POINT`).setVisible(true);
    this.time.delayedCall(1100, () => {
      if (matchWinner) this.score.reset();
      this.scoreText.setText(this.score.label());
      this.resetRally();
    });
  }

  private resetRally(): void {
    this.player.setPosition(GAME_WIDTH / 2, 510);
    this.ai.setPosition(GAME_WIDTH / 2, 130);
    this.ball.setPosition(GAME_WIDTH / 2, 280);
    this.ball.velocity.set(Phaser.Math.Between(-80, 80), 250);
    this.ball.height = 40;
    this.ball.verticalVelocity = 170;
    this.ball.lastHitBy = 'ai';
    this.lastBounceSide = undefined;
    this.message.setVisible(false);
    this.active = true;
  }

  private drawCourt(): void {
    const g = this.add.graphics();
    g.fillStyle(0x1f936c).fillRoundedRect(120, 55, 720, 540, 12);
    g.lineStyle(5, 0xe8fff6, 0.92).strokeRect(150, 75, 660, 500);
    g.lineStyle(3, 0xe8fff6, 0.75);
    g.lineBetween(150, 210, 810, 210);
    g.lineBetween(150, 440, 810, 440);
    g.lineBetween(480, 210, 480, 440);
    g.fillStyle(0x09281e, 0.82).fillRect(135, 318, 690, 10);
    g.lineStyle(2, 0xffffff, 0.85).lineBetween(135, 317, 825, 317);
    g.fillStyle(0xdfff42, 0.12).fillCircle(480, 510, 95);
  }
}
