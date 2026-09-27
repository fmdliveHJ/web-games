import './style.css';
import { Game } from './game/Game';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Game root #app was not found');
}

const game = new Game(root);
game.start();

window.addEventListener('beforeunload', () => game.dispose(), { once: true });
