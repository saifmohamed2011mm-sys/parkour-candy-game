const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const coinsText = document.getElementById('coinsText');
const speedText = document.getElementById('speedText');
const goalText = document.getElementById('goalText');
const levelText = document.getElementById('levelText');
const speedFill = document.getElementById('speedFill');

const menu = document.getElementById('menu');
const gameWrap = document.getElementById('gameWrap');
const settingsModal = document.getElementById('settingsModal');
const startBtn = document.getElementById('startBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');

const soundToggle = document.getElementById('soundToggle');
const difficultySelect = document.getElementById('difficultySelect');

const levelGoals = [10, 25, 50, 100, 250];
const stageRewards = [10, 25, 60, 150, 300];
const upgradeCosts = [10, 25, 60, 150, 300];
const upgradeBonus = [1, 2, 3, 4, 6];

const game = {
  started: false,
  running: false,
  coins: 0,
  totalSteps: 0,
  baseSpeed: 1,
  speed: 1,
  level: 1,
  timer: 0,
  lastTime: 0,
  difficulty: 'normal',
  sound: true,
  obstacles: [],
  candies: [],
  particles: [],
  upgradeLevels: Array(5).fill(0),
  over: false,
};

const player = {
  x: 90,
  y: 0,
  w: 36,
  h: 48,
  vy: 0,
  onGround: true,
  color: '#ff7a5c',
  invincible: 0,
};

const input = {
  left: false,
  right: false,
  jump: false,
};

const groundY = canvas.height - 62;

function resetPlayer() {
  player.x = 90;
  player.y = groundY - player.h;
  player.vy = 0;
  player.onGround = true;
  player.invincible = 0;
}

function resetGame() {
  game.started = false;
  game.running = false;
  game.coins = 0;
  game.totalSteps = 0;
  game.baseSpeed = 1;
  game.speed = 1;
  game.level = 1;
  game.timer = 0;
  game.lastTime = 0;
  game.over = false;
  game.obstacles = [];
  game.candies = [];
  game.particles = [];
  resetPlayer();
  updateHud();
}

function updateHud() {
  const currentGoal = levelGoals[Math.min(game.level - 1, levelGoals.length - 1)];
  const progress = Math.min((game.speed / currentGoal) * 100, 100);
  coinsText.textContent = game.coins;
  speedText.textContent = game.speed;
  goalText.textContent = currentGoal;
  levelText.textContent = game.level;
  speedFill.style.width = `${progress}%`;
}

function startGame() {
  resetGame();
  game.started = true;
  game.running = true;
  menu.classList.remove('active');
  gameWrap.classList.remove('hidden');
  requestAnimationFrame(loop);
}

function openSettings() {
  settingsModal.classList.remove('hidden');
}

function closeSettingsPanel() {
  settingsModal.classList.add('hidden');
  game.sound = soundToggle.checked;
  game.difficulty = difficultySelect.value;
}

function jump() {
  if (player.onGround) {
    player.vy = -15.5;
    player.onGround = false;
  }
}

function createObstacle() {
  const difficultyFactor = game.difficulty === 'hard' ? 1.25 : game.difficulty === 'easy' ? 0.8 : 1;
  const width = 24 + Math.random() * 24;
  const height = 28 + Math.random() * 48;
  const x = canvas.width + 30;
  const y = groundY - height;
  game.obstacles.push({ x, y, w: width, h: height, color: ['#f9a66c', '#ff73a0', '#6fe7bf'][Math.floor(Math.random() * 3)] });

  if (Math.random() > 0.45) {
    game.candies.push({
      x: x + width + 10 + Math.random() * 20,
      y: y - 18 - Math.random() * 40,
      r: 10 + Math.random() * 6,
      color: ['#ffd857', '#ff8a65', '#7ae7a2', '#9ac5ff'][Math.floor(Math.random() * 4)],
      collected: false,
    });
  }

  const spawnDelay = 1200 / (game.speed * 0.7 * difficultyFactor);
  return spawnDelay;
}

let spawnTimer = 1100;

function spawnLoop(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = createObstacle();
  }
}

function addParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    game.particles.push({
      x,
      y,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      life: 30 + Math.random() * 20,
      color,
      size: 4 + Math.random() * 5,
    });
  }
}

