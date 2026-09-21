import './style.css';

const revealImageUrl = new URL('../public/assets/ao-reveal.png', import.meta.url).href;
const kiaCarImageUrl = new URL('../public/assets/kia-car.png', import.meta.url).href;

type Direction = { x: number; y: number; angle: number };
type Enemy = { x: number; y: number; vx: number; vy: number; phase: number };
type Explosion = { x: number; y: number; age: number };

const WIDTH = 1280;
const HEIGHT = 720;
const COLS = 64;
const ROWS = 36;
const CELL_W = WIDTH / COLS;
const CELL_H = HEIGHT / ROWS;
const GOAL = 75;
const STEP_MS = 58;

function saveCompletion(): void {
  const key = 'melbourne-arcade-completed';
  const completed = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'));
  completed.add('ao-territory');
  localStorage.setItem(key, JSON.stringify([...completed]));
}

const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: { x: 0, y: -1, angle: 0 }, KeyW: { x: 0, y: -1, angle: 0 }, KeyE: { x: 0, y: -1, angle: 0 },
  ArrowRight: { x: 1, y: 0, angle: Math.PI / 2 }, KeyD: { x: 1, y: 0, angle: Math.PI / 2 },
  ArrowDown: { x: 0, y: 1, angle: Math.PI }, KeyS: { x: 0, y: 1, angle: Math.PI },
  ArrowLeft: { x: -1, y: 0, angle: -Math.PI / 2 }, KeyA: { x: -1, y: 0, angle: -Math.PI / 2 },
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="app-shell">
    <header class="hud">
      <div class="brand"><span class="mark">K</span><span>AO TERRITORY</span><small>MELBOURNE DRIVE</small></div>
      <div class="progress-wrap"><span>COURT CAPTURED</span><div class="progress"><i id="progressBar"></i></div><strong id="percent">0%</strong></div>
      <div class="lives"><span>LIVES</span><strong id="lives">● ● ●</strong></div>
    </header>

    <section class="stage">
      <canvas id="game" width="1280" height="720" aria-label="AO 땅따먹기 게임"></canvas>
      <div class="message" id="message"></div>
      <div class="controls" aria-label="방향 조작">
        <button data-key="ArrowUp" aria-label="위">▲</button>
        <button data-key="ArrowLeft" aria-label="왼쪽">◀</button>
        <button data-key="ArrowDown" aria-label="아래">▼</button>
        <button data-key="ArrowRight" aria-label="오른쪽">▶</button>
        <button class="capture-button" data-action="capture" aria-label="점령 시작">점령<br /><small>HOLD</small></button>
      </div>
    </section>

    <section class="modal is-open" id="intro" role="dialog" aria-modal="true" aria-labelledby="title">
      <div class="modal-card">
        <span class="eyebrow">ARCADE CHALLENGE</span>
        <div class="car-showcase"><img src="${kiaCarImageUrl}" alt="빨간색 기아 카툰 차량" /></div>
        <h1 id="title">코트를<br /><em>점령하라!</em></h1>
        <p>방향키로 이동하고, <b>SPACE를 누른 채</b> 코트 안에 선을 그리세요.<br />벌레를 피해 AO 장면을 75% 공개하면 승리!</p>
        <div class="keys"><kbd>WASD / EASD</kbd><span>+</span><kbd>SPACE HOLD</kbd></div>
        <button id="start" class="primary" type="button">DRIVE START <b>→</b></button>
      </div>
    </section>

    <section class="modal" id="result" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
      <div class="modal-card result-card">
        <span class="result-badge" id="resultBadge">WIN</span>
        <h2 id="resultTitle">코트 점령 완료!</h2>
        <p id="resultCopy"></p>
        <button id="restart" class="primary" type="button">다시 달리기 <b>↻</b></button>
      </div>
    </section>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const intro = document.querySelector<HTMLElement>('#intro')!;
const result = document.querySelector<HTMLElement>('#result')!;
const message = document.querySelector<HTMLElement>('#message')!;
const percentEl = document.querySelector<HTMLElement>('#percent')!;
const progressBar = document.querySelector<HTMLElement>('#progressBar')!;
const livesEl = document.querySelector<HTMLElement>('#lives')!;
const background = new Image();
const carImage = new Image();
background.src = revealImageUrl;
carImage.src = kiaCarImageUrl;

