import './style.css';

type Brick = { x: number; y: number; w: number; h: number; hp: number; maxHp: number; alive: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const WIDTH = 1200;
const HEIGHT = 720;
const PLAYER_Y = 635;
const BALL_RADIUS = 10;

function saveCompletion(): void {
  const key = 'melbourne-arcade-completed';
  const completed = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'));
  completed.add('tennis-breakout');
  localStorage.setItem(key, JSON.stringify([...completed]));
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="shell">
    <header class="hud">
      <div class="brand"><span class="ball-logo">●</span><span>TENNIS SMASH</span><small>BREAKOUT</small></div>
      <div class="score"><span>SCORE</span><strong id="score">000000</strong></div>
      <div class="status"><span>BALLS</span><strong id="lives">● ● ●</strong></div>
    </header>
    <section class="stage">
      <canvas id="game" width="1200" height="720" aria-label="테니스 벽돌깨기 게임"></canvas>
      <div class="combo" id="combo">SMASH!</div>
      <div class="touch-controls">
        <button data-move="left" aria-label="왼쪽 이동">◀</button>
        <button data-action="swing" aria-label="라켓 스윙">SWING</button>
        <button data-move="right" aria-label="오른쪽 이동">▶</button>
      </div>
    </section>

    <section class="modal is-open" id="intro" role="dialog" aria-modal="true" aria-labelledby="title">
      <div class="card">
        <span class="eyebrow">MELBOURNE NIGHT SESSION</span>
        <div class="hero-icon"><span>🎾</span><i></i></div>
        <h1 id="title">TENNIS<br /><em>SMASH!</em></h1>
        <p>선수를 움직이고 라켓을 휘둘러<br />테니스 공으로 모든 블록을 깨세요.</p>
        <div class="key-guide"><kbd>A D / ← →</kbd><span>이동</span><kbd>SPACE</kbd><span>스윙·서브</span></div>
        <button class="primary" id="start" type="button">MATCH START <b>→</b></button>
      </div>
    </section>

    <section class="modal" id="result" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
      <div class="card result-card">
        <span class="trophy" id="resultIcon">🏆</span>
        <span class="eyebrow" id="resultLabel">CHAMPION</span>
        <h2 id="resultTitle">GAME, SET, MATCH!</h2>
        <p id="resultCopy"></p>
        <button class="primary" id="restart" type="button">다시 경기하기 <b>↻</b></button>
      </div>
    </section>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const intro = document.querySelector<HTMLElement>('#intro')!;
const result = document.querySelector<HTMLElement>('#result')!;
const scoreEl = document.querySelector<HTMLElement>('#score')!;
const livesEl = document.querySelector<HTMLElement>('#lives')!;
const comboEl = document.querySelector<HTMLElement>('#combo')!;

let bricks: Brick[] = [];
let particles: Particle[] = [];
let playerX = WIDTH / 2;
let moveLeft = false;
let moveRight = false;
let swingTime = 0;
let swingCooldown = 0;
let ball = { x: WIDTH / 2, y: PLAYER_Y - 82, vx: 0, vy: 0, spin: 0 };
let served = false;
let playing = false;
let lives = 3;
let score = 0;
let combo = 0;
let shake = 0;
let lastTime = performance.now();
let raf = 0;

function makeBricks(): Brick[] {
  const output: Brick[] = [];
  const cols = 10;
  const rows = 6;
  const gap = 9;
  const w = 94;
  const h = 38;
  const startX = (WIDTH - (cols * w + (cols - 1) * gap)) / 2;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const hp = row < 1 && col % 3 === 1 ? 2 : 1;
      output.push({ x: startX + col * (w + gap), y: 105 + row * (h + gap), w, h, hp, maxHp: hp, alive: true });
    }
  }
  return output;
}

function resetBall(): void {
  served = false;
  ball = { x: playerX, y: PLAYER_Y - 82, vx: 0, vy: 0, spin: 0 };
  combo = 0;
}

function resetGame(): void {
  bricks = makeBricks();
  particles = [];
  playerX = WIDTH / 2;
  lives = 3;
  score = 0;
  swingTime = 0;
  swingCooldown = 0;
  resetBall();
  updateHud();
}

function startGame(): void {
  cancelAnimationFrame(raf);
  resetGame();
  playing = true;
  intro.classList.remove('is-open');
  result.classList.remove('is-open');
  lastTime = performance.now();
  raf = requestAnimationFrame(loop);
}

