import './style.css';

const puzzleImageUrl = new URL('../public/assets/find-nadal-melbourne.png', import.meta.url).href;
const nadalImageUrl = new URL('../public/assets/nadal-target.png', import.meta.url).href;
const GAME_SECONDS = 30;
const TARGET = { x: 74, y: 64, radius: 2.5 };

function saveCompletion(): void {
  const key = 'melbourne-arcade-completed';
  const completed = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'));
  completed.add('find-nadal');
  localStorage.setItem(key, JSON.stringify([...completed]));
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-ball">●</span><span>FIND RAFA</span><small>MELBOURNE</small></div>
      <div class="timer" aria-live="polite"><span class="timer-label">TIME LEFT</span><strong id="timer">00:30</strong></div>
      <button class="hint-button" id="hintButton" type="button" aria-label="단서 보기">단서 보기</button>
    </header>

    <section class="game" aria-label="나달 찾기 게임">
      <div class="viewport" id="viewport">
        <div class="board" id="board">
          <img src="${puzzleImageUrl}" alt="사람들로 가득한 멜버른 테니스 축제 숨은그림찾기 일러스트" draggable="false" />
          <img class="hidden-nadal" src="${nadalImageUrl}" alt="" draggable="false" />
          <button class="target" id="target" type="button" aria-label="정답 위치"></button>
          <div class="reveal-ring" id="revealRing"></div>
        </div>
      </div>
      <div class="zoom-controls" aria-label="확대 축소">
        <button id="zoomOut" type="button" aria-label="축소">−</button>
        <span id="zoomLabel">100%</span>
        <button id="zoomIn" type="button" aria-label="확대">+</button>
      </div>
      <p class="helper">확대해서 살펴보세요 · 빈 곳을 클릭해 드래그할 수 있어요</p>
      <div class="wrong-toast" id="wrongToast" role="status">닮은꼴이에요! 다시 찾아보세요.</div>
    </section>

    <section class="modal is-open" id="introModal" role="dialog" aria-modal="true" aria-labelledby="introTitle">
      <div class="modal-card intro-card">
        <span class="eyebrow">MELBOURNE TENNIS FESTIVAL</span>
        <h1 id="introTitle">진짜 나달을<br /><em>찾아라!</em></h1>
        <div class="target-card">
          <img class="target-preview" src="${nadalImageUrl}" alt="찾아야 할 나달의 모습" />
          <div><b>이 나달을 찾으세요</b><span>퍼즐 속 실제 정답 모습</span></div>
        </div>
        <p>수많은 닮은꼴 사이에 위 나달은 단 한 명.<br />30초 안에 같은 인물을 찾아 클릭하세요.</p>
        <div class="clues">
          <span>흰 헤드밴드</span><span>코랄 민소매</span><span>왼손 라켓</span>
        </div>
        <button class="primary" id="startButton" type="button">게임 시작 <b>→</b></button>
      </div>
    </section>

    <section class="modal" id="resultModal" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
      <div class="modal-card result-card">
        <span class="result-icon" id="resultIcon">✓</span>
        <span class="eyebrow" id="resultEyebrow">MATCH POINT</span>
        <h2 id="resultTitle">찾았다!</h2>
        <p id="resultCopy"></p>
        <button class="primary" id="restartButton" type="button">다시 도전하기 <b>↻</b></button>
      </div>
    </section>

    <aside class="hint-panel" id="hintPanel" aria-hidden="true">
      <button id="closeHint" type="button" aria-label="단서 닫기">×</button>
      <span class="eyebrow">PLAYER PROFILE</span>
      <h2>진짜 나달의 특징</h2>
      <img class="target-preview hint-preview" src="${nadalImageUrl}" alt="찾아야 할 나달의 모습" />
      <ul><li><i class="white"></i>매듭이 보이는 흰 헤드밴드</li><li><i class="coral"></i>코랄색 민소매 상의</li><li><i class="navy"></i>라켓은 왼손에</li></ul>
      <p>안경, 모자, 콧수염이 있다면 닮은꼴입니다.</p>
    </aside>
  </div>
`;

const timerEl = document.querySelector<HTMLElement>('#timer')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;
const board = document.querySelector<HTMLElement>('#board')!;
const target = document.querySelector<HTMLButtonElement>('#target')!;
const introModal = document.querySelector<HTMLElement>('#introModal')!;
const resultModal = document.querySelector<HTMLElement>('#resultModal')!;
const hintPanel = document.querySelector<HTMLElement>('#hintPanel')!;
const wrongToast = document.querySelector<HTMLElement>('#wrongToast')!;
const zoomLabel = document.querySelector<HTMLElement>('#zoomLabel')!;

let timeLeft = GAME_SECONDS;
let interval: number | undefined;
let playing = false;
let scale = 1;
let dragging = false;
let moved = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;
let wrongTimer: number | undefined;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function setScale(next: number): void {
  const oldWidth = board.offsetWidth;
  const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / oldWidth;
  const oldHeight = board.offsetHeight;
  const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / oldHeight;
  scale = Math.min(2.4, Math.max(1, next));
  board.style.width = `${scale * 100}%`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  requestAnimationFrame(() => {
    viewport.scrollLeft = centerX * board.offsetWidth - viewport.clientWidth / 2;
    viewport.scrollTop = centerY * board.offsetHeight - viewport.clientHeight / 2;
  });
}

function focusAnswer(): void {
  scale = 2.4;
  board.classList.add('focusing');
  board.style.width = `${scale * 100}%`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;

  window.setTimeout(() => {
    const targetLeft = board.offsetWidth * (TARGET.x / 100) - viewport.clientWidth / 2;
    const targetTop = board.offsetHeight * (TARGET.y / 100) - viewport.clientHeight / 2;
    viewport.scrollTo({
      left: Math.max(0, targetLeft),
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, 850);
}

function startGame(): void {
  timeLeft = GAME_SECONDS;
  playing = true;
  timerEl.textContent = formatTime(timeLeft);
  timerEl.closest('.timer')?.classList.remove('urgent');
  introModal.classList.remove('is-open');
  resultModal.classList.remove('is-open');
  board.classList.remove('revealed', 'focusing');
  board.style.removeProperty('width');
  scale = 1;
  zoomLabel.textContent = '100%';
  viewport.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  window.clearInterval(interval);
  interval = window.setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 30) timerEl.closest('.timer')?.classList.add('urgent');
    if (timeLeft <= 0) finish(false);
  }, 1000);
}

function finish(won: boolean): void {
  if (!playing) return;
  playing = false;
  if (won) saveCompletion();
  window.clearInterval(interval);
  board.classList.add('revealed');
  const elapsed = GAME_SECONDS - timeLeft;
  const resultIcon = document.querySelector<HTMLElement>('#resultIcon')!;
  const resultEyebrow = document.querySelector<HTMLElement>('#resultEyebrow')!;
  const resultTitle = document.querySelector<HTMLElement>('#resultTitle')!;
  const resultCopy = document.querySelector<HTMLElement>('#resultCopy')!;
  resultIcon.textContent = won ? '✓' : '!';
  resultEyebrow.textContent = won ? 'MATCH POINT' : 'TIME OUT';
  resultTitle.textContent = won ? '찾았다!' : '아깝습니다!';
  resultCopy.textContent = won
    ? `${formatTime(elapsed)} 만에 진짜 나달을 찾았습니다.`
    : '정답 위치를 확대해 표시했습니다. 한 번 더 도전해보세요.';

  if (!won) focusAnswer();
  window.setTimeout(() => resultModal.classList.add('is-open'), won ? 650 : 2400);
}

function showWrong(x: number, y: number): void {
  const mark = document.createElement('span');
  mark.className = 'wrong-mark';
  mark.style.left = `${x}px`;
  mark.style.top = `${y}px`;
  board.append(mark);
  window.setTimeout(() => mark.remove(), 700);
  wrongToast.classList.add('show');
  window.clearTimeout(wrongTimer);
  wrongTimer = window.setTimeout(() => wrongToast.classList.remove('show'), 1300);
}

target.style.left = `${TARGET.x}%`;
target.style.top = `${TARGET.y}%`;
target.style.width = `${TARGET.radius * 2}%`;
target.style.aspectRatio = '1';
target.addEventListener('click', (event) => {
  event.stopPropagation();
  if (playing && !moved) finish(true);
});

board.addEventListener('click', (event) => {
  if (!playing || moved || event.target === target) return;
  const rect = board.getBoundingClientRect();
  showWrong(event.clientX - rect.left, event.clientY - rect.top);
});

viewport.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || (event.target as HTMLElement) === target) return;
  dragging = true;
  moved = false;
  startX = event.clientX;
  startY = event.clientY;
  scrollLeft = viewport.scrollLeft;
  scrollTop = viewport.scrollTop;
  viewport.setPointerCapture(event.pointerId);
});
viewport.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  if (Math.abs(dx) + Math.abs(dy) > 7) moved = true;
  viewport.scrollLeft = scrollLeft - dx;
  viewport.scrollTop = scrollTop - dy;
});
viewport.addEventListener('pointerup', () => { dragging = false; });
viewport.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  setScale(scale + (event.deltaY < 0 ? 0.2 : -0.2));
}, { passive: false });

document.querySelector('#startButton')!.addEventListener('click', startGame);
document.querySelector('#restartButton')!.addEventListener('click', startGame);
document.querySelector('#zoomIn')!.addEventListener('click', () => setScale(scale + 0.25));
document.querySelector('#zoomOut')!.addEventListener('click', () => setScale(scale - 0.25));
document.querySelector('#hintButton')!.addEventListener('click', () => {
  hintPanel.classList.add('is-open');
  hintPanel.setAttribute('aria-hidden', 'false');
});
document.querySelector('#closeHint')!.addEventListener('click', () => {
  hintPanel.classList.remove('is-open');
  hintPanel.setAttribute('aria-hidden', 'true');
});

timerEl.textContent = formatTime(GAME_SECONDS);