let owned: boolean[][] = [];
let trail = new Set<string>();
let player = { x: 2, y: 1, angle: Math.PI / 2 };
let enemies: Enemy[] = [];
let explosions: Explosion[] = [];
let activeDirection: Direction | null = null;
let spaceHeld = false;
let drawing = false;
let lives = 3;
let captured = 0;
let playing = false;
let lastStep = 0;
let lastFrame = performance.now();
let raf = 0;

const cellKey = (x: number, y: number): string => `${x},${y}`;
const inBounds = (x: number, y: number): boolean => x >= 0 && x < COLS && y >= 0 && y < ROWS;

function resetBoard(): void {
  owned = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => x < 2 || x >= COLS - 2 || y < 2 || y >= ROWS - 2),
  );
  trail.clear();
  player = { x: 2, y: 1, angle: Math.PI / 2 };
  drawing = false;
  lives = 3;
  captured = 0;
  activeDirection = null;
  spaceHeld = false;
  enemies = [
    { x: 18, y: 12, vx: 4.8, vy: 3.6, phase: 0 },
    { x: 43, y: 11, vx: -4.2, vy: 4.6, phase: 2 },
    { x: 34, y: 27, vx: 5.2, vy: -3.8, phase: 4 },
  ];
  explosions = [];
  updateHud();
}

function startGame(): void {
  cancelAnimationFrame(raf);
  resetBoard();
  playing = true;
  intro.classList.remove('is-open');
  result.classList.remove('is-open');
  lastFrame = performance.now();
  lastStep = lastFrame;
  raf = requestAnimationFrame(loop);
}

function updateHud(): void {
  percentEl.textContent = `${captured}%`;
  progressBar.style.width = `${Math.min(100, captured / GOAL * 100)}%`;
  livesEl.textContent = Array.from({ length: 3 }, (_, index) => index < lives ? '●' : '○').join(' ');
}

function movePlayer(now: number): void {
  if (!activeDirection || now - lastStep < STEP_MS) return;
  lastStep = now;
  const nextX = player.x + activeDirection.x;
  const nextY = player.y + activeDirection.y;
  if (!inBounds(nextX, nextY)) return;

  const nextKey = cellKey(nextX, nextY);
  const enteringUnowned = !owned[nextY][nextX];

  if (enteringUnowned && !spaceHeld) return;

  if (trail.has(nextKey)) {
    crash('내가 그린 선에 부딪혔어요!');
    return;
  }

  player.x = nextX;
  player.y = nextY;
  player.angle = activeDirection.angle;

  if (!owned[nextY][nextX]) {
    drawing = true;
    trail.add(nextKey);
  } else if (drawing) {
    captureTerritory();
  }
}

function captureTerritory(): void {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (let startY = 2; startY < ROWS - 2; startY += 1) {
    for (let startX = 2; startX < COLS - 2; startX += 1) {
      const startKey = cellKey(startX, startY);
      if (owned[startY][startX] || trail.has(startKey) || visited.has(startKey)) continue;

      const component = new Set<string>([startKey]);
      const queue: Array<[number, number]> = [[startX, startY]];
      visited.add(startKey);
      for (let head = 0; head < queue.length; head += 1) {
        const [x, y] = queue[head];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          const key = cellKey(nx, ny);
          if (inBounds(nx, ny) && !owned[ny][nx] && !trail.has(key) && !visited.has(key)) {
            visited.add(key);
            component.add(key);
            queue.push([nx, ny]);
          }
        }
      }
      components.push(component);
    }
  }

  const openRegion = components.reduce<Set<string> | null>(
    (largest, component) => !largest || component.size > largest.size ? component : largest,
    null,
  );
  const newlyCaptured = new Set<string>(trail);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const key = cellKey(x, y);
      if (trail.has(key) || (!owned[y][x] && !openRegion?.has(key))) {
        if (!owned[y][x]) newlyCaptured.add(key);
        owned[y][x] = true;
      }
    }
  }

  const trapped = enemies.filter((enemy) => newlyCaptured.has(cellKey(Math.floor(enemy.x), Math.floor(enemy.y))));
  if (trapped.length > 0) {
    trapped.forEach((enemy) => explosions.push({ x: enemy.x, y: enemy.y, age: 0 }));
    const trappedSet = new Set(trapped);
    enemies = enemies.filter((enemy) => !trappedSet.has(enemy));
  }
  trail.clear();
  drawing = false;
  calculateCaptured();
  flash(trapped.length > 0 ? `벌레 ${trapped.length}마리 격파!` : `${captured}% 점령!`);
  if (captured >= GOAL || enemies.length === 0) {
    playing = false;
    activeDirection = null;
    spaceHeld = false;
    window.setTimeout(() => endGame(true), trapped.length > 0 ? 850 : 0);
  }
}

