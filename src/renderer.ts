import type { GameState } from './entities';
import { drawPlayer, drawFallingItem } from './entities';
import { CHARACTERS, GAME_CONFIG } from './config.ts';
import { getCachedImage } from './assets';

// Slot area for a single character in the character select screen.
interface CharacterSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getCharacterSlots(canvasWidth: number, canvasHeight: number): CharacterSlot[] {
  const slotWidth = 160;
  const slotHeight = 210;
  const gap = 16;
  const totalWidth = CHARACTERS.length * slotWidth + (CHARACTERS.length - 1) * gap;
  const startX = (canvasWidth - totalWidth) / 2;
  const centerY = canvasHeight / 2;

  const slots: CharacterSlot[] = [];
  for (let i = 0; i < CHARACTERS.length; i++) {
    const x = startX + i * (slotWidth + gap);
    const y = centerY - slotHeight / 2;
    slots.push({ x, y, width: slotWidth, height: slotHeight });
  }
  return slots;
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = GAME_CONFIG;

  // Clear canvas with base background color.
  ctx.fillStyle = GAME_CONFIG.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  switch (state.type) {
    case 'character-select':
      renderCharacterSelect(ctx, state);
      break;
    case 'playing':
      renderGameplay(ctx, state);
      break;
    case 'game-over':
      renderGameplay(ctx, state);
      renderGameOverOverlay(ctx, state);
      break;
  }
}

function renderCharacterSelect(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = GAME_CONFIG;

  // Character select background.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Centered logo instead of a text title.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const { img: logoImg } = getCachedImage('/assets/Logo/logo.svg');

  if (logoImg) {
    const logoMaxWidth = 220;
    const logoMaxHeight = 80;
    const iw = logoImg.naturalWidth;
    const ih = logoImg.naturalHeight;
    const scale = Math.min(logoMaxWidth / iw, logoMaxHeight / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const x = width / 2 - drawW / 2;
    const y = 40;

    ctx.drawImage(logoImg, x, y, drawW, drawH);
  } else {
    // Fallback: simple text if the logo cannot be loaded.
    ctx.fillStyle = '#000000';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('studio tülü', width / 2, 50);
  }

  ctx.font = '18px PPMori, system-ui, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('Choose your character', width / 2, 100);

  const slots = getCharacterSlots(width, height);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const char = CHARACTERS[i];
    const isSelected = i === state.selectedCharacterIndex;

    // Slot background.
    ctx.fillStyle = '#D7EAFF';
    ctx.fillRect(slot.x, slot.y, slot.width, slot.height);

    if (isSelected) {
      ctx.strokeStyle = '#FF825A';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#C9E3FF';
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(slot.x + 0.5, slot.y + 0.5, slot.width - 1, slot.height - 1);

    // Avatar in slot: draw sprite while keeping aspect ratio.
    const maxAvatarWidth = slot.width - 16;
    const maxAvatarHeight = slot.height - 40;
    const { img } = getCachedImage(char.spritePath);

    if (img) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.min(maxAvatarWidth / iw, maxAvatarHeight / ih);
      const drawW = iw * scale;
      const drawH = ih * scale;

      const ax = slot.x + slot.width / 2 - drawW / 2;
      const ay = slot.y + 10;

      ctx.drawImage(img, ax, ay, drawW, drawH);
    } else {
      // Fallback: simple colored square.
      const avatarSize = 72;
      const ax = slot.x + slot.width / 2 - avatarSize / 2;
      const ay = slot.y + 10;
      ctx.fillStyle = char.color;
      ctx.fillRect(ax, ay, avatarSize, avatarSize);
    }

    ctx.fillStyle = '#000000';
    ctx.font = '16px PPMori, system-ui, sans-serif';
    ctx.fillText(char.name, slot.x + slot.width / 2, slot.y + slot.height - 24);
  }

  ctx.font = '14px PPMori, system-ui, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('← / → or A / D to select • Enter/Click to start', width / 2, height - 24);
}

function renderGameplay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = GAME_CONFIG;

  // Gameplay background.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#C9E3FF';
  ctx.fillRect(0, height - 10, width, 10);

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

function renderGameOverOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = GAME_CONFIG;

  ctx.fillStyle = '#C9E3FF';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '40px PPMori, system-ui, sans-serif';
  ctx.fillStyle = '#FC411D';
  ctx.fillText('Game Over', width / 2, height / 2 - 40);

  ctx.font = '20px PPMori, system-ui, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(`Final Score: ${state.score}`, width / 2, height / 2);

  ctx.font = '14px PPMori, system-ui, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('Press R to Restart', width / 2, height / 2 + 30);
  ctx.fillText('Press Esc/Backspace for Character Select', width / 2, height / 2 + 52);
}

