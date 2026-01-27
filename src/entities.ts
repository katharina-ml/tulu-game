import type { CharacterConfig, ItemTypeConfig } from './config.ts';
import { getCachedImage } from './assets';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GameStateType = 'character-select' | 'playing' | 'game-over';

export interface Player extends Rect {
  speed: number;
  color: string;
  character: CharacterConfig;
}

export interface FallingItem extends Rect {
  vy: number;
  type: ItemTypeConfig;
}

export interface GameState {
  type: GameStateType;
  player: Player | null;
  selectedCharacterIndex: number;
  score: number;
  lives: number;
  elapsedTime: number;
  spawnAccumulator: number;
  items: FallingItem[];
}

export function createPlayer(character: CharacterConfig, canvasWidth: number, canvasHeight: number): Player {
  // Size of the player character in world units.
  const width = 70;
  const height = 120;
  return {
    x: canvasWidth / 2 - width / 2,
    y: canvasHeight - height - 4,
    width,
    height,
    speed: 250,
    color: character.color,
    character,
  };
}

export function createFallingItem(type: ItemTypeConfig, canvasWidth: number): FallingItem {
  const width = type.width ?? 12;
  const height = type.height ?? 12;
  const x = Math.random() * (canvasWidth - width);
  return {
    x,
    y: -height,
    width,
    height,
    vy: type.baseFallSpeed,
    type,
  };
}

export function aabbIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const { character } = player;
  const { img } = getCachedImage(character.spritePath);
  if (img) {
    ctx.drawImage(img, player.x, player.y, player.width, player.height);
  } else {
    // Fallback rectangle if sprite is missing.
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(player.x + 0.5, player.y + 0.5, player.width - 1, player.height - 1);
  }
}

export function drawFallingItem(ctx: CanvasRenderingContext2D, item: FallingItem): void {
  const { img } = getCachedImage(item.type.spritePath);
  if (img) {
    ctx.drawImage(img, item.x, item.y, item.width, item.height);
  } else {
    // Fallback rectangle if sprite is missing.
    ctx.fillStyle = '#f6e05e';
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(item.x + 0.5, item.y + 0.5, item.width - 1, item.height - 1);
  }
}

