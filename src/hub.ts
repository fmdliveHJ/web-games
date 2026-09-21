import './hub.css';

type Game = {
  id: string;
  number: string;
  title: string;
  english: string;
  description: string;
  path: string;
  className: string;
  tag: string;
};

const games: Game[] = [
  { id: 'find-nadal', number: '01', title: '진짜 나달을 찾아라', english: 'FIND RAFA', description: '수백 명의 관중 사이에서 단 한 명의 진짜 나달을 30초 안에 찾아보세요.', path: '/games/find-nadal/', className: 'find', tag: 'HIDDEN OBJECT' },
  { id: 'tennis-breakout', number: '02', title: '테니스 스매시', english: 'TENNIS BREAKOUT', description: '스윙 타이밍을 맞춰 강력한 테니스 공으로 모든 블록을 격파하세요.', path: '/games/tennis-breakout/', className: 'breakout', tag: 'ARCADE ACTION' },
  { id: 'ao-territory', number: '03', title: 'AO 코트 점령전', english: 'TERRITORY DRIVE', description: '기아 카툰 차량으로 벌레를 가두고 멜버른 테니스 코트를 점령하세요.', path: '/games/ao-territory/', className: 'territory', tag: 'TERRITORY' },
];

const STORAGE_KEY = 'melbourne-arcade-completed';
const REWARD_SEEN_KEY = 'melbourne-arcade-reward-seen';

function getCompleted(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
  catch { return new Set<string>(); }
}

let completed = getCompleted();

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="page-shell">
    <header>
      <a class="logo" href="/" aria-label="홈"><i>●</i><span>MELBOURNE<br /><b>WEB ARCADE</b></span></a>
      <p>AO SUMMER · GAME COLLECTION</p>
      <span class="online"><i></i> 3 GAMES ONLINE</span>
    </header>

    <section class="hero">
      <span class="eyebrow">CHOOSE YOUR MATCH</span>
      <h1>오늘은 어떤 게임을<br /><em>플레이할까요?</em></h1>
      <p>세 게임을 모두 클리어하고 AO 퍼즐을 완성하면 특별한 테니스공 리워드가 열립니다.</p>
    </section>

    <section class="game-grid" aria-label="게임 선택">
      ${games.map((game) => `
        <a class="game-card ${game.className}" data-game="${game.id}" href="${game.path}">
          <div class="visual">
            <span class="number">${game.number}</span>
            ${game.className === 'breakout' ? '<div class="brick-art"><i></i><i></i><i></i><i></i><i></i><i></i><b>🎾</b></div>' : ''}
            ${game.className === 'territory' ? '<img class="car" src="/games/ao-territory/public/assets/kia-car.png" alt="" />' : ''}
            <span class="play">PLAY <b>↗</b></span>
          </div>
          <div class="copy">
            <span class="tag">${game.tag}</span><span class="clear-stamp">CLEAR ✓</span>
            <h2>${game.title}</h2><strong>${game.english}</strong><p>${game.description}</p>
          </div>
        </a>
      `).join('')}
    </section>
    <footer><span>← →</span> 카드를 선택해 플레이하세요 <b>2026 MELBOURNE</b></footer>
  </div>

  <aside class="ao-progress" aria-label="AO 퍼즐 진행도">
    <span class="progress-label">AO PUZZLE</span>
    <div class="ao-mark" id="aoMark" aria-label="AO 퍼즐 0퍼센트">
      <span class="ao-outline">AO</span>
      <span class="puzzle-piece piece-one">AO</span>
      <span class="puzzle-piece piece-two">AO</span>
      <span class="puzzle-piece piece-three">AO</span>
      <i class="cut cut-one"></i><i class="cut cut-two"></i>
    </div>
    <strong id="progressCount">0 / 3</strong>
    <p>게임을 클리어할 때마다<br />AO 조각이 채워집니다.</p>
    <ol>${games.map((game) => `<li data-progress-game="${game.id}"><i></i><span>${game.title}</span></li>`).join('')}</ol>
    <button id="testComplete" type="button">완료 테스트 <b>＋</b></button>
    <button id="resetProgress" class="reset" type="button">진행 초기화</button>
  </aside>

  <section class="complete-modal" id="completeModal" role="dialog" aria-modal="true" aria-labelledby="completeTitle">
    <div class="complete-card">
      <button class="modal-close" id="closeComplete" type="button" aria-label="닫기">×</button>
      <span class="complete-kicker">AO PUZZLE COMPLETE</span>
      <div class="reward-ball" aria-hidden="true"><i></i><b>AO</b></div>
      <h2 id="completeTitle">축하합니다!</h2>
      <p><strong>커스텀 테니스공을 받아가세요~!</strong><br />세 개의 게임을 모두 클리어해 리워드가 열렸습니다.</p>
      <button class="reward-button" id="claimReward" type="button">테니스공 리워드 받기 <b>→</b></button>
    </div>
  </section>
`;

const progressCount = document.querySelector<HTMLElement>('#progressCount')!;
const aoMark = document.querySelector<HTMLElement>('#aoMark')!;
const completeModal = document.querySelector<HTMLElement>('#completeModal')!;

function renderProgress(showCompletion = false): void {
  const count = games.filter((game) => completed.has(game.id)).length;
  const percentage = count / games.length * 100;
  progressCount.textContent = `${count} / ${games.length}`;
  aoMark.dataset.progress = String(count);
  aoMark.setAttribute('aria-label', `AO 퍼즐 ${Math.round(percentage)}퍼센트`);
  games.forEach((game) => {
    document.querySelector(`[data-game="${game.id}"]`)?.classList.toggle('is-cleared', completed.has(game.id));
    document.querySelector(`[data-progress-game="${game.id}"]`)?.classList.toggle('is-cleared', completed.has(game.id));
  });
  if (showCompletion && count === games.length && localStorage.getItem(REWARD_SEEN_KEY) !== 'true') {
    localStorage.setItem(REWARD_SEEN_KEY, 'true');
    window.setTimeout(() => completeModal.classList.add('is-open'), 1450);
  }
}

document.querySelector('#testComplete')!.addEventListener('click', () => {
  const next = games.find((game) => !completed.has(game.id));
  if (next) completed.add(next.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  renderProgress(true);
});
document.querySelector('#resetProgress')!.addEventListener('click', () => {
  completed = new Set<string>(); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(REWARD_SEEN_KEY); completeModal.classList.remove('is-open'); renderProgress();
});
document.querySelector('#closeComplete')!.addEventListener('click', () => completeModal.classList.remove('is-open'));
document.querySelector('#claimReward')!.addEventListener('click', () => {
  document.querySelector<HTMLElement>('#claimReward')!.textContent = '리워드 신청 완료 ✓';
  window.setTimeout(() => completeModal.classList.remove('is-open'), 900);
});
window.addEventListener('pageshow', () => { completed = getCompleted(); renderProgress(true); });
renderProgress(true);
