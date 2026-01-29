import { GAME_CONFIG, ITEM_TYPES, CHARACTERS, getDifficulty, MAX_SPAWNS_PER_FRAME, RARE_ITEM_CHANCE } from './config.ts';
import type { GameState, GameScreen } from './entities';
import { createPlayer, createFallingItem, aabbIntersect } from './entities';
import type { InputState } from './input';
import { createInputState, attachInputListeners } from './input';
import { render } from './renderer';

interface GameRuntime {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: GameState;
  input: InputState;
  detachInput: () => void;
  lastTime: number;
  running: boolean;
  spawnRateDebug: number;
}

export function startGame(canvas: HTMLCanvasElement, uiRoot: HTMLElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2D context');
    return;
  }

  canvas.width = GAME_CONFIG.width;
  canvas.height = GAME_CONFIG.height;

  const input = createInputState();
  const detachInput = attachInputListeners(input);

  const runtime: GameRuntime = {
    canvas,
    ctx,
    input,
    detachInput,
    state: createInitialState(),
    lastTime: performance.now(),
    running: true,
    spawnRateDebug: 0,
  };

  const uiController = initUI(uiRoot, {
    onStart: () => setScreen(runtime, 'characterSelect'),
    onSelectCharacter: (index) => selectCharacter(runtime.state, index),
    onStartGame: () => beginPlay(runtime.state),
    onRestart: () => beginPlay(runtime.state),
    onBackToCharacterSelect: () => setScreen(runtime, 'characterSelect'),
  });

  const loop = (time: number) => {
    if (!runtime.running) return;
    const dt = Math.min((time - runtime.lastTime) / 1000, 0.1);
    runtime.lastTime = time;

    update(runtime, dt);
    uiController.update(runtime.state);
    render(runtime.ctx, runtime.state);

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

function createInitialState(): GameState {
  return {
    screen: 'start',
    player: null,
    selectedCharacterIndex: 0,
    score: 0,
    lives: GAME_CONFIG.initialLives,
    elapsedTime: 0,
    spawnAccumulator: 0,
    items: [],
    missEffects: [],
    lastBombTime: -Infinity,
    lastSpawnX: GAME_CONFIG.width / 2,
  };
}

function update(runtime: GameRuntime, dt: number): void {
  const { state, input } = runtime;

  switch (state.screen) {
    case 'start':
      // Start screen is driven entirely by HTML; nothing to update here yet.
      break;
    case 'characterSelect':
      updateCharacterSelect(state, input, dt);
      break;
    case 'playing':
      updatePlaying(runtime, dt);
      break;
    case 'gameOver':
      updateGameOver(state, input);
      break;
  }
}

function updateCharacterSelect(state: GameState, input: InputState, _dt: number): void {
  if (input.left) {
    state.selectedCharacterIndex = (state.selectedCharacterIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
    input.left = false; // prevent very fast cycling
  }
  if (input.right) {
    state.selectedCharacterIndex = (state.selectedCharacterIndex + 1) % CHARACTERS.length;
    input.right = false;
  }

  if (input.confirm) {
    beginPlay(state);
    input.confirm = false;
  }
}

function beginPlay(state: GameState): void {
  const character = CHARACTERS[state.selectedCharacterIndex];
  state.player = createPlayer(character, GAME_CONFIG.width, GAME_CONFIG.height);
  state.screen = 'playing';
  state.score = 0;
  state.lives = GAME_CONFIG.initialLives;
  state.elapsedTime = 0;
  state.spawnAccumulator = 0;
  state.items = [];
  // Clear any leftover visual effects from the previous round.
  state.missEffects = [];
  state.lastBombTime = -Infinity;
  state.lastSpawnX = GAME_CONFIG.width / 2;
}

function updatePlaying(runtime: GameRuntime, dt: number): void {
  const { state, input } = runtime;
  const player = state.player;
  if (!player) return;

  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  player.x += dir * player.speed * dt;
  player.x = Math.max(0, Math.min(GAME_CONFIG.width - player.width, player.x));

  state.elapsedTime += dt;
  const diff = getDifficulty(state.elapsedTime);
  runtime.spawnRateDebug = diff.spawnRate;

  const spawnRate = diff.spawnRate;
  const spawnInterval = spawnRate > 0 ? 1 / spawnRate : Infinity;
  state.spawnAccumulator += dt;
  let spawnsThisFrame = 0;
  while (state.spawnAccumulator >= spawnInterval && spawnsThisFrame < MAX_SPAWNS_PER_FRAME) {
    state.spawnAccumulator -= spawnInterval;
    const type = pickItemType(state);
    const item = createFallingItem(type, GAME_CONFIG.width, state.lastSpawnX);
    item.vy *= diff.speedMultiplier;
    state.items.push(item);
    spawnsThisFrame += 1;
    state.lastSpawnX = item.x;
  }

  const groundY = GAME_CONFIG.height - 10;
  const remaining: typeof state.items = [];

  for (const item of state.items) {
    item.y += item.vy * dt;

    // Collision with player.
    if (aabbIntersect(player, item)) {
      if (item.type.isHazard) {
        // Catching a bomb ends the game immediately.
        state.lives = 0;
        state.screen = 'gameOver';
        break;
      } else {
        state.score += item.type.scoreValue;
        // TODO: optional pickup sound here later.
        continue;
      }
    }

    // Item reached the ground.
    if (item.y + item.height >= groundY) {
      if (!item.type.isHazard) {
        // Only normal items cost a life when missed.
        state.lives -= 1;
        state.missEffects.push({
          x: item.x + item.width / 2,
          y: groundY - 5,
          radius: Math.max(item.width, item.height) * 0.6,
          timer: 0.3,
          maxTimer: 0.3,
        });
        if (state.lives <= 0) {
          state.screen = 'gameOver';
          break;
        }
      }
      continue;
    }

    remaining.push(item);
  }

  state.items = remaining;
  // Update and expire miss effects.
  state.missEffects = state.missEffects
    .map((fx) => ({ ...fx, timer: fx.timer - dt }))
    .filter((fx) => fx.timer > 0);
}

function pickItemType(state: GameState) {
  const idx = state.selectedCharacterIndex;
  // Base/rare items per character:
  // Player A → base: itemA, rare: itemE
  // Player B → base: itemB, rare: itemF
  // Player C → base: itemC, rare: itemD
  // Player D → base: itemG, rare: itemH
  let baseId = 'itemA';
  let rareId: string | null = 'itemE';
  if (idx === 1) {
    baseId = 'itemB';
    rareId = 'itemF';
  } else if (idx === 2) {
    baseId = 'itemC';
    rareId = 'itemD';
  } else if (idx === 3) {
    baseId = 'itemG';
    rareId = 'itemH';
  }

  const base = ITEM_TYPES.find((t) => t.id === baseId) ?? ITEM_TYPES[0];
  const rare = rareId ? ITEM_TYPES.find((t) => t.id === rareId) ?? null : null;

  // Decide bomb first, with time-based chance and cooldown.
  const bomb = ITEM_TYPES.find((t) => t.id === 'bomb' && t.isHazard);
  let bombChance = 0;
  const t = state.elapsedTime;
  const bombCooldown = 1.2; // seconds

  if (bomb && t >= 5) {
    // Smooth ramp from ~3% at 5s up to 9% over 45 seconds.
    const ramp = Math.min(1, (t - 5) / 45);
    bombChance = 0.03 + ramp * (0.09 - 0.03);
    bombChance = Math.min(0.09, Math.max(0, bombChance));

    // Enforce cooldown between bomb spawns.
    if (t - state.lastBombTime < bombCooldown) {
      bombChance = 0;
    }
  }

  if (bombChance > 0 && Math.random() < bombChance) {
    state.lastBombTime = t;
    return bomb!;
  }

  // Independent rare item roll.
  if (rare && Math.random() < RARE_ITEM_CHANCE) {
    return rare;
  }

  return base;
}

function updateGameOver(state: GameState, input: InputState): void {
  if (input.restart) {
    beginPlay(state);
    input.restart = false;
  } else if (input.back) {
    const idx = state.selectedCharacterIndex;
    Object.assign(state, createInitialState());
    state.selectedCharacterIndex = idx;
    input.back = false;
  }
}

type UiActions = {
  onStart: () => void;
  onSelectCharacter: (index: number) => void;
  onStartGame: () => void;
  onRestart: () => void;
  onBackToCharacterSelect: () => void;
};

interface UiController {
  update: (state: GameState) => void;
}

function initUI(root: HTMLElement, actions: UiActions): UiController {
  const container = root.closest('#game-container') ?? root;

  const uiLayer = document.createElement('div');
  uiLayer.id = 'ui-layer';
  container.appendChild(uiLayer);

  uiLayer.innerHTML = `
    <div class="screen start-screen">
      <div class="panel">
      <div class="panel-content">
        <img src="/assets/Logo/logo.svg" alt="studio tülü logo" class="logo" />
        <div class="button-wrapper"">
        <button type="button" class="btn circle" data-action="start" aria-label="Choose your fighter">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M13.904 6.736L8.912 11.744L7.568 10.624L11.456 6.736H0V4.992H11.472L7.584 1.12L8.912 0L13.904 4.992V6.736Z" fill="white"/>
          </svg>
        </button>
        <button type="button" class="button-text" data-action="start" aria-label="Choose your character">Choose your character</button>
        </div>
        </div>
        <a href="https://www.studiotulu.com" target="_blank" class="link">www.studiotulu.com</a>
      </div>
    </div>
    <div class="screen character-select-screen">
      <div class="panel">
      <img src="/assets/Logo/logo.svg" alt="studio tülü logo" class="logo" />
      <div class="panel-content">
        <h2 class="title">Choose your character</h2>
        <div class="character-grid"></div>
        <div class="button-wrapper"">
        <button type="button" class="btn circle" data-action="start-game" aria-label="Start game">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M13.904 6.736L8.912 11.744L7.568 10.624L11.456 6.736H0V4.992H11.472L7.584 1.12L8.912 0L13.904 4.992V6.736Z" fill="white"/>
          </svg>
        </button>
        <button type="button" class="button-text" data-action="start-game" aria-label="Start game">Start game</button>
        </div>
        </div>
        <p class="instructions">Press ←/→ or A/D to move・Enter/Click to start</p>
        <a href="https://www.studiotulu.com" target="_blank" class="link">www.studiotulu.com</a>
      </div>
    </div>
    <div class="screen gameover-screen">
      <div class="panel">
      <img src="/assets/Logo/logo.svg" alt="studio tülü logo" class="logo" />
      <div class="panel-content">
        <h2 class="title red">Game Over</h2>
        <p class="final-score">Score: <span data-score>0</span></p>
        </div>
        <div class="button-row">
            <div class="button-wrapper">
            <button type="button" class="btn circle" data-action="restart" aria-label="Restart">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                <path d="M13.904 6.736L8.912 11.744L7.568 10.624L11.456 6.736H0V4.992H11.472L7.584 1.12L8.912 0L13.904 4.992V6.736Z" fill="white"/>
              </svg>
            </button>
            <button type="button" class="button-text" data-action="restart" aria-label="Restart">Restart</button>
            </div>
            <div class="button-wrapper">
            <button type="button" class="btn circle" data-action="back" aria-label="Character Select">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                <path d="M13.904 6.736L8.912 11.744L7.568 10.624L11.456 6.736H0V4.992H11.472L7.584 1.12L8.912 0L13.904 4.992V6.736Z" fill="white"/>
              </svg>
            </button>
            <button type="button" class="button-text" data-action="back" aria-label="Character Select">Character Select</button>
            </div>
            <a href="https://www.studiotulu.com" target="_blank" class="link">www.studiotulu.com</a>
        </div>
      </div>
    </div>
  `;

  const startScreen = uiLayer.querySelector<HTMLDivElement>('.start-screen')!;
  const charScreen = uiLayer.querySelector<HTMLDivElement>('.character-select-screen')!;
  const gameOverScreen = uiLayer.querySelector<HTMLDivElement>('.gameover-screen')!;
  const scoreSpan = uiLayer.querySelector<HTMLSpanElement>('[data-score]')!;
  const characterGrid = uiLayer.querySelector<HTMLDivElement>('.character-grid')!;

  // Build character cards.
  CHARACTERS.forEach((char, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'character-card';
    card.dataset.index = String(index);
    const img = document.createElement('img');
    img.src = char.spritePath ?? '';
    img.alt = char.name;
    img.className = 'character-avatar';
    const label = document.createElement('span');
    label.className = 'character-name';
    label.textContent = char.name;
    card.appendChild(img);
    card.appendChild(label);
    characterGrid.appendChild(card);
  });

  // Button actions.
  uiLayer.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.matches('[data-action="start"]')) {
      actions.onStart();
      return;
    }
    if (target.matches('[data-action="start-game"]')) {
      actions.onStartGame();
      return;
    }
    if (target.matches('[data-action="restart"]')) {
      actions.onRestart();
      return;
    }
    if (target.matches('[data-action="back"]')) {
      actions.onBackToCharacterSelect();
      return;
    }
    const card = target.closest<HTMLButtonElement>('.character-card');
    if (card && card.dataset.index) {
      const index = Number(card.dataset.index);
      actions.onSelectCharacter(index);
    }
  });

  const controller: UiController = {
    update(state: GameState) {
      // Update score on game over.
      scoreSpan.textContent = String(state.score);

      const screen = state.screen;
      startScreen.style.display = screen === 'start' ? 'flex' : 'none';
      charScreen.style.display = screen === 'characterSelect' ? 'flex' : 'none';
      gameOverScreen.style.display = screen === 'gameOver' ? 'flex' : 'none';

      // Pointer events: enabled when UI is visible, disabled during gameplay.
      const anyUiVisible = screen === 'start' || screen === 'characterSelect' || screen === 'gameOver';
      uiLayer.style.pointerEvents = anyUiVisible ? 'auto' : 'none';
    },
  };

  return controller;
}

function setScreen(runtime: GameRuntime | GameState, screen: GameScreen): void {
  if ('state' in runtime) {
    runtime.state.screen = screen;
  } else {
    runtime.screen = screen;
  }
}

function selectCharacter(state: GameState, index: number): void {
  if (index >= 0 && index < CHARACTERS.length) {
    state.selectedCharacterIndex = index;
  }
}
