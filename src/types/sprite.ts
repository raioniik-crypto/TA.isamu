/**
 * Sprite animation types for the character Phil.
 *
 * Priority order (highest first): surprised > walk > sit > blink > idle
 */

export type SpriteState = 'idle' | 'blink' | 'walk' | 'surprised' | 'sit';

/** Priority map — higher number wins when multiple states are active. */
export const SPRITE_PRIORITY: Record<SpriteState, number> = {
  idle: 0,
  blink: 1,
  sit: 2,
  walk: 3,
  surprised: 4,
};

/** Per-state FPS configuration. */
export const SPRITE_FPS: Record<SpriteState, number> = {
  idle: 0.5,
  blink: 10,
  walk: 8,
  surprised: 1,
  sit: 1,
};

/** Metadata for a single sprite frame. */
export interface SpriteFrame {
  /** Image path relative to /public, e.g. "/sprites/phil-idle-0.png" */
  src: string;
  /** Frame index within the state animation (0-based). */
  index: number;
}

/** Per-state frame count — matches actual assets in public/sprites/. */
export const SPRITE_FRAME_COUNTS: Record<SpriteState, number> = {
  idle: 3,       // default + idle-1 + idle-2
  blink: 2,      // blink-1 + blink-2
  walk: 4,       // walk-1 through walk-4
  surprised: 1,  // surprised (single frame)
  sit: 1,        // sit (single frame)
};

/**
 * Build the image path for a given state and frame index.
 *
 * Naming conventions:
 * - idle frame 0 → phil-default.webp
 * - idle frame N → phil-idle-N.webp
 * - single-frame states → phil-{state}.webp
 * - multi-frame states → phil-{state}-{1-based}.webp
 */
export function spriteSrc(state: SpriteState, frame: number): string {
  if (state === 'surprised') return '/sprites/phil-surprised.webp';
  if (state === 'sit') return '/sprites/phil-sit.webp';
  if (state === 'idle' && frame === 0) return '/sprites/phil-default.webp';
  if (state === 'idle') return `/sprites/phil-idle-${frame}.webp`;
  return `/sprites/phil-${state}-${frame + 1}.webp`;
}
