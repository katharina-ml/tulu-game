// Simple asset system that loads optional sprite images.
// If a file is missing or fails to load, the game will log a warning
// and fall back to rectangle rendering.

export type ImageAsset = HTMLImageElement;

export interface LoadedImage {
  img: ImageAsset | null;
  path: string | null;
}

const imageCache = new Map<string, LoadedImage>();

export function getCachedImage(path: string | null): LoadedImage {
  if (!path) {
    return { img: null, path: null };
  }
  const cached = imageCache.get(path);
  if (cached) return cached;

  const img = new Image();
  const record: LoadedImage = { img, path };
  imageCache.set(path, record);

  img.src = path;
  img.onload = () => {
    // Loaded successfully; nothing else to do.
  };
  img.onerror = () => {
    console.warn(`[assets] Failed to load image at "${path}". Falling back to rectangle rendering.`);
    record.img = null;
  };

  return record;
}