function updateHud(): void {
  scoreEl.textContent = String(score).padStart(6, '0');
  livesEl.textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '●' : '○').join(' ');
}

function swing(): void {
  if (!playing || swingCooldown > 0) return;
  if (!served) {
    served = true;
    ball.vx = (Math.random() - .5) * 150;
    ball.vy = -420;
  }
  swingTime = .34;
  swingCooldown = .24;
}

function burst(x: number, y: number, color: string, count = 12): void {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 170;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .45 + Math.random() * .35, color });
  }
}

function update(delta: number): void {
  const dt = Math.min(delta, .035);
  const speed = 560;
  if (moveLeft) playerX -= speed * dt;
  if (moveRight) playerX += speed * dt;
  playerX = Math.max(70, Math.min(WIDTH - 70, playerX));
  swingTime = Math.max(0, swingTime - dt);
  swingCooldown = Math.max(0, swingCooldown - dt);
  shake = Math.max(0, shake - dt * 4);

  if (!served) {
    ball.x += (playerX - ball.x) * Math.min(1, dt * 14);
    ball.y = PLAYER_Y - 82 + Math.sin(performance.now() / 180) * 3;
  } else {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx += ball.spin * dt;
    ball.spin *= Math.pow(.6, dt);

    if (ball.x < BALL_RADIUS + 22) { ball.x = BALL_RADIUS + 22; ball.vx = Math.abs(ball.vx); }
    if (ball.x > WIDTH - BALL_RADIUS - 22) { ball.x = WIDTH - BALL_RADIUS - 22; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < BALL_RADIUS + 24) { ball.y = BALL_RADIUS + 24; ball.vy = Math.abs(ball.vy); }

    const inStrikeZone = ball.vy > 0 && ball.y > PLAYER_Y - 105 && ball.y < PLAYER_Y - 18 && Math.abs(ball.x - playerX) < 92;
    if (inStrikeZone && swingTime > .06) {
      const offset = (ball.x - playerX) / 92;
      const timing = Math.min(1, swingTime / .34);
      ball.y = PLAYER_Y - 106;
      ball.vy = -(470 + timing * 130);
      ball.vx = offset * 420 + (moveRight ? 110 : moveLeft ? -110 : 0);
      ball.spin = offset * 55;
      combo += 1;
      score += 25 * combo;
      shake = .35;
      burst(ball.x, ball.y, '#d9fa3c', 18);
      showCombo(combo > 2 ? `SMASH ×${combo}` : 'SMASH!');
      updateHud();
    }

    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (ball.x + BALL_RADIUS > brick.x && ball.x - BALL_RADIUS < brick.x + brick.w && ball.y + BALL_RADIUS > brick.y && ball.y - BALL_RADIUS < brick.y + brick.h) {
        const previousY = ball.y - ball.vy * dt;
        if (previousY + BALL_RADIUS <= brick.y || previousY - BALL_RADIUS >= brick.y + brick.h) ball.vy *= -1;
        else ball.vx *= -1;
        brick.hp -= 1;
        score += brick.hp <= 0 ? 100 + combo * 10 : 35;
        if (brick.hp <= 0) {
          brick.alive = false;
          burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brickColor(brick), 14);
        } else {
          burst(ball.x, ball.y, '#ffffff', 6);
        }
        updateHud();
        break;
      }
    }

    if (ball.y > HEIGHT + 30) loseBall();
    if (bricks.every((brick) => !brick.alive)) endGame(true);
  }

  particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; });
  particles = particles.filter((p) => p.life > 0);
}

function loseBall(): void {
  lives -= 1;
  updateHud();
  shake = .8;
  combo = 0;
  if (lives <= 0) endGame(false); else resetBall();
}

function endGame(won: boolean): void {
  if (!playing) return;
  playing = false;
  if (won) saveCompletion();
  const icon = document.querySelector<HTMLElement>('#resultIcon')!;
  const label = document.querySelector<HTMLElement>('#resultLabel')!;
  const title = document.querySelector<HTMLElement>('#resultTitle')!;
  const copy = document.querySelector<HTMLElement>('#resultCopy')!;
  icon.textContent = won ? '🏆' : '🎾';
  label.textContent = won ? 'CHAMPION' : 'MATCH OVER';
  title.textContent = won ? 'GAME, SET, MATCH!' : '아깝습니다!';
  copy.textContent = won ? `${score.toLocaleString()}점으로 모든 블록을 깼습니다.` : `${score.toLocaleString()}점을 기록했습니다. 스윙 타이밍을 다시 노려보세요.`;
  window.setTimeout(() => result.classList.add('is-open'), 500);
}

