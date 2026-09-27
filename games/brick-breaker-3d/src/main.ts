import './style.css';
import { Game } from './game/Game';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Game root #app was not found');
}

const game = new Game(root);
game.start();

const viewButtons = root.querySelectorAll<HTMLButtonElement>('[data-view-mode]');
const controls = new AbortController();

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
    game.dispose();
  },
  { once: true },
);
