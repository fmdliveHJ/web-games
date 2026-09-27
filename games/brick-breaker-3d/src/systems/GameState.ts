export type GamePhase = 'ready' | 'playing' | 'won' | 'game-over';

export interface GameSnapshot {
  phase: GamePhase;
  score: number;
  lives: number;
  initialLives: number;
}

export class GameState {
  private phase: GamePhase = 'ready';
  private score = 0;
  private lives: number;

  public constructor(private readonly initialLives: number) {
    this.lives = initialLives;
  }

  public get snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      score: this.score,
      lives: this.lives,
      initialLives: this.initialLives,
    };
  }

  public start(): GameSnapshot {
    if (this.phase === 'ready') {
      this.phase = 'playing';
    }
    return this.snapshot;
  }

  public addScore(points: number): GameSnapshot {
    if (this.phase === 'playing') {
      this.score += Math.max(0, points);
    }
    return this.snapshot;
  }

  public loseLife(): GameSnapshot {
    if (this.phase !== 'playing') {
      return this.snapshot;
    }

    this.lives = Math.max(0, this.lives - 1);
    this.phase = this.lives === 0 ? 'game-over' : 'ready';
    return this.snapshot;
  }

  public win(): GameSnapshot {
    if (this.phase === 'playing') {
      this.phase = 'won';
    }
    return this.snapshot;
  }

  public reset(): GameSnapshot {
    this.phase = 'ready';
    this.score = 0;
    this.lives = this.initialLives;
    return this.snapshot;
  }
}
