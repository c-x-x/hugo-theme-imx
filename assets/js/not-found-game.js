import { htmlElement } from "./core/dom.js";

export function initNotFoundGame() {
  const game = document.querySelector('[data-404-game]');

  if (!game) {
    return;
  }

  const canvas = game.querySelector('[data-404-canvas]');
  const scoreElement = game.querySelector('[data-404-score]');
  const livesElement = game.querySelector('[data-404-lives]');
  const startButton = game.querySelector('[data-404-start]');
  const resetButton = game.querySelector('[data-404-reset]');

  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
  const gameState = {
    frame: 0,
    running: false,
    score: 0,
    lives: 3,
    items: [],
    width: 720,
    height: 420,
    playerX: 360,
    targetX: 360,
    leftPressed: false,
    rightPressed: false,
    lastTime: 0,
    spawnTimer: 0,
    message: '点击开始，接住雪花'
  };

  let palette = getGamePalette();

  function getGamePalette() {
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';

    return isDark
      ? {
          grid: 'rgba(238, 234, 227, 0.055)',
          snow: 'rgba(238, 234, 227, 0.96)',
          snowCore: 'rgba(238, 234, 227, 0.72)',
          shard: 'rgba(255, 255, 255, 0.32)',
          player: 'rgba(238, 234, 227, 0.94)',
          playerText: '#171716',
          text: 'rgba(238, 234, 227, 0.9)',
          muted: 'rgba(238, 234, 227, 0.46)'
        }
      : {
          grid: 'rgba(122, 90, 50, 0.075)',
          snow: 'rgba(15, 23, 42, 0.88)',
          snowCore: 'rgba(122, 90, 50, 0.42)',
          shard: 'rgba(15, 23, 42, 0.38)',
          player: 'rgba(5, 5, 5, 0.94)',
          playerText: '#ffffff',
          text: 'rgba(36, 33, 29, 0.92)',
          muted: 'rgba(95, 88, 80, 0.56)'
        };
  }

  function updateStats() {
    if (scoreElement) {
      scoreElement.textContent = String(gameState.score);
    }

    if (livesElement) {
      livesElement.textContent = String(Math.max(gameState.lives, 0));
    }
  }

  function setStartButtonLabel() {
    if (startButton) {
      startButton.textContent = gameState.running ? '进行中' : '开始';
    }
  }

  function resizeGameCanvas() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(280, Math.round(rect.width || canvas.clientWidth || 720));
    const nextHeight = Math.max(230, Math.round(rect.height || canvas.clientHeight || 420));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    gameState.width = nextWidth;
    gameState.height = nextHeight;
    canvas.width = Math.round(nextWidth * ratio);
    canvas.height = Math.round(nextHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    gameState.playerX = clampNumber(gameState.playerX, 48, nextWidth - 48);
    gameState.targetX = clampNumber(gameState.targetX, 48, nextWidth - 48);
    drawGame();
  }

  function drawRoundedRect(x, y, width, height, radius) {
    const nextRadius = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + nextRadius, y);
    context.lineTo(x + width - nextRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
    context.lineTo(x + width, y + height - nextRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
    context.lineTo(x + nextRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
    context.lineTo(x, y + nextRadius);
    context.quadraticCurveTo(x, y, x + nextRadius, y);
    context.closePath();
  }

  function drawSnowflake(item) {
    const armLength = item.size;

    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rotation);
    context.strokeStyle = palette.snow;
    context.fillStyle = palette.snowCore;
    context.lineWidth = Math.max(1.4, item.size * 0.12);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let arm = 0; arm < 6; arm += 1) {
      context.rotate(Math.PI / 3);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(0, -armLength);
      context.moveTo(0, -armLength * 0.58);
      context.lineTo(-armLength * 0.28, -armLength * 0.82);
      context.moveTo(0, -armLength * 0.58);
      context.lineTo(armLength * 0.28, -armLength * 0.82);
      context.stroke();
    }

    context.beginPath();
    context.arc(0, 0, Math.max(2.4, item.size * 0.16), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawShard(item) {
    const size = item.size * 0.75;

    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rotation);
    context.strokeStyle = palette.shard;
    context.lineWidth = Math.max(2, item.size * 0.14);
    context.lineCap = 'round';

    context.beginPath();
    context.moveTo(-size, -size * 0.2);
    context.lineTo(size, size * 0.18);
    context.moveTo(-size * 0.35, -size);
    context.lineTo(size * 0.28, size);
    context.stroke();
    context.restore();
  }

  function drawBackground() {
    const spacing = Math.max(34, Math.min(58, gameState.width / 12));

    context.clearRect(0, 0, gameState.width, gameState.height);
    context.save();
    context.strokeStyle = palette.grid;
    context.lineWidth = 1;

    for (let x = spacing; x < gameState.width; x += spacing) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, gameState.height);
      context.stroke();
    }

    for (let y = spacing; y < gameState.height; y += spacing) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(gameState.width, y);
      context.stroke();
    }

    context.restore();
  }

  function drawPlayer() {
    const paddleWidth = Math.max(82, Math.min(126, gameState.width * 0.19));
    const paddleHeight = Math.max(13, Math.min(18, gameState.height * 0.045));
    const x = gameState.playerX - paddleWidth / 2;
    const y = gameState.height - paddleHeight - Math.max(18, gameState.height * 0.07);

    context.save();
    context.shadowBlur = 18;
    context.shadowColor = palette.player;
    context.fillStyle = palette.player;
    drawRoundedRect(x, y, paddleWidth, paddleHeight, paddleHeight / 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = palette.playerText;
    context.font = '700 11px "IMX Inter", -apple-system, BlinkMacSystemFont, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('IMX', gameState.playerX, y + paddleHeight / 2);
    context.restore();
  }

  function drawGameMessage() {
    if (gameState.running) {
      return;
    }

    context.save();
    context.fillStyle = palette.text;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '760 20px "IMX Inter", -apple-system, BlinkMacSystemFont, sans-serif';
    context.fillText(gameState.message, gameState.width / 2, gameState.height / 2 - 8);
    context.fillStyle = palette.muted;
    context.font = '600 13px "IMX Inter", -apple-system, BlinkMacSystemFont, sans-serif';
    context.fillText('雪花 +1，断片 -1', gameState.width / 2, gameState.height / 2 + 22);
    context.restore();
  }

  function drawGame() {
    drawBackground();
    gameState.items.forEach((item) => {
      if (item.type === 'snow') {
        drawSnowflake(item);
        return;
      }

      drawShard(item);
    });
    drawPlayer();
    drawGameMessage();
  }

  function spawnItem() {
    const isSnow = Math.random() > 0.22;
    const size = randomBetween(12, 22);

    gameState.items.push({
      type: isSnow ? 'snow' : 'shard',
      x: randomBetween(size + 10, gameState.width - size - 10),
      y: -size - 8,
      size,
      velocityY: randomBetween(86, 142) + Math.min(gameState.score * 1.7, 80),
      velocityX: randomBetween(-16, 16),
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-1.6, 1.6)
    });
  }

  function endGame(message) {
    gameState.running = false;
    gameState.message = message;
    window.cancelAnimationFrame(gameState.frame);
    gameState.frame = 0;
    setStartButtonLabel();
    drawGame();
  }

  function updateGame(deltaTime) {
    const paddleWidth = Math.max(82, Math.min(126, gameState.width * 0.19));
    const paddleHeight = Math.max(13, Math.min(18, gameState.height * 0.045));
    const paddleY = gameState.height - paddleHeight - Math.max(18, gameState.height * 0.07);
    const keyboardSpeed = gameState.width * 0.86;

    if (gameState.leftPressed) {
      gameState.targetX -= keyboardSpeed * deltaTime;
    }

    if (gameState.rightPressed) {
      gameState.targetX += keyboardSpeed * deltaTime;
    }

    gameState.targetX = clampNumber(gameState.targetX, paddleWidth / 2 + 8, gameState.width - paddleWidth / 2 - 8);
    gameState.playerX += (gameState.targetX - gameState.playerX) * Math.min(1, deltaTime * 14);
    gameState.spawnTimer -= deltaTime;

    if (gameState.spawnTimer <= 0) {
      spawnItem();
      gameState.spawnTimer = randomBetween(0.28, 0.54);
    }

    gameState.items = gameState.items.filter((item) => {
      item.x += item.velocityX * deltaTime;
      item.y += item.velocityY * deltaTime;
      item.rotation += item.spin * deltaTime;

      const hitPaddle =
        item.y + item.size >= paddleY &&
        item.y - item.size <= paddleY + paddleHeight &&
        Math.abs(item.x - gameState.playerX) <= paddleWidth / 2 + item.size * 0.5;

      if (hitPaddle) {
        if (item.type === 'snow') {
          gameState.score += 1;
        } else {
          gameState.lives -= 1;
        }

        updateStats();
        return false;
      }

      if (item.y > gameState.height + item.size) {
        if (item.type === 'snow') {
          gameState.lives -= 1;
          updateStats();
        }

        return false;
      }

      return item.x > -40 && item.x < gameState.width + 40;
    });

    if (gameState.lives <= 0) {
      endGame(`本局得分 ${gameState.score}`);
    }
  }

  function tickGame(time) {
    if (!gameState.running) {
      return;
    }

    if (!gameState.lastTime) {
      gameState.lastTime = time;
    }

    const deltaTime = Math.min((time - gameState.lastTime) / 1000, 0.033);
    gameState.lastTime = time;

    updateGame(deltaTime);
    drawGame();

    if (gameState.running) {
      gameState.frame = window.requestAnimationFrame(tickGame);
    }
  }

  function startGame() {
    if (gameState.running) {
      return;
    }

    gameState.running = true;
    gameState.message = '';
    gameState.lastTime = 0;
    gameState.spawnTimer = 0.15;
    canvas.focus({ preventScroll: true });
    setStartButtonLabel();
    window.cancelAnimationFrame(gameState.frame);
    gameState.frame = window.requestAnimationFrame(tickGame);
  }

  function resetGame(startAfterReset = false) {
    gameState.running = false;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.items = [];
    gameState.leftPressed = false;
    gameState.rightPressed = false;
    gameState.lastTime = 0;
    gameState.spawnTimer = 0;
    gameState.message = '点击开始，接住雪花';
    gameState.playerX = gameState.width / 2;
    gameState.targetX = gameState.width / 2;
    window.cancelAnimationFrame(gameState.frame);
    gameState.frame = 0;
    updateStats();
    setStartButtonLabel();
    drawGame();

    if (startAfterReset) {
      startGame();
    }
  }

  function moveTargetFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;

    gameState.targetX = clampNumber(pointerX, 0, gameState.width);
  }

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    moveTargetFromPointer(event);
    canvas.focus({ preventScroll: true });

    if (!gameState.running) {
      startGame();
    }
  }, { passive: true });

  canvas.addEventListener('pointermove', (event) => {
    moveTargetFromPointer(event);
  }, { passive: true });

  canvas.addEventListener('pointerup', (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    const target = event.target;

    if (target && /^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      gameState.leftPressed = true;
      event.preventDefault();
    }

    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      gameState.rightPressed = true;
      event.preventDefault();
    }

    if ((event.key === ' ' || event.key === 'Enter') && document.activeElement === canvas) {
      if (!gameState.running) {
        startGame();
      }

      event.preventDefault();
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      gameState.leftPressed = false;
    }

    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      gameState.rightPressed = false;
    }
  });

  if (startButton) {
    startButton.addEventListener('click', () => startGame());
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => resetGame(true));
  }

  window.addEventListener('resize', resizeGameCanvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(gameState.frame);
      gameState.frame = 0;
      return;
    }

    if (gameState.running) {
      gameState.lastTime = 0;
      gameState.frame = window.requestAnimationFrame(tickGame);
    }
  });

  const themeObserver = new MutationObserver(() => {
    palette = getGamePalette();
    drawGame();
  });

  themeObserver.observe(htmlElement, { attributes: true, attributeFilter: ['data-theme'] });
  resizeGameCanvas();
  resetGame(false);
}