function collectCandy() {
  for (let i = game.candies.length - 1; i >= 0; i--) {
    const candy = game.candies[i];
    const dx = Math.abs(candy.x - (player.x + player.w / 2));
    const dy = Math.abs(candy.y - (player.y + player.h / 2));
    if (dx < 24 && dy < 24) {
      candy.collected = true;
      game.coins += 3;
      addParticles(candy.x, candy.y, candy.color);
      game.candies.splice(i, 1);
    }
  }
}

function handleCollisions() {
  for (let i = game.obstacles.length - 1; i >= 0; i--) {
    const obs = game.obstacles[i];
    const a = { x: player.x, y: player.y, w: player.w, h: player.h };
    const b = { x: obs.x, y: obs.y, w: obs.w, h: obs.h };

    const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    if (overlap) {
      if (player.invincible <= 0) {
        game.coins = Math.max(0, game.coins - 5);
        player.invincible = 80;
        addParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff5a5a');
      }
      game.obstacles.splice(i, 1);
    }
  }
}

function advanceStageIfNeeded() {
  const nextGoal = levelGoals[Math.min(game.level - 1, levelGoals.length - 1)];
  if (game.speed >= nextGoal) {
    const reward = stageRewards[Math.min(game.level - 1, stageRewards.length - 1)];
    game.coins += reward;
    game.level += 1;
    if (game.level > levelGoals.length) {
      game.level = levelGoals.length + 1;
    }
    addParticles(canvas.width / 2, 120, '#ffd857');
  }
}

function updatePlayer(dt) {
  const moveSpeed = (game.difficulty === 'hard' ? 4.8 : game.difficulty === 'easy' ? 3.3 : 4) + game.speed * 0.7;

  if (input.left) player.x -= moveSpeed;
  if (input.right) player.x += moveSpeed;
  player.x = Math.max(20, Math.min(canvas.width - player.w - 20, player.x));

  player.vy += 0.65;
  player.y += player.vy;

  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.invincible > 0) player.invincible -= dt;
}

function updateWorld(dt) {
  game.timer += dt;
  game.totalSteps += dt * 0.012;
  game.baseSpeed = Math.max(1, Math.floor(game.totalSteps) + 1);
  game.speed = game.baseSpeed + getUpgradeBonus();

  for (let i = game.obstacles.length - 1; i >= 0; i--) {
    game.obstacles[i].x -= (1.8 + game.speed * 0.4) * (dt / 16.67);
    if (game.obstacles[i].x + game.obstacles[i].w < -20) {
      game.obstacles.splice(i, 1);
    }
  }

  for (let i = game.candies.length - 1; i >= 0; i--) {
    game.candies[i].x -= (2 + game.speed * 0.5) * (dt / 16.67);
    if (game.candies[i].x + game.candies[i].r < -20) {
      game.candies.splice(i, 1);
    }
  }

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.life -= dt * 0.06;
    if (p.life <= 0) {
      game.particles.splice(i, 1);
    }
  }

  collectCandy();
  handleCollisions();
  advanceStageIfNeeded();
  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#d8f1ff');
  gradient.addColorStop(0.5, '#fff4d9');
  gradient.addColorStop(1, '#efd3bb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 9; i++) {
    const cloudX = ((i * 90) + (game.timer * 0.02 * (i % 2 === 0 ? 1 : -1))) % (canvas.width + 120);
    const cloudY = 80 + (i % 3) * 50;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(cloudX, cloudY, 28, 0, Math.PI * 2);
    ctx.arc(cloudX + 25, cloudY - 8, 24, 0, Math.PI * 2);
    ctx.arc(cloudX - 25, cloudY - 6, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#a1d78e';
  ctx.fillRect(0, groundY + 28, canvas.width, canvas.height - groundY);

  for (let x = 0; x < canvas.width + 28; x += 28) {
    const offset = (x + game.timer * 0.18) % 120;
    ctx.fillStyle = '#fce680';
    ctx.fillRect(x - offset, groundY + 15, 16, 16);
    ctx.fillStyle = '#ffb3d9';
    ctx.fillRect(x + 12 - offset, groundY + 14, 10, 10);
  }
}

function drawPlayer() {
  const blink = player.invincible > 0 && Math.floor(player.invincible / 10) % 2 === 0;
  if (blink) return;

  ctx.fillStyle = '#ff7a5c';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(player.x + 6, player.y + 8, 10, 10);
  ctx.fillRect(player.x + 20, player.y + 8, 10, 10);
  ctx.fillStyle = '#2a1d1d';
  ctx.fillRect(player.x + 10, player.y + 24, 8, 8);
  ctx.fillRect(player.x + 19, player.y + 24, 8, 8);
  ctx.fillStyle = '#4f2d1d';
  ctx.fillRect(player.x + 6, player.y + 36, 24, 8);
}

function drawObstacles() {
  for (const obstacle of game.obstacles) {
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.w - 8, 8);
  }
}

