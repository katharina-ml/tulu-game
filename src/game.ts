import { GAME_CONFIG, ITEM_TYPES, CHARACTERS, getDifficulty } from './config.ts';
import type { GameState } from './entities';
import { createPlayer, createFallingItem, aabbIntersect } from './entities';
import type { InputState } from './input';
import { createInputState, attachInputListeners } from './input';
import { render, getCharacterSlots } from './renderer';

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

export function startGame(canvas: HTMLCanvasElement): void {
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

  setupMouseForCharacterSelect(runtime);

  const loop = (time: number) => {
    if (!runtime.running) return;
    const dt = Math.min((time - runtime.lastTime) / 1000, 0.1);
    runtime.lastTime = time;

    update(runtime, dt);
    render(runtime.ctx, runtime.state);

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

function createInitialState(): GameState {
  return {
    type: 'character-select',
    player: null,
    selectedCharacterIndex: 0,
    score: 0,
    lives: GAME_CONFIG.initialLives,
    elapsedTime: 0,
    spawnAccumulator: 0,
    items: [],
  };
}

function update(runtime: GameRuntime, dt: number): void {
  const { state, input } = runtime;

  switch (state.type) {
    case 'character-select':
      updateCharacterSelect(state, input, dt);
      break;
    case 'playing':
      updatePlaying(runtime, dt);
      break;
    case 'game-over':
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
  state.type = 'playing';
  state.score = 0;
  state.lives = GAME_CONFIG.initialLives;
  state.elapsedTime = 0;
  state.spawnAccumulator = 0;
  state.items = [];
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

  // Time & difficulty
  state.elapsedTime += dt;
  const diff = getDifficulty(state.elapsedTime);
  runtime.spawnRateDebug = diff.spawnRate;

  // Spawning
  const spawnRate = diff.spawnRate;
  const spawnInterval = spawnRate > 0 ? 1 / spawnRate : Infinity;
  state.spawnAccumulator += dt;
  while (state.spawnAccumulator >= spawnInterval) {
    state.spawnAccumulator -= spawnInterval;
    const type = pickItemType(state);
    const item = createFallingItem(type, GAME_CONFIG.width);
    item.vy *= diff.speedMultiplier;
    state.items.push(item);
  }

  // Update items
  const groundY = GAME_CONFIG.height - 10;
  const remaining: typeof state.items = [];

  for (const item of state.items) {
    item.y += item.vy * dt;

    if (aabbIntersect(player, item)) {
      state.score += item.type.scoreValue;
      // TODO: optional pickup sound here later.
      continue;
    }

    if (item.y + item.height >= groundY) {
      state.lives -= 1;
      if (state.lives <= 0) {
        state.type = 'game-over';
        break;
      }
      continue;
    }

    remaining.push(item);
  }

  state.items = remaining;
}

function pickItemType(state: GameState) {
  // Wähle das Item passend zum gerade aktiven Charakter.
  const idx = state.selectedCharacterIndex;
  if (idx === 0) {
    return ITEM_TYPES[0]; // Player A → Item A
  }
  if (idx === 1 && ITEM_TYPES.length > 1) {
    return ITEM_TYPES[1]; // Player B → Item B
  }
  if (idx === 2 && ITEM_TYPES.length > 2) {
    return ITEM_TYPES[2]; // Player C → Item C
  }
  // Fallback, falls Konfiguration geändert wird.
  return ITEM_TYPES[0];
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

function setupMouseForCharacterSelect(runtime: GameRuntime): void {
  const { canvas, state } = runtime;

  const handleClick = (event: MouseEvent) => {
    if (state.type !== 'character-select') {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_CONFIG.width / rect.width;
    const scaleY = GAME_CONFIG.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const slots = getCharacterSlots(GAME_CONFIG.width, GAME_CONFIG.height);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) {
        state.selectedCharacterIndex = i;
        beginPlay(state);
        break;
      }
    }
  };

  canvas.addEventListener('click', handleClick);
}