function calculateCaptured(): void {
  let count = 0;
  let total = 0;
  for (let y = 2; y < ROWS - 2; y += 1) {
    for (let x = 2; x < COLS - 2; x += 1) {
      total += 1;
      if (owned[y][x]) count += 1;
    }
  }
  captured = Math.round(count / total * 100);
  updateHud();
}

function updateEnemies(delta: number): void {
  const seconds = Math.min(delta, 40) / 1000;
  for (const enemy of enemies) {
    let nextX = enemy.x + enemy.vx * seconds;
    let nextY = enemy.y + enemy.vy * seconds;
    const blockedX = !inBounds(Math.floor(nextX), Math.floor(enemy.y)) || owned[Math.floor(enemy.y)]?.[Math.floor(nextX)];
    const blockedY = !inBounds(Math.floor(enemy.x), Math.floor(nextY)) || owned[Math.floor(nextY)]?.[Math.floor(enemy.x)];
    if (blockedX) { enemy.vx *= -1; nextX = enemy.x + enemy.vx * seconds; }
    if (blockedY) { enemy.vy *= -1; nextY = enemy.y + enemy.vy * seconds; }
    enemy.x = nextX;
    enemy.y = nextY;
    enemy.phase += seconds * 8;

    const enemyCell = cellKey(Math.floor(enemy.x), Math.floor(enemy.y));
    const touchesTrail = trail.has(enemyCell);
    const touchesCar = drawing && Math.hypot(enemy.x - (player.x + .5), enemy.y - (player.y + .5)) < 1.25;
    if (touchesTrail || touchesCar) {
      crash('벌레에게 잡혔어요!');
      return;
    }
  }
}

function updateExplosions(delta: number): void {
  const seconds = Math.min(delta, 40) / 1000;
  explosions.forEach((explosion) => { explosion.age += seconds; });
  explosions = explosions.filter((explosion) => explosion.age < .85);
}

function crash(text: string): void {
  if (!playing) return;
  lives -= 1;
  updateHud();
  flash(text, true);
  trail.clear();
  drawing = false;
  player = { x: 2, y: 1, angle: Math.PI / 2 };
  activeDirection = null;
  spaceHeld = false;
  if (lives <= 0) endGame(false);
}

function flash(text: string, danger = false): void {
  message.textContent = text;
  message.className = `message show${danger ? ' danger' : ''}`;
  window.setTimeout(() => message.classList.remove('show'), 900);
}

function endGame(won: boolean): void {
  playing = false;
  if (won) saveCompletion();
  activeDirection = null;
  const badge = document.querySelector<HTMLElement>('#resultBadge')!;
  const title = document.querySelector<HTMLElement>('#resultTitle')!;
  const copy = document.querySelector<HTMLElement>('#resultCopy')!;
  badge.textContent = won ? 'WIN' : 'GAME OVER';
  title.textContent = won ? '코트 점령 완료!' : '차량이 멈췄어요';
  copy.textContent = won ? `AO 장면의 ${captured}%를 공개했습니다!` : `${captured}%까지 점령했습니다. 다시 도전해보세요.`;
  window.setTimeout(() => result.classList.add('is-open'), 650);
}