function showCombo(text: string): void {
  comboEl.textContent = text;
  comboEl.classList.remove('show');
  void comboEl.offsetWidth;
  comboEl.classList.add('show');
}

function brickColor(brick: Brick): string {
  const row = Math.round((brick.y - 105) / 47);
  return ['#ff6755', '#d9fa3c', '#51e7ff', '#ffcf45', '#8d7cff', '#ffffff'][row % 6];
}

function drawCourt(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#0a3270'); gradient.addColorStop(1, '#087fb0');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#06234f'; ctx.fillRect(0, 0, WIDTH, 74);
  ctx.fillStyle = 'rgba(4,17,42,.36)';
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 137) % WIDTH; const y = 18 + ((i * 43) % 90);
    ctx.beginPath(); ctx.arc(x, y, 5 + (i % 4), 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);
  ctx.beginPath(); ctx.moveTo(WIDTH / 2, 360); ctx.lineTo(WIDTH / 2, HEIGHT); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 510); ctx.lineTo(WIDTH - 24, 510); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(24, 510, WIDTH - 48, 8);
}

function drawBrick(brick: Brick): void {
  if (!brick.alive) return;
  ctx.save();
  ctx.fillStyle = brickColor(brick);
  ctx.strokeStyle = '#061a3a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(brick.x + 8, brick.y + 6, brick.w - 16, 4);
  if (brick.maxHp > 1 && brick.hp > 1) {
    ctx.fillStyle = '#061a3a'; ctx.font = '900 12px Archivo Black'; ctx.textAlign = 'center'; ctx.fillText('AO', brick.x + brick.w / 2, brick.y + 25);
  }
  ctx.restore();
}

function drawPlayer(): void {
  const swingProgress = swingTime > 0 ? 1 - swingTime / .34 : 0;
  const swingEase = Math.sin(swingProgress * Math.PI);
  ctx.save(); ctx.translate(playerX, PLAYER_Y);
  ctx.strokeStyle = '#061a3a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, 28); ctx.lineTo(-27, 62); ctx.moveTo(13, 28); ctx.lineTo(28, 62); ctx.stroke();
  ctx.fillStyle = '#ff6554'; ctx.strokeStyle = '#061a3a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-27, -38, 54, 72, 20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2b07d'; ctx.beginPath(); ctx.arc(0, -59, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-21, -70, 42, 9);
  ctx.save();
  ctx.rotate(-1.05 + swingEase * 2.15);
  ctx.strokeStyle = '#f2b07d'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(15, -24); ctx.lineTo(52, -4); ctx.stroke();
  ctx.strokeStyle = '#061a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(48, -7); ctx.lineTo(82, -38); ctx.stroke();
  ctx.fillStyle = '#d9fa3c'; ctx.beginPath(); ctx.ellipse(94, -49, 19, 27, .7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(6,26,58,.55)'; ctx.lineWidth = 1;
  for (let i = -9; i <= 9; i += 6) { ctx.beginPath(); ctx.moveTo(79, -58 + i); ctx.lineTo(107, -40 + i); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

function render(): void {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * shake * 14, (Math.random() - .5) * shake * 10);
  drawCourt();
  bricks.forEach(drawBrick);
  particles.forEach((p) => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
  drawPlayer();
  ctx.fillStyle = '#d9fa3c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowColor = '#d9fa3c'; ctx.shadowBlur = 13;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#789526'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ball.x - 5, ball.y, 7, -1.2, 1.2); ctx.stroke();
  ctx.restore();
}

function loop(now: number): void {
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  if (playing) update(delta);
  render();
  raf = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') moveLeft = true;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') moveRight = true;
  if (event.code === 'Space' && !event.repeat) swing();
});
window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') moveLeft = false;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') moveRight = false;
});

document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
  const isLeft = button.dataset.move === 'left';
  const set = (value: boolean): void => { if (isLeft) moveLeft = value; else moveRight = value; };
  button.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
  button.addEventListener('pointerup', () => set(false));
  button.addEventListener('pointercancel', () => set(false));
  button.addEventListener('pointerleave', () => set(false));
});
document.querySelector<HTMLButtonElement>('[data-action="swing"]')!.addEventListener('pointerdown', (e) => { e.preventDefault(); swing(); });
document.querySelector('#start')!.addEventListener('click', startGame);
document.querySelector('#restart')!.addEventListener('click', startGame);

resetGame();
render();
