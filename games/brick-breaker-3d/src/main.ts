import './style.css';
import { Game } from './game/Game';
import type { GameSnapshot } from './systems/GameState';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Game root #app was not found');
}

const game = new Game(root);
game.start();

const viewButtons = root.querySelectorAll<HTMLButtonElement>('[data-view-mode]');
const controls = new AbortController();
const score = root.querySelector<HTMLElement>('[data-score]');
const lives = root.querySelector<HTMLElement>('[data-lives]');
const overlay = root.querySelector<HTMLElement>('[data-game-overlay]');
const overlayTitle = root.querySelector<HTMLElement>('[data-overlay-title]');
const overlayDescription = root.querySelector<HTMLElement>(
  '[data-overlay-description]',
);
const gameAction = root.querySelector<HTMLButtonElement>('[data-game-action]');

if (
  !score ||
  !lives ||
  !overlay ||
  !overlayTitle ||
  !overlayDescription ||
  !gameAction
) {
  throw new Error('Game UI elements were not found');
}

let latestSnapshot: GameSnapshot;
const stopStateListener = game.onStateChange((snapshot) => {
  latestSnapshot = snapshot;
  score.textContent = snapshot.score.toString().padStart(4, '0');
  lives.textContent = Array.from(
    { length: snapshot.initialLives },
    (_, index) => (index < snapshot.lives ? '●' : '○'),
  ).join(' ');
  lives.setAttribute('aria-label', `남은 목숨 ${snapshot.lives}개`);
  overlay.hidden = snapshot.phase === 'playing';

  if (snapshot.phase === 'ready' && snapshot.lives === snapshot.initialLives) {
    overlayTitle.textContent = 'ACE THE COURT';
    overlayDescription.textContent =
      '움직임을 실어 공을 받아치고 모든 블록을 깨보세요.';
    gameAction.textContent = '게임 시작';
  } else if (snapshot.phase === 'ready') {
    overlayTitle.textContent = 'STAY IN PLAY';
    overlayDescription.textContent = `남은 기회 ${snapshot.lives}번. 다시 코트로 돌아가세요.`;
    gameAction.textContent = '계속하기';
  } else if (snapshot.phase === 'won') {
    overlayTitle.textContent = 'COURT CLEARED';
    overlayDescription.textContent = `최종 점수 ${snapshot.score}점. 완벽한 랠리였습니다.`;
    gameAction.textContent = '다시 시작';
  } else if (snapshot.phase === 'game-over') {
    overlayTitle.textContent = 'SESSION OVER';
    overlayDescription.textContent = `최종 점수 ${snapshot.score}점. 한 번 더 도전해보세요.`;
    gameAction.textContent = '다시 시작';
  }
});

gameAction.addEventListener(
  'click',
  () => {
    if (latestSnapshot.phase === 'won' || latestSnapshot.phase === 'game-over') {
      game.restart();
    }
    game.startRound();
  },
  { signal: controls.signal },
);

for (const button of viewButtons) {
  button.addEventListener(
    'click',
    () => {
      const mode = button.dataset.viewMode;
      if (mode !== '2d' && mode !== '3d') {
        return;
      }

      game.setViewMode(mode);
      for (const candidate of viewButtons) {
        candidate.setAttribute(
          'aria-pressed',
          String(candidate.dataset.viewMode === mode),
        );
      }
    },
    { signal: controls.signal },
  );
}

window.addEventListener(
  'beforeunload',
  () => {
    controls.abort();
    stopStateListener();
    game.dispose();
  },
  { once: true },
);