function drawBug(enemy: Enemy): void {
  const x = enemy.x * CELL_W;
  const y = enemy.y * CELL_H;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2);
  ctx.strokeStyle = '#071a39';
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i += 1) {
      const wave = Math.sin(enemy.phase + i) * 3;
      ctx.beginPath();
      ctx.moveTo(side * 9, i * 7);
      ctx.lineTo(side * (18 + wave), i * 10 - 4);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#d9fa3c';
  ctx.beginPath(); ctx.ellipse(0, 2, 12, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5d4a';
  ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#071a39';
  ctx.beginPath(); ctx.arc(-3, -14, 1.7, 0, Math.PI * 2); ctx.arc(3, -14, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawExplosion(explosion: Explosion): void {
  const progress = Math.min(1, explosion.age / .85);
  const x = explosion.x * CELL_W;
  const y = explosion.y * CELL_H;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - progress;
  ctx.rotate(progress * 1.8);
  const outer = 16 + progress * 42;
  ctx.fillStyle = '#ff5948';
  ctx.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const radius = i % 2 === 0 ? outer : outer * .42;
    const angle = i / 16 * Math.PI * 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9fa3c';
  ctx.beginPath(); ctx.arc(0, 0, Math.max(2, outer * .38), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${18 + progress * 10}px Archivo Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POP!', 0, 0);
  ctx.restore();
}

function render(): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(5, 22, 51, .93)';
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!owned[y][x]) ctx.fillRect(x * CELL_W, y * CELL_H, CELL_W + .5, CELL_H + .5);
    }
  }

  ctx.strokeStyle = 'rgba(78, 134, 190, .12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) { ctx.beginPath(); ctx.moveTo(x * CELL_W, 0); ctx.lineTo(x * CELL_W, HEIGHT); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y += 1) { ctx.beginPath(); ctx.moveTo(0, y * CELL_H); ctx.lineTo(WIDTH, y * CELL_H); ctx.stroke(); }

  ctx.fillStyle = '#61ecff';
  ctx.shadowColor = '#61ecff';
  ctx.shadowBlur = 12;
  for (const key of trail) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillRect(x * CELL_W + 4, y * CELL_H + 4, CELL_W - 8, CELL_H - 8);
  }
  ctx.shadowBlur = 0;

  enemies.forEach(drawBug);
  explosions.forEach(drawExplosion);

  const px = (player.x + .5) * CELL_W;
  const py = (player.y + .5) * CELL_H;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 9;
  ctx.drawImage(carImage, -16, -25, 32, 50);
  ctx.restore();
}

function loop(now: number): void {
  const delta = now - lastFrame;
  lastFrame = now;
  if (playing) {
    movePlayer(now);
    updateEnemies(delta);
  }
  updateExplosions(delta);
  render();
  raf = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    spaceHeld = true;
    return;
  }
  const direction = DIRECTIONS[event.code];
  if (!direction) return;
  event.preventDefault();
  activeDirection = direction;
});
window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spaceHeld = false;
    return;
  }
  const direction = DIRECTIONS[event.code];
  if (direction && activeDirection === direction) activeDirection = null;
});

document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
  const direction = DIRECTIONS[button.dataset.key!];
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); activeDirection = direction; });
  button.addEventListener('pointerup', () => { if (activeDirection === direction) activeDirection = null; });
  button.addEventListener('pointercancel', () => { if (activeDirection === direction) activeDirection = null; });
});

const captureButton = document.querySelector<HTMLButtonElement>('[data-action="capture"]')!;
captureButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  spaceHeld = true;
  captureButton.classList.add('is-held');
});
const releaseCapture = (): void => {
  spaceHeld = false;
  captureButton.classList.remove('is-held');
};
captureButton.addEventListener('pointerup', releaseCapture);
captureButton.addEventListener('pointercancel', releaseCapture);
captureButton.addEventListener('pointerleave', releaseCapture);

document.querySelector('#start')!.addEventListener('click', startGame);
document.querySelector('#restart')!.addEventListener('click', startGame);

resetBoard();
Promise.all([background.decode(), carImage.decode()]).then(render).catch(render);
