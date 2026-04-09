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
  idle: 2,
  blink: 10,
  walk: 8,
  surprised: 6,
  sit: 2,
};

/** Metadata for a single sprite frame. */
export interface SpriteFrame {
  /** Image path relative to /public, e.g. "/sprites/phil-idle-0.png" */
  src: string;
  /** Frame index within the state animation (0-based). */
  index: number;
}

/** Per-state frame count configuration (updated when assets arrive). */
export const SPRITE_FRAME_COUNTS: Record<SpriteState, number> = {
  idle: 2,
  blink: 3,
  walk: 4,
  surprised: 2,
  sit: 2,
};

/**
 * Build the image path for a given state and frame index.
 * Follows the `phil-{state}-{frame}.png` naming convention.
 */
export function spriteSrc(state: SpriteState, frame: number): string {
  return `/sprites/phil-${state}-${frame}.png`;
}
