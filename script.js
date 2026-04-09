const dino = document.getElementById('dino');
const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const notificationBar = document.getElementById('notificationBar');
const notificationTitle = document.getElementById('notificationTitle');
const notificationText = document.getElementById('notificationText');
const logTableBody = document.getElementById('logTableBody');
const gameOverlay = document.getElementById('gameOverlay');
const participantIdInput = document.getElementById('participantId');
const urgencySelect = document.getElementById('urgencySelect');
const taskSelect = document.getElementById('taskSelect');
const totalCountEl = document.getElementById('totalCount');
const avgTimeEl = document.getElementById('avgTime');
const nowCountEl = document.getElementById('nowCount');
const laterIgnoreCountEl = document.getElementById('laterIgnoreCount');

const urgencyMap = { low: '낮음', medium: '보통', high: '높음' };
const titleMap = { low: '일반 알림', medium: '확인이 필요한 알림', high: '긴급 알림' };

let logs = [];
let currentNotification = null;
let autoExperimentTimer = null;

let gameRunning = false;
let gameOver = false;
let animationId = null;
let spawnTimer = 0;
let score = 0;
let bestScore = 0;
let speed = 6;
let lastTime = 0;
let obstacles = [];

const dinoState = {
  x: 84,
  y: 0,
  width: 46,
  height: 52,
  velocityY: 0,
  gravity: 0.8,
  jumpPower: -14,
  groundY: 56,
  jumping: false,
};

function getGroundTop() {
  return gameArea.clientHeight - dinoState.groundY - dinoState.height;
}

function renderDino() {
  const top = getGroundTop() + dinoState.y;
  dino.style.top = `${top}px`;

  if (dinoState.jumping) {
    dino.classList.add('jumping');
    dino.classList.remove('running');
  } else {
    dino.classList.remove('jumping');
    if (gameRunning) {
      dino.classList.add('running');
    }
  }
}

function jump() {
  if (!gameRunning || gameOver || dinoState.jumping) return;

  dinoState.velocityY = dinoState.jumpPower;
  dinoState.jumping = true;
  renderDino();
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();

    if (!gameRunning && !gameOver) {
      startGame();
      return;
    }

    if (gameOver) {
      restartGame();
      return;
    }

    jump();
  }
});

function createObstacle() {
  const typeRand = Math.random();
  const wrapper = document.createElement('div');
  wrapper.className = 'obstacle';
  wrapper.style.left = `${gameArea.clientWidth + 30}px`;

  let width = 24;
  let height = 50;
  let bottom = 56;

  if (typeRand < 0.7) {
    const cactus = document.createElement('div');
    const cactusType = Math.random();

    if (cactusType < 0.33) {
      cactus.className = 'cactus small';
      width = 20;
      height = 40;
    } else if (cactusType < 0.66) {
      cactus.className = 'cactus';
      width = 24;
      height = 50;
    } else {
      cactus.className = 'cactus large';
      width = 28;
      height = 58;
    }

    wrapper.appendChild(cactus);
  } else {
    const bird = document.createElement('div');
    bird.className = 'bird flap';
    width = 34;
    height = 18;
    const flightLevels = [110, 150, 190];
    bottom = flightLevels[Math.floor(Math.random() * flightLevels.length)];
    wrapper.appendChild(bird);
  }

  wrapper.style.bottom = `${bottom}px`;
  gameArea.appendChild(wrapper);

  obstacles.push({
    el: wrapper,
    x: gameArea.clientWidth + 30,
    width,
    height,
    bottom,
    passed: false,
  });
}

function updateDinoPhysics() {
  dinoState.velocityY += dinoState.gravity;
  dinoState.y += dinoState.velocityY;

  if (dinoState.y >= 0) {
    dinoState.y = 0;
    dinoState.velocityY = 0;
    dinoState.jumping = false;
  }

  renderDino();
}

function getDinoRect() {
  const top = getGroundTop() + dinoState.y;

  return {
    left: dinoState.x + 4,
    right: dinoState.x + dinoState.width - 6,
    top: top + 4,
    bottom: top + dinoState.height - 2,
  };
}

