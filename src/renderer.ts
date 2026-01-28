import type { GameState } from './entities';
import { drawPlayer, drawFallingItem } from './entities';
import { GAME_CONFIG } from './config.ts';

// Leftover helper signature so existing imports compile;
// canvas-based character select now uses HTML instead, so this is unused.
export interface CharacterSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getCharacterSlots(_canvasWidth: number, _canvasHeight: number): CharacterSlot[] {
  return [];
}

// Main render entry: only draws gameplay (no UI screens).
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = GAME_CONFIG;

  // Clear canvas with base background color.
  ctx.fillStyle = GAME_CONFIG.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Only render the playfield while the game is running or on the final frame
  // of game over. Start- and character-select-screens are HTML overlays.
  if (state.screen === 'playing' || state.screen === 'gameOver') {
    renderGameplay(ctx, state);
  }
}

function renderGameplay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = GAME_CONFIG;

  // Gameplay background.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#C9E3FF';
  ctx.fillRect(0, height - 10, width, 10);

  // Draw miss effects behind items.
  for (const fx of state.missEffects) {
    const t = Math.max(0, fx.timer) / fx.maxTimer;
    const radius = fx.radius * (0.9 + 0.3 * (1 - t));
    ctx.save();
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(252, 65, 29, ${t})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  for (const item of state.items) {
    drawFallingItem(ctx, item);
  }

  if (state.player) {
    drawPlayer(ctx, state.player);
  }

  renderHud(ctx, state);
}

function renderHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width } = GAME_CONFIG;

  ctx.font = '18px PPMori, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';

  const timeSeconds = Math.floor(state.elapsedTime);
  const level = Math.floor(state.elapsedTime / 30) + 1;

  ctx.fillText(`Score: ${state.score}`, 16, 18);
  ctx.fillText(`Lives: ${state.lives}`, 16, 44);

  ctx.textAlign = 'center';
  ctx.fillText(`Time: ${timeSeconds}s`, width / 2, 18);
  ctx.fillText(`Level: ${level}`, width / 2, 44);
}

