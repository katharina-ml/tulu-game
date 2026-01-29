// Global configuration for the catcher game.

export const GAME_CONFIG = {
  // Internal game resolution (does not have to match CSS size).
  width: 700,
  height: 500,
  backgroundColor: '#1a1b26',
  targetFPS: 60,
  initialLives: 3,
};

// Upper bound for how many items can spawn during a single frame.
export const MAX_SPAWNS_PER_FRAME = 2;

// Base probability for rare items when a non-bomb spawns.
export const RARE_ITEM_CHANCE = 0.15;

// Definition of all falling item types. You can freely change/add items here.
export interface ItemTypeConfig {
  id: string;
  spritePath: string | null; // null → always use rectangle fallback
  scoreValue: number;
  spawnWeight: number;
  width?: number;
  height?: number;
  baseFallSpeed: number;
  isHazard?: boolean;
}

// Item types: base items (A/B/C/G), rare items (D/E/F/H), plus a bomb hazard.
export const ITEM_TYPES: ItemTypeConfig[] = [
  {
    id: 'itemA',
    spritePath: '/assets/items/itemA.png',
    scoreValue: 1,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemD',
    spritePath: '/assets/items/itemD.png',
    // Rare partner item for Player C – double score.
    scoreValue: 2,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemB',
    spritePath: '/assets/items/itemB.png',
    scoreValue: 1,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemF',
    spritePath: '/assets/items/itemF.png',
    // Rare partner item for Player B – double score.
    scoreValue: 2,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemC',
    spritePath: '/assets/items/itemC.png',
    scoreValue: 1,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemE',
    spritePath: '/assets/items/itemE.png',
    // Rare partner item for Player A – double score.
    scoreValue: 2,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemG',
    spritePath: '/assets/items/itemG.png',
    // Base item for Player D.
    scoreValue: 1,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'itemH',
    spritePath: '/assets/items/itemH.png',
    // Rare partner item for Player D – double score.
    scoreValue: 2,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 80,
  },
  {
    id: 'bomb',
    spritePath: '/assets/items/bomb.png',
    scoreValue: 0,
    spawnWeight: 1,
    width: 32,
    height: 32,
    baseFallSpeed: 85,
    isHazard: true,
  },
];

// Difficulty curve over time. Time is measured in seconds since the round started.
export interface DifficultyKeyframe {
  time: number;
  spawnRate: number; // items per second
  speedMultiplier: number;
}

export const DIFFICULTY_CURVE: DifficultyKeyframe[] = [
  { time: 0, spawnRate: 0.6, speedMultiplier: 0.8 },
  { time: 30, spawnRate: 1.2, speedMultiplier: 1.0 },
  { time: 60, spawnRate: 1.8, speedMultiplier: 1.2 },
  { time: 90, spawnRate: 2.4, speedMultiplier: 1.4 },
  { time: 120, spawnRate: 3.0, speedMultiplier: 1.6 },
];

export function getDifficulty(t: number): { spawnRate: number; speedMultiplier: number } {
  if (t <= 0) {
    const first = DIFFICULTY_CURVE[0];
    return { spawnRate: first.spawnRate, speedMultiplier: first.speedMultiplier };
  }

  for (let i = 0; i < DIFFICULTY_CURVE.length - 1; i++) {
    const a = DIFFICULTY_CURVE[i];
    const b = DIFFICULTY_CURVE[i + 1];
    if (t >= a.time && t <= b.time) {
      const f = (t - a.time) / (b.time - a.time);
      return {
        spawnRate: a.spawnRate + (b.spawnRate - a.spawnRate) * f,
        speedMultiplier: a.speedMultiplier + (b.speedMultiplier - a.speedMultiplier) * f,
      };
    }
  }

  const last = DIFFICULTY_CURVE[DIFFICULTY_CURVE.length - 1];
  return { spawnRate: last.spawnRate, speedMultiplier: last.speedMultiplier };
}

// Character definitions: update names and sprite paths here.
export interface CharacterConfig {
  id: string;
  name: string;
  // Path to the player sprite. If null or failing to load, a colored rectangle is used.
  spritePath: string | null;
  // Used as fallback color and for outlines.
  color: string;
}

export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'playerA',
    name: 'Wiebke',
    spritePath: '/assets/players/playerA.png',
    color: '#4fd1c5',
  },
  {
    id: 'playerB',
    name: 'Kathi',
    spritePath: '/assets/players/playerB.png',
    color: '#fbd38d',
  },
  {
    id: 'playerC',
    name: 'Anne',
    spritePath: '/assets/players/playerC.png',
    color: '#f687b3',
  },
  {
    id: 'playerD',
    name: 'Hannah',
    spritePath: '/assets/players/playerD.png',
    color: '#9f7aea',
  },
];