function drawCandies() {
  for (const candy of game.candies) {
    ctx.fillStyle = candy.color;
    ctx.beginPath();
    ctx.arc(candy.x, candy.y, candy.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(candy.x - 2, candy.y - candy.r * 0.6, 4, candy.r * 1.2);
  }
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

function drawUpgradeBoosts() {
  const upgradeColors = ['#9a6a36', '#f2c14d', '#8be7ff', '#ff89c5', '#ff3737'];
  for (let i = 0; i < game.upgradeLevels.length; i++) {
    const x = 18 + i * 68;
    const y = canvas.height - 30;
    ctx.fillStyle = i < game.upgradeLevels.length ? upgradeColors[i] : 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, 38, 12);
  }
}

function drawHudText() {
  ctx.fillStyle = '#4a2b2a';
  ctx.font = 'bold 15px Tahoma';
  ctx.fillText(`المرحلة: ${game.level}`, 18, 30);
  ctx.fillText(`السريع: ${game.speed}`, canvas.width - 120, 30);
}

function draw() {
  drawBackground();
  drawUpgradeBoosts();
  drawObstacles();
  drawCandies();
  drawPlayer();
  drawParticles();
  drawHudText();
}

function getUpgradeBonus() {
  return game.upgradeLevels.reduce((sum, level, index) => sum + level * upgradeBonus[index], 0);
}

function buyUpgrade(index) {
  const cost = upgradeCosts[index];
  if (game.coins < cost) return;
  game.coins -= cost;
  game.upgradeLevels[index] += 1;
  updateHud();
}

function loop(timestamp) {
  if (!game.running) return;

  if (!game.lastTime) game.lastTime = timestamp;
  const dt = timestamp - game.lastTime;
  game.lastTime = timestamp;

  if (dt > 30) dt = 30;

  spawnLoop(dt);
  updateWorld(dt);
  updatePlayer(dt);
  draw();

  if (game.started) {
    requestAnimationFrame(loop);
  }
}

function onKeyDown(event) {
  const key = event.key;
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') input.left = true;
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') input.right = true;
  if (key === ' ' || key === 'ArrowUp' || key.toLowerCase() === 'w') {
    input.jump = true;
    jump();
  }
}

function onKeyUp(event) {
  const key = event.key;
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') input.left = false;
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') input.right = false;
  if (key === ' ' || key === 'ArrowUp' || key.toLowerCase() === 'w') input.jump = false;
}

startBtn.addEventListener('click', startGame);
settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', closeSettingsPanel);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

document.querySelectorAll('.control-btn').forEach((button) => {
  const key = button.dataset.key;
  button.addEventListener('pointerdown', () => {
    if (key === 'Space') jump();
    else if (key === 'ArrowLeft') input.left = true;
    else if (key === 'ArrowRight') input.right = true;
  });
  button.addEventListener('pointerup', () => {
    if (key === 'ArrowLeft') input.left = false;
    else if (key === 'ArrowRight') input.right = false;
  });
  button.addEventListener('pointerleave', () => {
    if (key === 'ArrowLeft') input.left = false;
    else if (key === 'ArrowRight') input.right = false;
  });
});

document.querySelectorAll('.upgrade-btn').forEach((button) => {
  button.addEventListener('click', () => {
    buyUpgrade(Number(button.dataset.upgrade));
  });
});

resetGame();
draw();