function getObstacleRect(obs) {
  const areaHeight = gameArea.clientHeight;
  const top = areaHeight - obs.bottom - obs.height;

  return {
    left: obs.x,
    right: obs.x + obs.width,
    top,
    bottom: top + obs.height,
  };
}

function checkCollision(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function updateObstacles() {
  const dinoRect = getDinoRect();

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obs = obstacles[i];
    obs.x -= speed;
    obs.el.style.left = `${obs.x}px`;

    if (!obs.passed && obs.x + obs.width < dinoState.x) {
      obs.passed = true;
      score += 10;
      if (score > bestScore) bestScore = score;
    }

    const obstacleRect = getObstacleRect(obs);
    if (checkCollision(dinoRect, obstacleRect)) {
      endGame();
      return;
    }

    if (obs.x + obs.width < -40) {
      obs.el.remove();
      obstacles.splice(i, 1);
    }
  }
}

function updateScoreView() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
}

function gameLoop(timestamp) {
  if (!gameRunning) return;
  if (!lastTime) lastTime = timestamp;

  const delta = timestamp - lastTime;
  lastTime = timestamp;

  spawnTimer += delta;
  if (spawnTimer > Math.max(850, 1600 - score * 1.3)) {
    createObstacle();
    spawnTimer = 0;
  }

  speed = Math.min(14, 6 + score / 120);
  updateDinoPhysics();
  updateObstacles();
  updateScoreView();

  if (gameRunning) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function clearObstacles() {
  obstacles.forEach((obs) => obs.el.remove());
  obstacles = [];
}

function getStartOverlayMarkup() {
  return `
    <div class="overlay-card">
      <h2>공룡게임 실험</h2>
      <p>스페이스바 또는 ↑ 키로 점프해서 장애물을 피하세요.</p>
      <p>플레이 중 상단 알림이 뜨면 <strong>즉시 처리 / 나중에 보기 / 무시</strong> 중 하나를 선택하세요.</p>
      <button id="startGameBtn">게임 시작</button>
    </div>
  `;
}

function bindOverlayStartButton() {
  const overlayStartBtn = document.getElementById('startGameBtn');
  if (overlayStartBtn) {
    overlayStartBtn.addEventListener('click', startGame);
  }
}

function startGame() {
  gameRunning = true;
  gameOver = false;
  lastTime = 0;
  spawnTimer = 0;
  dinoState.y = 0;
  dinoState.velocityY = 0;
  dinoState.jumping = false;
  dino.classList.add('running');
  renderDino();
  gameOverlay.style.display = 'none';
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  cancelAnimationFrame(animationId);
  dino.classList.remove('running');
  gameOverlay.style.display = 'flex';
  gameOverlay.innerHTML = `
    <div class="overlay-card">
      <h2>게임 오버</h2>
      <p>이번 점수는 <strong>${score}</strong>점입니다.</p>
      <p>알림에 대응하면서 게임을 계속 유지하는지 관찰할 수 있습니다.</p>
      <button id="restartOverlayBtn">다시 시작</button>
    </div>
  `;

  document.getElementById('restartOverlayBtn').addEventListener('click', restartGame);
}

function restartGame() {
  clearObstacles();
  score = 0;
  updateScoreView();
  startGame();
}

function showNotification(urgency, message) {
  if (currentNotification) return;

  const participantId = participantIdInput.value.trim() || '미입력';
  const shownAt = Date.now();

  currentNotification = {
    participantId,
    urgency,
    urgencyLabel: urgencyMap[urgency],
    message,
    shownAt,
    isoTime: new Date().toLocaleString('ko-KR'),
  };

  notificationBar.className = `notification-bar ${urgency}`;
  notificationTitle.textContent = titleMap[urgency];
  notificationText.textContent = message;
}

function respondToNotification(response) {
  if (!currentNotification) return;

  const reactionTime = Date.now() - currentNotification.shownAt;
  const log = {
    participantId: currentNotification.participantId,
    urgency: currentNotification.urgencyLabel,
    message: currentNotification.message,
    response,
    reactionTime,
    time: currentNotification.isoTime,
  };

  logs.unshift(log);
  currentNotification = null;
  notificationBar.className = 'notification-bar';
  updateTable();
  updateSummary();
}

function updateTable() {
  logTableBody.innerHTML = '';

  logs.forEach((log, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${logs.length - index}</td>
      <td>${log.participantId}</td>
      <td>${log.urgency}</td>
      <td>${log.message}</td>
      <td>${log.response}</td>
      <td>${log.reactionTime}</td>
      <td>${log.time}</td>
    `;
    logTableBody.appendChild(tr);
  });
}

function updateSummary() {
  totalCountEl.textContent = logs.length;

  const avg = logs.length
    ? Math.round(logs.reduce((acc, cur) => acc + cur.reactionTime, 0) / logs.length)
    : 0;

  avgTimeEl.textContent = avg;

  const nowCount = logs.filter((log) => log.response === '즉시 처리').length;
  const laterIgnoreCount = logs.filter((log) => log.response !== '즉시 처리').length;

  nowCountEl.textContent = nowCount;
  laterIgnoreCountEl.textContent = laterIgnoreCount;
}

function resetGameState() {
  cancelAnimationFrame(animationId);
  clearObstacles();
  score = 0;
  gameRunning = false;
  gameOver = false;
  lastTime = 0;
  spawnTimer = 0;
  dinoState.y = 0;
  dinoState.velocityY = 0;
  dinoState.jumping = false;
  dino.classList.remove('jumping');
  dino.classList.remove('running');
  renderDino();
  updateScoreView();
  gameOverlay.style.display = 'flex';
  gameOverlay.innerHTML = getStartOverlayMarkup();
  bindOverlayStartButton();
}

function resetAll() {
  logs = [];
  currentNotification = null;
  notificationBar.className = 'notification-bar';
  clearInterval(autoExperimentTimer);
  resetGameState();
  updateTable();
  updateSummary();
}

function downloadCSV() {
  if (!logs.length) {
    alert('다운로드할 기록이 없습니다.');
    return;
  }

  const headers = ['participantId', 'urgency', 'message', 'response', 'reactionTime', 'time'];
  const rows = logs.map((log) => [
    log.participantId,
    log.urgency,
    log.message,
    log.response,
    log.reactionTime,
    log.time,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hci_notification_experiment_log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function startAutoExperiment() {
  clearInterval(autoExperimentTimer);

  const scenarios = [
    { urgency: 'low', message: '동아리 공지사항이 새로 올라왔습니다.' },
    { urgency: 'medium', message: '팀플 회의가 10분 뒤 시작됩니다.' },
    { urgency: 'high', message: '오늘 제출 과제가 5분 뒤 마감됩니다.' },
    { urgency: 'low', message: '친구가 보낸 메시지가 도착했습니다.' },
    { urgency: 'medium', message: '내일 시험 범위를 아직 확인하지 않았습니다.' },
    { urgency: 'high', message: '수강신청 정정 마감이 곧 종료됩니다.' },
  ];

  let idx = 0;
  autoExperimentTimer = setInterval(() => {
    if (!currentNotification) {
      const scenario = scenarios[idx % scenarios.length];
      showNotification(scenario.urgency, scenario.message);
      idx += 1;
    }
  }, 8000);

  alert('자동 실험이 시작되었습니다. 8초마다 새 알림이 나타납니다.');
}

document.querySelectorAll('.action-btn').forEach((btn) => {
  btn.addEventListener('click', () => respondToNotification(btn.dataset.response));
});

document.getElementById('showManualBtn').addEventListener('click', () => {
  showNotification(urgencySelect.value, taskSelect.value);
});

document.getElementById('startAutoBtn').addEventListener('click', startAutoExperiment);
document.getElementById('restartGameBtn').addEventListener('click', restartGame);
document.getElementById('resetBtn').addEventListener('click', resetAll);
document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

window.addEventListener('resize', renderDino);

bindOverlayStartButton();
renderDino();
updateSummary();
updateScoreView();
