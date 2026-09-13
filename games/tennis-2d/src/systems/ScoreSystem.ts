import type { ScoreState, Side } from '../types/game';

export class ScoreSystem {
  readonly score: ScoreState = { player: 0, ai: 0 };

  point(winner: Side): Side | null {
    this.score[winner] += 1;
    if (this.score[winner] >= 5) return winner;
    return null;
  }

  label(): string {
    return `${this.score.player}  :  ${this.score.ai}`;
  }

  reset(): void {
    this.score.player = 0;
    this.score.ai = 0;
  }
}
